drop function if exists public.sf_get_archive_monitoring(text, integer);

create or replace function public.sf_get_archive_monitoring(
  p_session_token text,
  p_limit integer default null,
  p_date_from date default null,
  p_date_to date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user record;
  v_limit integer := case
    when p_limit is null or p_limit <= 0 then null
    else least(p_limit, 100000)
  end;
  v_date_from date := p_date_from;
  v_date_to date := p_date_to;
  v_rows jsonb := '[]'::jsonb;
begin
  select *
  into v_user
  from public.sf_require_site_session(p_session_token)
  limit 1;

  if v_date_from is not null and v_date_to is not null and v_date_from > v_date_to then
    select least(v_date_from, v_date_to), greatest(v_date_from, v_date_to)
    into v_date_from, v_date_to;
  end if;

  with filtered as (
    select
      a.archive_id,
      coalesce(nullif(btrim(a.object_id), ''), '') as object_id,
      coalesce(nullif(btrim(a.uin), ''), '') as uin,
      coalesce(nullif(btrim(a.object_name), ''), '') as object_name,
      coalesce(nullif(btrim(a.inspector_name), ''), '') as inspector_name,
      case when a.monitoring_date is null then '' else a.monitoring_date::text end as monitoring_date,
      coalesce(nullif(btrim(a.visit_status), ''), 'completed') as visit_status,
      coalesce(a.updated_at, a.created_at, timezone('utc', now())) as sort_at
    from public.sf_archive_monitoring a
    where (v_date_from is null or a.monitoring_date >= v_date_from)
      and (v_date_to is null or a.monitoring_date <= v_date_to)
  ),
  limited as (
    select *
    from filtered
    order by monitoring_date desc nulls last, sort_at desc nulls last, archive_id desc
    limit coalesce(v_limit, 2147483647)
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'objectId', l.object_id,
        'uin', l.uin,
        'objectName', l.object_name,
        'inspector', l.inspector_name,
        'monitoringDate', l.monitoring_date,
        'visitStatus', l.visit_status
      )
      order by l.monitoring_date desc nulls last, l.sort_at desc nulls last, l.archive_id desc
    ),
    '[]'::jsonb
  )
  into v_rows
  from limited l;

  return jsonb_build_object(
    'rows', v_rows,
    'fetchedAt', public.sf_iso_utc(now()),
    'periodFrom', coalesce(v_date_from::text, ''),
    'periodTo', coalesce(v_date_to::text, '')
  );
end;
$function$;

grant execute on function public.sf_get_archive_monitoring(text, integer, date, date) to anon, authenticated;

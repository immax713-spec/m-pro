create or replace function public.sf_get_registry_monitoring_overlay(
  p_session_token text,
  p_if_version bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user record;
  v_rows jsonb := '[]'::jsonb;
  v_version bigint := 0;
  v_updated_at timestamptz := now();
begin
  select *
  into v_user
  from public.sf_require_site_session(p_session_token)
  limit 1;

  insert into public.sf_data_state(scope, version, updated_at)
  values ('global', 1, now())
  on conflict (scope) do nothing;

  select version, updated_at
  into v_version, v_updated_at
  from public.sf_data_state
  where scope = 'global'
  limit 1;

  if p_if_version is not null and p_if_version = v_version then
    return jsonb_build_object(
      'changed', false,
      'version', v_version,
      'fetchedAt', public.sf_iso_utc(v_updated_at)
    );
  end if;

  with filtered_archive as (
    select
      a.object_id,
      a.monitoring_date,
      a.visit_status,
      a.inspector_name,
      a.ano_smg_code,
      a.checklist_url,
      a.yandex_disk_url,
      a.photos_url,
      a.created_at,
      a.updated_at,
      a.archive_id
    from public.sf_archive_monitoring a
    where nullif(btrim(a.object_id), '') is not null
      and a.lab_study_id is null
      and coalesce(nullif(btrim(a.division_code), ''), '') <> 'constructioncontrol'
      and coalesce(nullif(btrim(a.division_code), ''), '') <> 'laboratory'
  ),
  latest_success as (
    select distinct on (a.object_id)
      a.object_id,
      a.monitoring_date,
      a.inspector_name,
      a.ano_smg_code,
      a.checklist_url,
      a.yandex_disk_url,
      a.photos_url
    from filtered_archive a
    where coalesce(a.visit_status, 'completed') = 'completed'
    order by a.object_id, a.monitoring_date desc nulls last, a.created_at desc, a.updated_at desc, a.archive_id desc
  ),
  latest_denied as (
    select distinct on (a.object_id)
      a.object_id,
      a.monitoring_date,
      a.inspector_name
    from filtered_archive a
    where coalesce(a.visit_status, 'completed') = 'denied_access'
    order by a.object_id, a.monitoring_date desc nulls last, a.created_at desc, a.updated_at desc, a.archive_id desc
  ),
  latest_event as (
    select distinct on (a.object_id)
      a.object_id,
      coalesce(a.visit_status, 'completed') as visit_status,
      a.monitoring_date
    from filtered_archive a
    order by a.object_id, a.monitoring_date desc nulls last, a.created_at desc, a.updated_at desc, a.archive_id desc
  ),
  counts as (
    select
      a.object_id,
      count(*)::integer as monitoring_count
    from filtered_archive a
    group by a.object_id
  ),
  object_keys as (
    select object_id from latest_success
    union
    select object_id from latest_denied
    union
    select object_id from latest_event
    union
    select object_id from counts
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'objectId', k.object_id,
        'monitoringDate', case when s.monitoring_date is null then '' else s.monitoring_date::text end,
        'inspector', coalesce(s.inspector_name, ''),
        'anoSmgCode', coalesce(s.ano_smg_code, ''),
        'checklistUrl', coalesce(s.checklist_url, ''),
        'yandexDiskUrl', coalesce(s.yandex_disk_url, ''),
        'photosUrl', coalesce(s.photos_url, ''),
        'monitoringCount', coalesce(c.monitoring_count, 0),
        'lastDeniedAccessDate', case when d.monitoring_date is null then '' else d.monitoring_date::text end,
        'lastDeniedAccessInspector', coalesce(d.inspector_name, ''),
        'hasLaterDeniedAccess',
          case
            when d.monitoring_date is null then false
            when s.monitoring_date is null then coalesce(e.visit_status, '') = 'denied_access'
            else d.monitoring_date > s.monitoring_date
              or (
                d.monitoring_date = s.monitoring_date
                and coalesce(e.visit_status, '') = 'denied_access'
              )
          end
      )
      order by coalesce(s.monitoring_date, d.monitoring_date) desc nulls last, k.object_id
    ),
    '[]'::jsonb
  )
  into v_rows
  from object_keys k
  left join latest_success s on s.object_id = k.object_id
  left join latest_denied d on d.object_id = k.object_id
  left join latest_event e on e.object_id = k.object_id
  left join counts c on c.object_id = k.object_id;

  return jsonb_build_object(
    'changed', true,
    'version', v_version,
    'rows', v_rows,
    'fetchedAt', public.sf_iso_utc(now())
  );
end;
$$;

grant execute on function public.sf_get_registry_monitoring_overlay(text, bigint) to anon, authenticated;

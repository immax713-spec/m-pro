drop function if exists public.sf_get_registry_map_overlay(text);
create or replace function public.sf_get_registry_map_overlay(
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
  v_mpro_app record;
  v_division_code text := '';
  v_rows jsonb := '[]'::jsonb;
  v_version bigint := 0;
  v_updated_at timestamptz := now();
begin
  select *
  into v_user
  from public.sf_require_site_session(p_session_token)
  limit 1;

  insert into public.sf_data_state(scope, version, updated_at)
  values ('mpro', 1, now())
  on conflict (scope) do nothing;

  select version, updated_at
  into v_version, v_updated_at
  from public.sf_data_state
  where scope = 'mpro'
  limit 1;

  if p_if_version is not null and p_if_version = v_version then
    return jsonb_build_object(
      'changed', false,
      'version', v_version,
      'fetchedAt', public.sf_iso_utc(v_updated_at)
    );
  end if;

  select
    btrim(coalesce(a.app_role, '')) as app_role,
    public.mpro_canonical_division_code(public.sf_normalize_access_division(a.app_division)) as app_division_code
  into v_mpro_app
  from public.sf_user_apps a
  where a.user_id = v_user.user_id
    and lower(btrim(a.app_code)) = 'mpro'
    and coalesce(a.is_enabled, true)
    and public.sf_role_grants_access(a.app_role)
  order by coalesce(a.is_default, false) desc, a.created_at asc
  limit 1;

  v_division_code := coalesce(
    nullif(btrim(coalesce(v_mpro_app.app_division_code, '')), ''),
    public.mpro_canonical_division_code(coalesce(v_user.division, ''))
  );

  with latest_unarchived as (
    select distinct on (c.division_code, c.site_object_id)
      c.visit_id,
      c.site_object_id,
      c.division_code,
      c.status,
      c.inspector_name,
      c.route_list_name,
      c.visit_date,
      c.created_at
    from public.mpro_visit_context_v c
    where not c.is_archived
      and coalesce(nullif(btrim(c.site_object_id), ''), '') <> ''
      and (
        c.status = 'planned'
        or (
          c.status = 'in_progress'
          and c.entry_at is not null
          and c.exit_at is null
        )
      )
      and (
        v_division_code = ''
        or c.division_code = v_division_code
      )
    order by
      c.division_code,
      c.site_object_id,
      coalesce(c.exit_at, c.entry_at, c.created_at) desc,
      c.created_at desc,
      c.visit_id desc
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'objectId', lu.site_object_id,
        'divisionCode', coalesce(lu.division_code, ''),
        'visitId', lu.visit_id::text,
        'visitStatus', coalesce(lu.status, ''),
        'inspector', coalesce(lu.inspector_name, ''),
        'routeListName', coalesce(lu.route_list_name, ''),
        'visitDate', case when lu.visit_date is null then '' else lu.visit_date::text end
      )
      order by lu.division_code, lu.site_object_id
    ),
    '[]'::jsonb
  )
  into v_rows
  from latest_unarchived lu;

  return jsonb_build_object(
    'changed', true,
    'version', v_version,
    'rows', v_rows,
    'fetchedAt', public.sf_iso_utc(now())
  );
end;
$$;

grant execute on function public.sf_get_registry_map_overlay(text, bigint) to anon, authenticated;

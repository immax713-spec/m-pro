create or replace function public.sf_bump_named_data_state(p_scope text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scope text := nullif(btrim(coalesce(p_scope, '')), '');
  v_version bigint;
begin
  if v_scope is null then
    raise exception 'DATA_STATE_SCOPE_REQUIRED';
  end if;

  insert into public.sf_data_state(scope, version, updated_at)
  values (v_scope, 1, now())
  on conflict (scope) do update
  set
    version = public.sf_data_state.version + 1,
    updated_at = now()
  returning version into v_version;

  return coalesce(v_version, 1);
end;
$$;

create or replace function public.sf_touch_named_data_state_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scope text := nullif(btrim(coalesce(TG_ARGV[0], '')), '');
begin
  if v_scope is not null then
    perform public.sf_bump_named_data_state(v_scope);
  end if;
  return null;
end;
$$;

drop trigger if exists sf_touch_archive_monitoring_data_state on public.sf_archive_monitoring;
create trigger sf_touch_archive_monitoring_data_state
after insert or update or delete on public.sf_archive_monitoring
for each statement execute function public.sf_touch_data_state_trigger();

drop trigger if exists sf_touch_shared_selections_data_state on public.sf_shared_selections;
create trigger sf_touch_shared_selections_data_state
after insert or update or delete on public.sf_shared_selections
for each statement execute function public.sf_touch_named_data_state_trigger('shared_selections');

drop trigger if exists sf_touch_shared_selection_work_data_state on public.sf_shared_selection_work;
create trigger sf_touch_shared_selection_work_data_state
after insert or update or delete on public.sf_shared_selection_work
for each statement execute function public.sf_touch_named_data_state_trigger('shared_selection_work');

drop function if exists public.sf_get_registry_monitoring_overlay(text);
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

  with latest_success as (
    select distinct on (a.object_id)
      a.object_id,
      a.monitoring_date,
      a.inspector_name,
      a.ano_smg_code,
      a.checklist_url,
      a.yandex_disk_url,
      a.photos_url
    from public.sf_archive_monitoring a
    where nullif(btrim(a.object_id), '') is not null
      and coalesce(a.visit_status, 'completed') = 'completed'
    order by a.object_id, a.monitoring_date desc nulls last, a.created_at desc, a.updated_at desc, a.archive_id desc
  ),
  latest_denied as (
    select distinct on (a.object_id)
      a.object_id,
      a.monitoring_date,
      a.inspector_name
    from public.sf_archive_monitoring a
    where nullif(btrim(a.object_id), '') is not null
      and coalesce(a.visit_status, 'completed') = 'denied_access'
    order by a.object_id, a.monitoring_date desc nulls last, a.created_at desc, a.updated_at desc, a.archive_id desc
  ),
  latest_event as (
    select distinct on (a.object_id)
      a.object_id,
      coalesce(a.visit_status, 'completed') as visit_status,
      a.monitoring_date
    from public.sf_archive_monitoring a
    where nullif(btrim(a.object_id), '') is not null
    order by a.object_id, a.monitoring_date desc nulls last, a.created_at desc, a.updated_at desc, a.archive_id desc
  ),
  counts as (
    select
      a.object_id,
      count(*)::integer as monitoring_count
    from public.sf_archive_monitoring a
    where nullif(btrim(a.object_id), '') is not null
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

drop function if exists public.sf_get_shared_selections(text);
create or replace function public.sf_get_shared_selections(
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
  v_items jsonb := '[]'::jsonb;
  v_version bigint := 0;
  v_updated_at timestamptz := now();
begin
  select *
  into v_user
  from public.sf_require_site_session(p_session_token)
  limit 1;

  insert into public.sf_data_state(scope, version, updated_at)
  values ('shared_selections', 1, now())
  on conflict (scope) do nothing;

  select version, updated_at
  into v_version, v_updated_at
  from public.sf_data_state
  where scope = 'shared_selections'
  limit 1;

  if p_if_version is not null and p_if_version = v_version then
    return jsonb_build_object(
      'changed', false,
      'version', v_version,
      'fetchedAt', public.sf_iso_utc(v_updated_at)
    );
  end if;

  select coalesce(
    jsonb_agg(
      public.sf_build_selection_view(
        s.id,
        s.scope,
        s.name,
        s.meta,
        s.object_query,
        s.bulk_uin_text,
        s.registry_facet_filters,
        s.owner_name,
        s.created_at,
        s.updated_at,
        public.sf_can_mutate_selection(v_user.name, v_user.role, v_user.division, s.scope, s.owner_key)
      )
      order by s.updated_at desc, s.name asc
    ),
    '[]'::jsonb
  )
  into v_items
  from public.sf_shared_selections s
  where public.sf_can_access_selection(v_user.name, v_user.role, v_user.division, s.scope, s.owner_key);

  if p_if_version is null then
    return v_items;
  end if;

  return jsonb_build_object(
    'changed', true,
    'version', v_version,
    'items', v_items,
    'fetchedAt', public.sf_iso_utc(now())
  );
end;
$$;

drop function if exists public.sf_get_shared_selection_work_state(text, text);
create or replace function public.sf_get_shared_selection_work_state(
  p_session_token text,
  p_selection_id text,
  p_if_version bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user record;
  v_selection public.sf_shared_selections%rowtype;
  v_block_key text;
  v_block_name text;
  v_items jsonb := '[]'::jsonb;
  v_version bigint := 0;
  v_updated_at timestamptz := now();
begin
  select *
  into v_user
  from public.sf_require_site_session(p_session_token)
  limit 1;

  v_block_key := public.sf_block_key(v_user.division);
  v_block_name := coalesce(v_user.division, '');

  insert into public.sf_data_state(scope, version, updated_at)
  values ('shared_selection_work', 1, now())
  on conflict (scope) do nothing;

  select version, updated_at
  into v_version, v_updated_at
  from public.sf_data_state
  where scope = 'shared_selection_work'
  limit 1;

  if p_if_version is not null and p_if_version = v_version then
    return jsonb_build_object(
      'selectionId', coalesce(trim(p_selection_id), ''),
      'blockKey', coalesce(v_block_key, ''),
      'blockName', v_block_name,
      'version', v_version,
      'changed', false,
      'fetchedAt', public.sf_iso_utc(v_updated_at)
    );
  end if;

  if nullif(trim(coalesce(p_selection_id, '')), '') is null or nullif(v_block_key, '') is null then
    return jsonb_build_object(
      'selectionId', coalesce(trim(p_selection_id), ''),
      'blockKey', coalesce(v_block_key, ''),
      'blockName', v_block_name,
      'items', '[]'::jsonb,
      'version', v_version,
      'changed', true,
      'fetchedAt', public.sf_iso_utc(now())
    );
  end if;

  select *
  into v_selection
  from public.sf_shared_selections
  where id = trim(p_selection_id)
  limit 1;

  if not found or not public.sf_can_access_selection(v_user.name, v_user.role, v_user.division, v_selection.scope, v_selection.owner_key) then
    return jsonb_build_object(
      'selectionId', trim(p_selection_id),
      'blockKey', v_block_key,
      'blockName', v_block_name,
      'items', '[]'::jsonb,
      'version', v_version,
      'changed', true,
      'fetchedAt', public.sf_iso_utc(now())
    );
  end if;

  select coalesce(
    jsonb_agg(
      public.sf_build_work_item_view(
        w.selection_id,
        w.block_key,
        w.block_name,
        w.object_key,
        w.uin,
        w.status,
        w.assignee_key,
        w.assignee_name,
        w.updated_at,
        w.updated_by
      )
      order by w.updated_at desc, w.object_key asc
    ),
    '[]'::jsonb
  )
  into v_items
  from public.sf_shared_selection_work w
  where w.selection_id = trim(p_selection_id)
    and w.block_key = v_block_key;

  return jsonb_build_object(
    'selectionId', trim(p_selection_id),
    'blockKey', v_block_key,
    'blockName', v_block_name,
    'items', v_items,
    'version', v_version,
    'changed', true,
    'fetchedAt', public.sf_iso_utc(now())
  );
end;
$$;

grant execute on function public.sf_get_registry_monitoring_overlay(text, bigint) to anon, authenticated;
grant execute on function public.sf_get_registry_map_overlay(text, bigint) to anon, authenticated;
grant execute on function public.sf_get_shared_selections(text, bigint) to anon, authenticated;
grant execute on function public.sf_get_shared_selection_work_state(text, text, bigint) to anon, authenticated;

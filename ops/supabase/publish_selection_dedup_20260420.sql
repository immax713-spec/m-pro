create or replace function public.sf_publish_selection_to_mpro(p_session_token text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user record;
  v_selection_id text := btrim(coalesce(p_payload ->> 'selectionId', ''));
  v_selection_name text := btrim(coalesce(p_payload ->> 'selectionName', ''));
  v_target_division text := public.mpro_canonical_division_code(coalesce(p_payload ->> 'targetDivision', 'map'));
  v_user_division text := '';
  v_publish_mode text := case
    when lower(btrim(coalesce(p_payload ->> 'mode', ''))) = 'replace' then 'replace'
    else 'append'
  end;
  v_object_ids text[] := '{}'::text[];
  v_requested_count integer := 0;
  v_requested_visit_count integer := 0;
  v_resolved_count integer := 0;
  v_without_coordinates_count integer := 0;
  v_object_upserted_count integer := 0;
  v_visit_created_count integer := 0;
  v_visit_refreshed_count integer := 0;
  v_transferred_ownership_count integer := 0;
  v_kept_other_project_count integer := 0;
  v_conflict_assigned_count integer := 0;
  v_busy_count integer := 0;
  v_replaced_planned_count integer := 0;
  v_replaced_stale_in_progress_count integer := 0;
  v_replaced_completed_count integer := 0;
  v_replaced_denied_count integer := 0;
  v_skipped_in_progress_count integer := 0;
  v_archived_to_archive_count integer := 0;
  v_duplicate_cleanup_count integer := 0;
  v_details jsonb := '[]'::jsonb;
  v_existing public.mpro_visits%rowtype;
  v_existing_owner text := '';
  v_existing_owner_norm text := '';
  v_existing_inspector text := '';
  v_incoming_inspector text := '';
  v_selection_name_norm text := '';
  v_selected_visit_id uuid;
  v_removed_duplicates integer := 0;
  v_detail_status text := '';
  v_detail_route_list_name text := '';
  v_detail_inspector text := '';
  v_detail_visit_status text := '';
  v_source record;
begin
  select *
  into v_user
  from public.sf_require_site_mpro_admin_session(p_session_token)
  limit 1;

  if v_target_division = '' then
    raise exception 'BAD_INPUT: Не удалось определить target division';
  end if;

  v_user_division := coalesce(v_user.app_division_code, '');
  if v_user_division <> '' and v_user_division <> v_target_division then
    raise exception 'FORBIDDEN: Нет доступа к указанному division';
  end if;

  if v_selection_name = '' then
    v_selection_name := 'Выборка на карте';
  end if;
  v_selection_name_norm := public.sf_normalize_text(v_selection_name);

  select coalesce(
    array_agg(distinct btrim(src.object_id)) filter (where btrim(src.object_id) <> ''),
    '{}'::text[]
  )
  into v_object_ids
  from (
    select value as object_id
    from jsonb_array_elements_text(coalesce(p_payload -> 'objectIds', '[]'::jsonb)) as t(value)

    union all

    select coalesce(item ->> 'objectId', '') as object_id
    from jsonb_array_elements(coalesce(p_payload -> 'visitRequests', '[]'::jsonb)) as t(item)
  ) src;

  select count(*)::int
  into v_requested_visit_count
  from jsonb_array_elements(coalesce(p_payload -> 'visitRequests', '[]'::jsonb)) as t(item)
  where btrim(coalesce(item ->> 'objectId', '')) <> '';

  v_requested_count := coalesce(array_length(v_object_ids, 1), 0);
  if v_requested_count = 0 then
    raise exception 'BAD_INPUT: Не переданы объекты для публикации';
  end if;

  if v_publish_mode = 'replace' then
    with completed_candidates as (
      select c.visit_id, c.status
      from public.mpro_visit_context_v c
      where not c.is_archived
        and c.division_code = v_target_division
        and c.status in ('completed', 'denied_access')
    ),
    synced as (
      select coalesce(sum(public.mpro_sync_visit_to_site_archive(c.visit_id)), 0)::int as cnt
      from completed_candidates c
    ),
    deleted_completed as (
      delete from public.mpro_visits v
      using completed_candidates c
      where v.id = c.visit_id
      returning c.status
    )
    select
      count(*) filter (where status = 'completed')::int,
      count(*) filter (where status = 'denied_access')::int,
      coalesce((select cnt from synced), 0)::int
    into
      v_replaced_completed_count,
      v_replaced_denied_count,
      v_archived_to_archive_count
    from deleted_completed;

    with deleted_non_active as (
      delete from public.mpro_visits v
      where not coalesce(v.is_archived, false)
        and v.division_code = v_target_division
        and (
          v.status = 'planned'
          or (
            v.status = 'in_progress'
            and (
              v.entry_at is null
              or v.exit_at is not null
            )
          )
        )
      returning v.status
    )
    select
      count(*) filter (where status = 'planned')::int,
      count(*) filter (where status = 'in_progress')::int
    into
      v_replaced_planned_count,
      v_replaced_stale_in_progress_count
    from deleted_non_active;

    select count(*)::int
    into v_skipped_in_progress_count
    from public.mpro_visits v
    where not coalesce(v.is_archived, false)
      and v.division_code = v_target_division
      and v.status = 'in_progress'
      and v.entry_at is not null
      and v.exit_at is null;
  end if;

  for v_source in
    with source_objects as (
      select
        o.object_id,
        coords.latitude,
        coords.longitude
      from public.objects o
      left join public.sm sm on sm.object_id = o.object_id
      left join lateral public.sf_parse_latlon_text(sm.sm_1_4) coords on true
      where o.object_id = any(v_object_ids)
    ),
    requested_visits_raw as (
      select
        ordinality::integer as request_order,
        btrim(coalesce(item ->> 'objectId', '')) as object_id,
        btrim(coalesce(item ->> 'inspectorName', '')) as inspector_name
      from jsonb_array_elements(coalesce(p_payload -> 'visitRequests', '[]'::jsonb)) with ordinality as t(item, ordinality)
      where btrim(coalesce(item ->> 'objectId', '')) <> ''
    ),
    requested_visits as (
      select
        r.object_id,
        coalesce(
          (
            array_agg(nullif(r.inspector_name, '') order by r.request_order)
            filter (where nullif(r.inspector_name, '') is not null)
          )[1],
          ''
        ) as inspector_name
      from requested_visits_raw r
      group by r.object_id
    )
    select
      s.object_id,
      s.latitude,
      s.longitude,
      coalesce(rv.inspector_name, '') as inspector_name
    from source_objects s
    left join requested_visits rv on rv.object_id = s.object_id
    order by s.object_id
  loop
    v_resolved_count := v_resolved_count + 1;
    v_object_upserted_count := v_object_upserted_count + 1;
    if v_source.latitude is null or v_source.longitude is null then
      v_without_coordinates_count := v_without_coordinates_count + 1;
    end if;

    v_existing := null;
    v_existing_owner := '';
    v_existing_owner_norm := '';
    v_existing_inspector := '';
    v_incoming_inspector := btrim(coalesce(v_source.inspector_name, ''));
    v_selected_visit_id := null;
    v_removed_duplicates := 0;
    v_detail_status := '';
    v_detail_route_list_name := '';
    v_detail_inspector := '';
    v_detail_visit_status := '';

    perform pg_advisory_xact_lock(
      hashtextextended(
        format('%s|%s', v_target_division, v_source.object_id),
        0
      )
    );

    select *
    into v_existing
    from public.mpro_visits v
    where not coalesce(v.is_archived, false)
      and v.division_code = v_target_division
      and v.site_object_id = v_source.object_id
    order by
      case
        when v.status = 'planned' and nullif(btrim(coalesce(v.inspector_name_snapshot, '')), '') is not null then 0
        when v.status = 'planned' then 1
        when v.status = 'in_progress' then 2
        else 3
      end,
      case
        when v.status = 'planned' and nullif(btrim(coalesce(v.inspector_name_snapshot, '')), '') is null then v.created_at
        else null
      end asc nulls last,
      coalesce(v.exit_at, v.entry_at, v.created_at) desc,
      v.created_at desc,
      v.id desc
    limit 1
    for update;

    if found then
      v_existing_owner := btrim(coalesce(v_existing.route_list_name, ''));
      v_existing_owner_norm := public.sf_normalize_text(v_existing_owner);
      v_existing_inspector := btrim(coalesce(v_existing.inspector_name_snapshot, ''));
      v_detail_route_list_name := v_existing_owner;
      v_detail_inspector := v_existing_inspector;
      v_detail_visit_status := btrim(coalesce(v_existing.status, ''));
      v_selected_visit_id := v_existing.id;
    end if;

    if not found then
      insert into public.mpro_visits (
        id,
        site_object_id,
        division_code,
        inspector_name_snapshot,
        route_list_name,
        visit_date,
        status
      )
      values (
        extensions.gen_random_uuid(),
        v_source.object_id,
        v_target_division,
        v_incoming_inspector,
        v_selection_name,
        public.mpro_current_moscow_date(),
        'planned'
      )
      returning id into v_selected_visit_id;

      v_visit_created_count := v_visit_created_count + 1;
      v_detail_status := 'created';
      v_detail_route_list_name := v_selection_name;
      v_detail_inspector := v_incoming_inspector;

    elsif v_existing.status <> 'planned' then
      v_busy_count := v_busy_count + 1;
      v_detail_status := 'busy';

    elsif v_existing_owner_norm = v_selection_name_norm or v_existing_owner_norm = '' then
      update public.mpro_visits
      set
        route_list_name = v_selection_name,
        inspector_name_snapshot = case
          when v_incoming_inspector <> '' then v_incoming_inspector
          else coalesce(inspector_name_snapshot, '')
        end,
        visit_date = coalesce(visit_date, public.mpro_current_moscow_date()),
        updated_at = timezone('utc', now())
      where id = v_existing.id;

      v_visit_refreshed_count := v_visit_refreshed_count + 1;
      v_detail_status := 'refreshed';
      v_detail_route_list_name := v_selection_name;
      v_detail_inspector := case when v_incoming_inspector <> '' then v_incoming_inspector else v_existing_inspector end;

    elsif v_existing_inspector = '' and v_incoming_inspector <> '' then
      update public.mpro_visits
      set
        route_list_name = v_selection_name,
        inspector_name_snapshot = v_incoming_inspector,
        visit_date = public.mpro_current_moscow_date(),
        updated_at = timezone('utc', now())
      where id = v_existing.id;

      v_transferred_ownership_count := v_transferred_ownership_count + 1;
      v_detail_status := 'transferred';
      v_detail_route_list_name := v_selection_name;
      v_detail_inspector := v_incoming_inspector;

    else
      if v_existing_owner_norm <> '' then
        if v_existing_inspector <> '' and v_incoming_inspector <> '' then
          v_conflict_assigned_count := v_conflict_assigned_count + 1;
          v_detail_status := 'conflict_assigned';
        else
          v_kept_other_project_count := v_kept_other_project_count + 1;
          v_detail_status := 'kept_other_project';
        end if;
      else
        v_visit_refreshed_count := v_visit_refreshed_count + 1;
        v_detail_status := 'refreshed';
      end if;
    end if;

    if v_selected_visit_id is not null then
      delete from public.mpro_visits v
      where not coalesce(v.is_archived, false)
        and v.division_code = v_target_division
        and v.site_object_id = v_source.object_id
        and v.status = 'planned'
        and v.id <> v_selected_visit_id;
      get diagnostics v_removed_duplicates = row_count;
      v_duplicate_cleanup_count := v_duplicate_cleanup_count + greatest(v_removed_duplicates, 0);
    end if;

    if jsonb_array_length(v_details) < 200 and v_detail_status in ('transferred', 'kept_other_project', 'conflict_assigned', 'busy') then
      v_details := v_details || jsonb_build_array(
        jsonb_build_object(
          'objectId', v_source.object_id,
          'status', v_detail_status,
          'routeListName', coalesce(v_detail_route_list_name, ''),
          'inspector', coalesce(v_detail_inspector, ''),
          'visitStatus', coalesce(v_detail_visit_status, '')
        )
      );
    end if;
  end loop;

  return jsonb_build_object(
    'success', true,
    'selectionId', v_selection_id,
    'selectionName', v_selection_name,
    'targetDivision', v_target_division,
    'publishMode', v_publish_mode,
    'requestedObjects', v_requested_count,
    'requestedVisits', v_requested_visit_count,
    'resolvedObjects', v_resolved_count,
    'objectsWithoutCoordinates', v_without_coordinates_count,
    'upsertedObjects', v_object_upserted_count,
    'createdVisits', v_visit_created_count,
    'refreshedVisits', v_visit_refreshed_count,
    'transferredOwnershipCount', v_transferred_ownership_count,
    'keptOtherProjectCount', v_kept_other_project_count,
    'conflictAssignedCount', v_conflict_assigned_count,
    'duplicateCleanupCount', v_duplicate_cleanup_count,
    'busyVisits', v_busy_count,
    'replacedPlanned', v_replaced_planned_count,
    'replacedStaleInProgress', v_replaced_stale_in_progress_count,
    'replacedCompleted', v_replaced_completed_count,
    'replacedDenied', v_replaced_denied_count,
    'skippedInProgress', v_skipped_in_progress_count,
    'archivedToArchiveCount', v_archived_to_archive_count,
    'archivedToHistoryCount', v_archived_to_archive_count,
    'details', v_details
  );
end;
$function$;

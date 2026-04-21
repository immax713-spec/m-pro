create or replace function public.sf_get_object_monitoring_history(p_session_token text, p_object_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user record;
  v_object_id text := btrim(coalesce(p_object_id, ''));
  v_rows jsonb := '[]'::jsonb;
begin
  select *
  into v_user
  from public.sf_require_site_session(p_session_token)
  limit 1;

  if v_object_id = '' then
    return jsonb_build_object(
      'rows', '[]'::jsonb,
      'totalRows', 0,
      'fetchedAt', public.sf_iso_utc(now())
    );
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'monitoringDate', case when a.monitoring_date is null then '' else a.monitoring_date::text end,
        'visitStatus', coalesce(a.visit_status, 'completed'),
        'statusLabel',
          case
            when coalesce(a.visit_status, 'completed') = 'denied_access' then 'Недопуск'
            else 'Мониторинг выполнен'
          end,
        'inspector', coalesce(a.inspector_name, ''),
        'photosUrl', coalesce(a.photos_url, ''),
        'divisionCode', coalesce(a.division_code, ''),
        'routeListName', coalesce(a.route_list_name, '')
      )
      order by a.monitoring_date desc nulls last, a.created_at desc, a.updated_at desc, a.archive_id desc
    ),
    '[]'::jsonb
  )
  into v_rows
  from public.sf_archive_monitoring a
  where a.object_id = v_object_id
    and a.lab_study_id is null
    and coalesce(nullif(btrim(a.division_code), ''), '') <> 'constructioncontrol'
    and coalesce(nullif(btrim(a.division_code), ''), '') <> 'laboratory';

  return jsonb_build_object(
    'rows', v_rows,
    'totalRows', jsonb_array_length(v_rows),
    'fetchedAt', public.sf_iso_utc(now())
  );
end;
$function$;

create or replace function public.sf_get_object_lab_studies_history(p_session_token text, p_object_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user record;
  v_object_id text := btrim(coalesce(p_object_id, ''));
  v_target_uin text := '';
  v_rows jsonb := '[]'::jsonb;
begin
  select *
  into v_user
  from public.sf_require_site_session(p_session_token)
  limit 1;

  if v_object_id = '' then
    return jsonb_build_object(
      'rows', '[]'::jsonb,
      'totalRows', 0,
      'fetchedAt', public.sf_iso_utc(now())
    );
  end if;

  select coalesce(nullif(btrim(o.ro_1_3), ''), '')
  into v_target_uin
  from public.objects o
  where o.object_id = v_object_id
  limit 1;

  with archive_rows as (
    select
      coalesce(a.lab_study_id::text, concat('archive:', a.archive_id)) as id,
      a.mpro_visit_id as visit_id,
      coalesce(a.lab_created_at, a.created_at) as created_at,
      coalesce(a.lab_updated_at, a.updated_at, a.created_at) as updated_at,
      coalesce(a.lab_completed_at, a.exit_at, a.updated_at, a.created_at) as completed_at,
      case
        when coalesce(nullif(btrim(a.lab_study_status), ''), '') <> '' then a.lab_study_status
        when a.visit_status = 'completed' then 'completed'
        when a.visit_status = 'denied_access' then 'not_completed'
        else 'pending'
      end as status,
      coalesce(nullif(btrim(a.lab_study_type), ''), '') as study_type,
      coalesce(nullif(btrim(a.lab_random_task), ''), '') as random_task,
      a.lab_object_length_m as object_length_m,
      a.lab_object_width_m as object_width_m,
      coalesce(nullif(btrim(a.lab_inspector_comment), ''), '') as inspector_comment,
      coalesce(nullif(btrim(a.lab_route_url), ''), '') as route_url,
      coalesce(nullif(btrim(a.lab_legacy_result_raw), ''), '') as legacy_result_raw,
      coalesce(
        nullif(btrim(a.lab_generated_by_name), ''),
        nullif(btrim(a.lab_completed_by_name), ''),
        nullif(btrim(a.inspector_name), ''),
        ''
      ) as inspector_name,
      coalesce(nullif(btrim(a.lab_generated_by_name), ''), '') as generated_by_name,
      coalesce(nullif(btrim(a.lab_completed_by_name), ''), '') as completed_by_name,
      coalesce(nullif(btrim(a.lab_coordinate_start_latlon), ''), '') as coordinate_start_latlon,
      coalesce(nullif(btrim(a.lab_study_latlon), ''), '') as study_latlon,
      coalesce(nullif(btrim(a.lab_coordinate_finish_latlon), ''), '') as coordinate_finish_latlon,
      coalesce(nullif(btrim(a.object_id), ''), '') as resolved_site_object_id,
      coalesce(nullif(btrim(a.uin), ''), '') as resolved_site_uin,
      coalesce(nullif(btrim(a.division_code), ''), '') as division_code
    from public.sf_archive_monitoring a
    where a.lab_study_id is not null
       or coalesce(nullif(btrim(a.division_code), ''), '') = 'laboratory'
  ),
  active_rows as (
    select
      coalesce(v.lab_study_id::text, concat('visit:', v.id::text)) as id,
      v.id as visit_id,
      coalesce(v.lab_created_at, v.created_at) as created_at,
      coalesce(v.lab_updated_at, v.updated_at, v.created_at) as updated_at,
      coalesce(v.lab_completed_at, v.exit_at) as completed_at,
      case
        when coalesce(nullif(btrim(v.lab_study_status), ''), '') <> '' then v.lab_study_status
        when v.status = 'completed' then 'completed'
        when v.status = 'denied_access' then 'not_completed'
        when v.status = 'in_progress' then 'in_progress'
        else 'pending'
      end as status,
      coalesce(nullif(btrim(v.lab_study_type), ''), '') as study_type,
      coalesce(nullif(btrim(v.lab_random_task), ''), '') as random_task,
      v.lab_object_length_m as object_length_m,
      v.lab_object_width_m as object_width_m,
      coalesce(nullif(btrim(v.lab_inspector_comment), ''), '') as inspector_comment,
      coalesce(nullif(btrim(v.lab_route_url), ''), '') as route_url,
      coalesce(nullif(btrim(v.lab_legacy_result_raw), ''), '') as legacy_result_raw,
      coalesce(
        nullif(btrim(v.lab_generated_by_name), ''),
        nullif(btrim(v.lab_completed_by_name), ''),
        nullif(btrim(v.inspector_name_snapshot), ''),
        ''
      ) as inspector_name,
      coalesce(nullif(btrim(v.lab_generated_by_name), ''), '') as generated_by_name,
      coalesce(nullif(btrim(v.lab_completed_by_name), ''), '') as completed_by_name,
      coalesce(nullif(btrim(v.lab_coordinate_start_latlon), ''), '') as coordinate_start_latlon,
      coalesce(nullif(btrim(v.lab_study_latlon), ''), '') as study_latlon,
      coalesce(nullif(btrim(v.lab_coordinate_finish_latlon), ''), '') as coordinate_finish_latlon,
      coalesce(nullif(btrim(v.site_object_id), ''), '') as resolved_site_object_id,
      coalesce(nullif(btrim(o.ro_1_3), ''), '') as resolved_site_uin,
      coalesce(nullif(btrim(v.division_code), ''), '') as division_code
    from public.mpro_visits v
    left join public.objects o on o.object_id = v.site_object_id
    where v.lab_study_id is not null
       or coalesce(nullif(btrim(v.division_code), ''), '') = 'laboratory'
  ),
  matched as (
    select * from archive_rows
    union all
    select * from active_rows
  ),
  ranked as (
    select
      m.*,
      case
        when m.resolved_site_object_id = v_object_id then 0
        when v_target_uin <> '' and m.resolved_site_uin = v_target_uin then 1
        else 9
      end as match_rank
    from matched m
    where m.resolved_site_object_id = v_object_id
      or (v_target_uin <> '' and m.resolved_site_uin = v_target_uin)
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'visitId', m.visit_id,
        'createdAt', public.sf_iso_utc(m.created_at),
        'updatedAt', public.sf_iso_utc(m.updated_at),
        'completedAt', case when m.completed_at is null then '' else public.sf_iso_utc(m.completed_at) end,
        'status', m.status,
        'statusLabel',
          case m.status
            when 'completed' then 'Завершено'
            when 'not_completed' then 'Не завершено'
            when 'in_progress' then 'В работе'
            else 'Запланировано'
          end,
        'studyType', m.study_type,
        'randomTask', m.random_task,
        'objectLengthM', m.object_length_m,
        'objectWidthM', m.object_width_m,
        'inspectorName', m.inspector_name,
        'generatedByName', m.generated_by_name,
        'completedByName', m.completed_by_name,
        'inspectorComment', m.inspector_comment,
        'routeUrl', m.route_url,
        'legacyResultRaw', m.legacy_result_raw,
        'coordinateStartLatLon', m.coordinate_start_latlon,
        'studyLatLon', m.study_latlon,
        'coordinateFinishLatLon', m.coordinate_finish_latlon,
        'divisionCode', m.division_code,
        'hasScheme',
          (
            coalesce(nullif(btrim(m.coordinate_start_latlon), ''), '') <> ''
            and coalesce(nullif(btrim(m.study_latlon), ''), '') <> ''
            and coalesce(nullif(btrim(m.coordinate_finish_latlon), ''), '') <> ''
          )
      )
      order by
        m.match_rank,
        coalesce(m.completed_at, m.updated_at, m.created_at) desc,
        m.created_at desc,
        m.id desc
    ),
    '[]'::jsonb
  )
  into v_rows
  from ranked m;

  return jsonb_build_object(
    'rows', v_rows,
    'totalRows', jsonb_array_length(v_rows),
    'fetchedAt', public.sf_iso_utc(now())
  );
end;
$function$;

create or replace function public.mpro_sync_visit_to_site_archive(p_visit_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_archive_count integer := 0;
begin
  if p_visit_id is null then
    return 0;
  end if;

  with candidate as (
    select
      c.*,
      v.lab_study_id,
      coalesce(nullif(btrim(v.lab_study_status), ''), '') as lab_study_status,
      coalesce(nullif(btrim(v.lab_study_type), ''), '') as lab_study_type,
      coalesce(nullif(btrim(v.lab_random_task), ''), '') as lab_random_task,
      v.lab_object_length_m,
      v.lab_object_width_m,
      coalesce(nullif(btrim(v.lab_inspector_comment), ''), '') as lab_inspector_comment,
      coalesce(nullif(btrim(v.lab_route_url), ''), '') as lab_route_url,
      coalesce(nullif(btrim(v.lab_legacy_result_raw), ''), '') as lab_legacy_result_raw,
      coalesce(nullif(btrim(v.lab_generated_by_name), ''), '') as lab_generated_by_name,
      coalesce(nullif(btrim(v.lab_completed_by_name), ''), '') as lab_completed_by_name,
      v.lab_created_at,
      v.lab_updated_at,
      v.lab_completed_at,
      coalesce(nullif(btrim(v.lab_coordinate_start_latlon), ''), '') as lab_coordinate_start_latlon,
      coalesce(nullif(btrim(v.lab_study_latlon), ''), '') as lab_study_latlon,
      coalesce(nullif(btrim(v.lab_coordinate_finish_latlon), ''), '') as lab_coordinate_finish_latlon
    from public.mpro_visit_context_v c
    join public.mpro_visits v on v.id = c.visit_id
    where c.visit_id = p_visit_id
      and not coalesce(c.is_archived, false)
      and c.status in ('completed', 'denied_access')
      and coalesce(nullif(btrim(c.site_object_id), ''), '') <> ''
  ),
  archive_upsert as (
    insert into public.sf_archive_monitoring (
      archive_id,
      object_id,
      uin,
      ano_smg_code,
      division,
      monitoring_date,
      visit_status,
      inspector_name,
      route_list_name,
      object_name,
      address,
      latlon,
      latitude,
      longitude,
      checklist_url,
      yandex_disk_url,
      photos_url,
      entry_time,
      exit_time,
      time_spent,
      readiness,
      mpro_visit_id,
      division_code,
      visit_date,
      entry_at,
      exit_at,
      time_spent_seconds,
      entry_latlon,
      coordinate_match_status,
      coordinate_match_distance_m,
      lab_study_id,
      lab_study_status,
      lab_study_type,
      lab_random_task,
      lab_object_length_m,
      lab_object_width_m,
      lab_inspector_comment,
      lab_route_url,
      lab_legacy_result_raw,
      lab_generated_by_name,
      lab_completed_by_name,
      lab_created_at,
      lab_updated_at,
      lab_completed_at,
      lab_coordinate_start_latlon,
      lab_study_latlon,
      lab_coordinate_finish_latlon
    )
    select
      concat('mpro_', c.visit_id::text),
      c.site_object_id,
      coalesce(nullif(btrim(c.original_id), ''), c.site_object_id),
      coalesce(c.ano_smg_code, ''),
      public.mpro_division_ui_label(c.division_code),
      coalesce(
        timezone('Europe/Moscow', coalesce(c.exit_at, c.updated_at, c.entry_at, c.created_at, timezone('utc', now())))::date,
        c.visit_date
      ),
      c.status,
      c.inspector_name,
      coalesce(c.route_list_name, ''),
      coalesce(nullif(btrim(c.address), ''), coalesce(nullif(btrim(c.original_id), ''), c.site_object_id)),
      coalesce(nullif(btrim(c.address), ''), coalesce(nullif(btrim(c.original_id), ''), c.site_object_id)),
      coalesce(nullif(btrim(c.object_latlon), ''), ''),
      coords.latitude,
      coords.longitude,
      coalesce(c.google_sheet_url, ''),
      coalesce(c.yandex_disk_url, ''),
      coalesce(c.photos_url, ''),
      case when c.entry_at is null then '' else public.sf_iso_utc(c.entry_at) end,
      case
        when c.status = 'denied_access' then 'нет'
        when c.exit_at is null then ''
        else public.sf_iso_utc(c.exit_at)
      end,
      public.mpro_format_duration(c.time_spent_seconds),
      coalesce(c.current_readiness::text, ''),
      c.visit_id,
      coalesce(nullif(btrim(c.division_code), ''), ''),
      coalesce(
        timezone('Europe/Moscow', coalesce(c.exit_at, c.updated_at, c.entry_at, c.created_at, timezone('utc', now())))::date,
        c.visit_date
      ),
      c.entry_at,
      c.exit_at,
      c.time_spent_seconds,
      coalesce(nullif(btrim(c.entry_latlon), ''), ''),
      coalesce(nullif(btrim(c.coordinate_match_status), ''), 'unknown'),
      c.coordinate_match_distance_m,
      c.lab_study_id,
      case
        when c.lab_study_id is null then ''
        when c.lab_study_status in ('completed', 'not_completed', 'cancelled') then c.lab_study_status
        when c.status = 'completed' then 'completed'
        when c.status = 'denied_access' then 'not_completed'
        when c.lab_study_status <> '' then c.lab_study_status
        else ''
      end,
      c.lab_study_type,
      c.lab_random_task,
      c.lab_object_length_m,
      c.lab_object_width_m,
      c.lab_inspector_comment,
      c.lab_route_url,
      case
        when c.lab_study_id is null then ''
        when c.lab_legacy_result_raw <> '' then c.lab_legacy_result_raw
        when c.status = 'completed' then 'OK'
        when c.status = 'denied_access' then 'FAIL'
        else ''
      end,
      c.lab_generated_by_name,
      coalesce(
        nullif(btrim(c.lab_completed_by_name), ''),
        case when c.status in ('completed', 'denied_access') then c.inspector_name else '' end
      ),
      c.lab_created_at,
      c.lab_updated_at,
      coalesce(c.lab_completed_at, c.exit_at),
      c.lab_coordinate_start_latlon,
      c.lab_study_latlon,
      c.lab_coordinate_finish_latlon
    from candidate c
    left join lateral public.sf_parse_latlon_text(c.object_latlon) coords on true
    on conflict (archive_id) do update
    set
      object_id = excluded.object_id,
      uin = excluded.uin,
      ano_smg_code = excluded.ano_smg_code,
      division = excluded.division,
      monitoring_date = excluded.monitoring_date,
      visit_status = excluded.visit_status,
      inspector_name = excluded.inspector_name,
      route_list_name = excluded.route_list_name,
      object_name = excluded.object_name,
      address = excluded.address,
      latlon = excluded.latlon,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      checklist_url = excluded.checklist_url,
      yandex_disk_url = excluded.yandex_disk_url,
      photos_url = excluded.photos_url,
      entry_time = excluded.entry_time,
      exit_time = excluded.exit_time,
      time_spent = excluded.time_spent,
      readiness = excluded.readiness,
      mpro_visit_id = excluded.mpro_visit_id,
      division_code = excluded.division_code,
      visit_date = excluded.visit_date,
      entry_at = excluded.entry_at,
      exit_at = excluded.exit_at,
      time_spent_seconds = excluded.time_spent_seconds,
      entry_latlon = excluded.entry_latlon,
      coordinate_match_status = excluded.coordinate_match_status,
      coordinate_match_distance_m = excluded.coordinate_match_distance_m,
      lab_study_id = excluded.lab_study_id,
      lab_study_status = excluded.lab_study_status,
      lab_study_type = excluded.lab_study_type,
      lab_random_task = excluded.lab_random_task,
      lab_object_length_m = excluded.lab_object_length_m,
      lab_object_width_m = excluded.lab_object_width_m,
      lab_inspector_comment = excluded.lab_inspector_comment,
      lab_route_url = excluded.lab_route_url,
      lab_legacy_result_raw = excluded.lab_legacy_result_raw,
      lab_generated_by_name = excluded.lab_generated_by_name,
      lab_completed_by_name = excluded.lab_completed_by_name,
      lab_created_at = excluded.lab_created_at,
      lab_updated_at = excluded.lab_updated_at,
      lab_completed_at = excluded.lab_completed_at,
      lab_coordinate_start_latlon = excluded.lab_coordinate_start_latlon,
      lab_study_latlon = excluded.lab_study_latlon,
      lab_coordinate_finish_latlon = excluded.lab_coordinate_finish_latlon,
      updated_at = timezone('utc', now())
    returning archive_id
  )
  select count(*)
  into v_archive_count
  from archive_upsert;

  return coalesce(v_archive_count, 0);
end;
$function$;

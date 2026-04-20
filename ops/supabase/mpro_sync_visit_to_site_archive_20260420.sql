CREATE OR REPLACE FUNCTION public.mpro_sync_visit_to_site_archive(p_visit_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        when c.status = 'completed' then '✅'
        when c.status = 'denied_access' then '❌'
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
$function$

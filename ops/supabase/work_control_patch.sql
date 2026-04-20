create table if not exists public.mpro_skud_imports (
  import_id uuid primary key default gen_random_uuid(),
  file_name text not null default '',
  imported_by_name text not null default '',
  imported_at timestamptz not null default now(),
  period_from date,
  period_to date,
  row_count integer not null default 0
);

create table if not exists public.mpro_skud_daily (
  work_date date not null,
  inspector_name text not null default '',
  inspector_name_clean text not null default '',
  inspector_name_norm text not null default '',
  division_name text not null default '',
  arrival_time time,
  departure_time time,
  total_minutes integer,
  absence_reason text not null default '',
  is_registry_inspector boolean not null default false,
  is_sk_inspector boolean not null default false,
  raw_row jsonb not null default '{}'::jsonb,
  source_import_id uuid references public.mpro_skud_imports(import_id) on delete set null,
  imported_at timestamptz not null default now(),
  primary key (work_date, inspector_name_norm)
);

create index if not exists mpro_skud_daily_work_date_idx
  on public.mpro_skud_daily(work_date);

create index if not exists mpro_skud_daily_inspector_name_norm_idx
  on public.mpro_skud_daily(inspector_name_norm);

create table if not exists public.mpro_workday_imports (
  import_id uuid primary key default gen_random_uuid(),
  file_name text not null default '',
  imported_by_name text not null default '',
  imported_at timestamptz not null default now(),
  period_from date,
  period_to date,
  row_count integer not null default 0
);

create table if not exists public.mpro_workday_daily (
  work_date date not null,
  inspector_name text not null default '',
  inspector_name_clean text not null default '',
  inspector_name_norm text not null default '',
  open_time time,
  open_coordinates text not null default '',
  open_comment text not null default '',
  close_time time,
  close_coordinates text not null default '',
  close_comment text not null default '',
  raw_row jsonb not null default '{}'::jsonb,
  source_import_id uuid references public.mpro_workday_imports(import_id) on delete set null,
  imported_at timestamptz not null default now(),
  primary key (work_date, inspector_name_norm)
);

create index if not exists mpro_workday_daily_work_date_idx
  on public.mpro_workday_daily(work_date);

create index if not exists mpro_workday_daily_inspector_name_norm_idx
  on public.mpro_workday_daily(inspector_name_norm);

create or replace function public.mpro_skud_clean_name(p_value text)
returns text
language sql
immutable
as $function$
  select btrim(
    regexp_replace(
      regexp_replace(
        regexp_replace(coalesce(p_value, ''), E'[\\r\\n]+', ' ', 'g'),
        '\\s+', ' ', 'g'
      ),
      '\\s*\\([^)]*\\)\\s*$',
      '',
      'g'
    )
  );
$function$;

create or replace function public.mpro_import_skud_rows(p_session_token text, p_payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user record;
  v_rows jsonb := coalesce(p_payload -> 'rows', '[]'::jsonb);
  v_file_name text := btrim(coalesce(p_payload ->> 'fileName', ''));
  v_import_id uuid := gen_random_uuid();
  v_row_count integer := 0;
  v_period_from date := null;
  v_period_to date := null;
begin
  select *
  into v_user
  from public.sf_require_site_session(p_session_token)
  limit 1;

  if jsonb_typeof(v_rows) <> 'array' or jsonb_array_length(v_rows) = 0 then
    raise exception 'VALIDATION: Нет строк для импорта СКУД';
  end if;

  with parsed as (
    select
      nullif(btrim(coalesce(x.work_date, '')), '')::date as work_date,
      btrim(coalesce(x.inspector_name, '')) as inspector_name,
      public.mpro_skud_clean_name(coalesce(nullif(btrim(coalesce(x.inspector_name_clean, '')), ''), x.inspector_name)) as inspector_name_clean,
      public.sf_normalize_text(public.mpro_skud_clean_name(coalesce(nullif(btrim(coalesce(x.inspector_name_clean, '')), ''), x.inspector_name))) as inspector_name_norm,
      btrim(coalesce(x.division_name, '')) as division_name,
      case when nullif(btrim(coalesce(x.arrival_time, '')), '') is null then null else x.arrival_time::time end as arrival_time,
      case when nullif(btrim(coalesce(x.departure_time, '')), '') is null then null else x.departure_time::time end as departure_time,
      case when x.total_minutes is null then null else greatest(x.total_minutes, 0) end as total_minutes,
      btrim(coalesce(x.absence_reason, '')) as absence_reason,
      coalesce(x.is_registry_inspector, false) as is_registry_inspector,
      coalesce(x.is_sk_inspector, false) as is_sk_inspector,
      coalesce(x.raw_row, '{}'::jsonb) as raw_row
    from jsonb_to_recordset(v_rows) as x(
      work_date text,
      inspector_name text,
      inspector_name_clean text,
      division_name text,
      arrival_time text,
      departure_time text,
      total_minutes integer,
      absence_reason text,
      is_registry_inspector boolean,
      is_sk_inspector boolean,
      raw_row jsonb
    )
  ), valid as (
    select *
    from parsed
    where work_date is not null
      and inspector_name_norm <> ''
  )
  select
    count(*)::integer,
    min(work_date),
    max(work_date)
  into v_row_count, v_period_from, v_period_to
  from valid;

  if coalesce(v_row_count, 0) = 0 then
    raise exception 'VALIDATION: Не удалось распознать даты и инспекторов в файле СКУД';
  end if;

  insert into public.mpro_skud_imports(import_id, file_name, imported_by_name, imported_at, period_from, period_to, row_count)
  values (
    v_import_id,
    coalesce(v_file_name, ''),
    coalesce(v_user.name, ''),
    now(),
    v_period_from,
    v_period_to,
    v_row_count
  );

  delete from public.mpro_skud_daily
  where work_date between v_period_from and v_period_to;

  insert into public.mpro_skud_daily(
    work_date,
    inspector_name,
    inspector_name_clean,
    inspector_name_norm,
    division_name,
    arrival_time,
    departure_time,
    total_minutes,
    absence_reason,
    is_registry_inspector,
    is_sk_inspector,
    raw_row,
    source_import_id,
    imported_at
  )
  with parsed as (
    select
      nullif(btrim(coalesce(x.work_date, '')), '')::date as work_date,
      btrim(coalesce(x.inspector_name, '')) as inspector_name,
      public.mpro_skud_clean_name(coalesce(nullif(btrim(coalesce(x.inspector_name_clean, '')), ''), x.inspector_name)) as inspector_name_clean,
      public.sf_normalize_text(public.mpro_skud_clean_name(coalesce(nullif(btrim(coalesce(x.inspector_name_clean, '')), ''), x.inspector_name))) as inspector_name_norm,
      btrim(coalesce(x.division_name, '')) as division_name,
      case when nullif(btrim(coalesce(x.arrival_time, '')), '') is null then null else x.arrival_time::time end as arrival_time,
      case when nullif(btrim(coalesce(x.departure_time, '')), '') is null then null else x.departure_time::time end as departure_time,
      case when x.total_minutes is null then null else greatest(x.total_minutes, 0) end as total_minutes,
      btrim(coalesce(x.absence_reason, '')) as absence_reason,
      coalesce(x.is_registry_inspector, false) as is_registry_inspector,
      coalesce(x.is_sk_inspector, false) as is_sk_inspector,
      coalesce(x.raw_row, '{}'::jsonb) as raw_row
    from jsonb_to_recordset(v_rows) as x(
      work_date text,
      inspector_name text,
      inspector_name_clean text,
      division_name text,
      arrival_time text,
      departure_time text,
      total_minutes integer,
      absence_reason text,
      is_registry_inspector boolean,
      is_sk_inspector boolean,
      raw_row jsonb
    )
  )
  select
    work_date,
    inspector_name,
    inspector_name_clean,
    inspector_name_norm,
    division_name,
    arrival_time,
    departure_time,
    total_minutes,
    absence_reason,
    is_registry_inspector,
    is_sk_inspector,
    raw_row,
    v_import_id,
    now()
  from parsed
  where work_date is not null
    and inspector_name_norm <> ''
  on conflict (work_date, inspector_name_norm) do update
    set inspector_name = excluded.inspector_name,
        inspector_name_clean = excluded.inspector_name_clean,
        division_name = excluded.division_name,
        arrival_time = excluded.arrival_time,
        departure_time = excluded.departure_time,
        total_minutes = excluded.total_minutes,
        absence_reason = excluded.absence_reason,
        is_registry_inspector = excluded.is_registry_inspector,
        is_sk_inspector = excluded.is_sk_inspector,
        raw_row = excluded.raw_row,
        source_import_id = excluded.source_import_id,
        imported_at = excluded.imported_at;

  return jsonb_build_object(
    'success', true,
    'importId', v_import_id::text,
    'fileName', coalesce(v_file_name, ''),
    'periodFrom', coalesce(v_period_from::text, ''),
    'periodTo', coalesce(v_period_to::text, ''),
    'rowCount', v_row_count,
    'importedAt', public.sf_iso_utc(now())
  );
end;
$function$;

create or replace function public.mpro_import_workday_rows(p_session_token text, p_payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user record;
  v_rows jsonb := coalesce(p_payload -> 'rows', '[]'::jsonb);
  v_file_name text := btrim(coalesce(p_payload ->> 'fileName', ''));
  v_import_id uuid := gen_random_uuid();
  v_row_count integer := 0;
  v_period_from date := null;
  v_period_to date := null;
begin
  select *
  into v_user
  from public.sf_require_site_session(p_session_token)
  limit 1;

  if jsonb_typeof(v_rows) <> 'array' or jsonb_array_length(v_rows) = 0 then
    raise exception 'VALIDATION: no WorkDay rows to import';
  end if;

  with parsed as (
    select
      nullif(btrim(coalesce(x.work_date, '')), '')::date as work_date,
      btrim(coalesce(x.inspector_name, '')) as inspector_name,
      public.mpro_skud_clean_name(
        coalesce(
          nullif(btrim(coalesce(x.inspector_name_clean, '')), ''),
          x.inspector_name
        )
      ) as inspector_name_clean,
      public.sf_normalize_text(
        public.mpro_skud_clean_name(
          coalesce(
            nullif(btrim(coalesce(x.inspector_name_clean, '')), ''),
            x.inspector_name
          )
        )
      ) as inspector_name_norm,
      case when nullif(btrim(coalesce(x.open_time, '')), '') is null then null else x.open_time::time end as open_time,
      btrim(coalesce(x.open_coordinates, '')) as open_coordinates,
      btrim(coalesce(x.open_comment, '')) as open_comment,
      case when nullif(btrim(coalesce(x.close_time, '')), '') is null then null else x.close_time::time end as close_time,
      btrim(coalesce(x.close_coordinates, '')) as close_coordinates,
      btrim(coalesce(x.close_comment, '')) as close_comment,
      coalesce(x.raw_row, '{}'::jsonb) as raw_row
    from jsonb_to_recordset(v_rows) as x(
      work_date text,
      inspector_name text,
      inspector_name_clean text,
      open_time text,
      open_coordinates text,
      open_comment text,
      close_time text,
      close_coordinates text,
      close_comment text,
      raw_row jsonb
    )
  ), valid as (
    select *
    from parsed
    where work_date is not null
      and inspector_name_norm <> ''
      and (open_time is not null or close_time is not null)
  )
  select
    count(*)::integer,
    min(work_date),
    max(work_date)
  into v_row_count, v_period_from, v_period_to
  from valid;

  if coalesce(v_row_count, 0) = 0 then
    raise exception 'VALIDATION: failed to parse WorkDay rows';
  end if;

  insert into public.mpro_workday_imports(import_id, file_name, imported_by_name, imported_at, period_from, period_to, row_count)
  values (
    v_import_id,
    coalesce(v_file_name, ''),
    coalesce(v_user.name, ''),
    now(),
    v_period_from,
    v_period_to,
    v_row_count
  );

  delete from public.mpro_workday_daily
  where work_date between v_period_from and v_period_to;

  insert into public.mpro_workday_daily(
    work_date,
    inspector_name,
    inspector_name_clean,
    inspector_name_norm,
    open_time,
    open_coordinates,
    open_comment,
    close_time,
    close_coordinates,
    close_comment,
    raw_row,
    source_import_id,
    imported_at
  )
  with parsed as (
    select
      nullif(btrim(coalesce(x.work_date, '')), '')::date as work_date,
      btrim(coalesce(x.inspector_name, '')) as inspector_name,
      public.mpro_skud_clean_name(
        coalesce(
          nullif(btrim(coalesce(x.inspector_name_clean, '')), ''),
          x.inspector_name
        )
      ) as inspector_name_clean,
      public.sf_normalize_text(
        public.mpro_skud_clean_name(
          coalesce(
            nullif(btrim(coalesce(x.inspector_name_clean, '')), ''),
            x.inspector_name
          )
        )
      ) as inspector_name_norm,
      case when nullif(btrim(coalesce(x.open_time, '')), '') is null then null else x.open_time::time end as open_time,
      btrim(coalesce(x.open_coordinates, '')) as open_coordinates,
      btrim(coalesce(x.open_comment, '')) as open_comment,
      case when nullif(btrim(coalesce(x.close_time, '')), '') is null then null else x.close_time::time end as close_time,
      btrim(coalesce(x.close_coordinates, '')) as close_coordinates,
      btrim(coalesce(x.close_comment, '')) as close_comment,
      coalesce(x.raw_row, '{}'::jsonb) as raw_row
    from jsonb_to_recordset(v_rows) as x(
      work_date text,
      inspector_name text,
      inspector_name_clean text,
      open_time text,
      open_coordinates text,
      open_comment text,
      close_time text,
      close_coordinates text,
      close_comment text,
      raw_row jsonb
    )
  )
  select
    work_date,
    inspector_name,
    inspector_name_clean,
    inspector_name_norm,
    open_time,
    open_coordinates,
    open_comment,
    close_time,
    close_coordinates,
    close_comment,
    raw_row,
    v_import_id,
    now()
  from parsed
  where work_date is not null
    and inspector_name_norm <> ''
    and (open_time is not null or close_time is not null)
  on conflict (work_date, inspector_name_norm) do update
    set inspector_name = excluded.inspector_name,
        inspector_name_clean = excluded.inspector_name_clean,
        open_time = excluded.open_time,
        open_coordinates = excluded.open_coordinates,
        open_comment = excluded.open_comment,
        close_time = excluded.close_time,
        close_coordinates = excluded.close_coordinates,
        close_comment = excluded.close_comment,
        raw_row = excluded.raw_row,
        source_import_id = excluded.source_import_id,
        imported_at = excluded.imported_at;

  return jsonb_build_object(
    'success', true,
    'importId', v_import_id::text,
    'fileName', coalesce(v_file_name, ''),
    'periodFrom', coalesce(v_period_from::text, ''),
    'periodTo', coalesce(v_period_to::text, ''),
    'rowCount', v_row_count,
    'importedAt', public.sf_iso_utc(now())
  );
end;
$function$;

create or replace function public.mpro_get_work_control_dashboard(
  p_session_token text,
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
  v_date_from date := coalesce(p_date_from, date_trunc('month', timezone('Europe/Moscow', now()))::date);
  v_date_to date := coalesce(p_date_to, public.mpro_current_moscow_date());
  v_daily_rows jsonb := '[]'::jsonb;
  v_skud_dates jsonb := '[]'::jsonb;
  v_missing_dates jsonb := '[]'::jsonb;
  v_latest_import jsonb := '{}'::jsonb;
  v_expected_days integer := 0;
  v_loaded_days integer := 0;
  v_status text := 'missing';
  v_status_label text := 'Отсутствует СКУД за период';
  v_workday_dates jsonb := '[]'::jsonb;
  v_workday_missing_dates jsonb := '[]'::jsonb;
  v_workday_latest_import jsonb := '{}'::jsonb;
  v_workday_expected_days integer := 0;
  v_workday_loaded_days integer := 0;
  v_workday_status text := 'missing';
  v_workday_status_label text := 'Нет РВ за период';
begin
  select *
  into v_user
  from public.sf_require_site_session(p_session_token)
  limit 1;

  if v_date_from > v_date_to then
    select least(v_date_from, v_date_to), greatest(v_date_from, v_date_to)
    into v_date_from, v_date_to;
  end if;

  with mpro_app_rows as (
    select
      u.id as user_id,
      u.name as legacy_name,
      btrim(coalesce(a.app_role, '')) as app_role,
      public.mpro_canonical_division_code(public.sf_normalize_access_division(a.app_division)) as division_code,
      coalesce(a.is_default, false) as is_default,
      a.created_at
    from public.sf_users u
    join public.sf_user_apps a on a.user_id = u.id
    where lower(btrim(coalesce(a.app_code, ''))) = 'mpro'
      and coalesce(a.is_enabled, true)
      and coalesce(u.is_active, true)
      and public.sf_role_grants_access(a.app_role)
  ),
  inspector_dir as (
    select distinct
      r.user_id,
      r.legacy_name as inspector_name,
      public.sf_normalize_text(r.legacy_name) as inspector_name_norm,
      coalesce(
        (
          select public.mpro_division_ui_label(r2.division_code)
          from mpro_app_rows r2
          where r2.user_id = r.user_id
            and r2.division_code <> ''
          order by r2.is_default desc, r2.created_at asc, r2.division_code
          limit 1
        ),
        ''
      ) as division_label
    from mpro_app_rows r
    where public.mpro_is_inspector_role(coalesce(nullif(r.app_role, ''), 'Inspector'))
  ),
  archive_visits_ranked as (
    select
      a.monitoring_date as work_date,
      btrim(coalesce(a.inspector_name, '')) as inspector_name,
      public.sf_normalize_text(btrim(coalesce(a.inspector_name, ''))) as inspector_name_norm,
      coalesce(
        nullif(btrim(coalesce(a.division, '')), ''),
        nullif(public.mpro_division_ui_label(a.division_code), ''),
        ''
      ) as division_label,
      coalesce(a.entry_at, a.created_at) as first_candidate_at,
      coalesce(a.exit_at, a.entry_at, a.created_at) as last_candidate_at,
      a.coordinate_match_distance_m,
      row_number() over (
        partition by a.monitoring_date, public.sf_normalize_text(btrim(coalesce(a.inspector_name, '')))
        order by coalesce(a.entry_at, a.created_at) asc nulls last, a.created_at asc nulls last, a.archive_id asc
      ) as first_seq,
      row_number() over (
        partition by a.monitoring_date, public.sf_normalize_text(btrim(coalesce(a.inspector_name, '')))
        order by coalesce(a.exit_at, a.entry_at, a.created_at) desc nulls last, a.created_at desc nulls last, a.archive_id desc
      ) as last_seq
    from public.sf_archive_monitoring a
    where a.monitoring_date between v_date_from and v_date_to
      and coalesce(a.visit_status, 'completed') = 'completed'
      and nullif(btrim(coalesce(a.inspector_name, '')), '') is not null
  ),
  visits as (
    select
      v.work_date,
      max(v.inspector_name) as inspector_name,
      v.inspector_name_norm,
      coalesce(
        nullif(max(v.division_label), ''),
        nullif(max(d.division_label), ''),
        'Не указано'
      ) as division_label,
      count(*)::integer as monitorings,
      min(v.first_candidate_at) as first_object_at,
      max(v.last_candidate_at) as last_object_at,
      max(v.coordinate_match_distance_m) filter (where v.first_seq = 1) as first_geo_distance_m,
      max(v.coordinate_match_distance_m) filter (where v.last_seq = 1) as last_geo_distance_m
    from archive_visits_ranked v
    left join inspector_dir d on d.inspector_name_norm = v.inspector_name_norm
    group by v.work_date, v.inspector_name_norm
  ),
  skud as (
    select
      s.work_date,
      coalesce(nullif(btrim(s.inspector_name_clean), ''), nullif(btrim(s.inspector_name), ''), '') as inspector_name,
      s.inspector_name_norm,
      s.division_name,
      s.arrival_time,
      s.departure_time,
      s.total_minutes,
      s.absence_reason,
      s.is_registry_inspector,
      s.is_sk_inspector
    from public.mpro_skud_daily s
    where s.work_date between v_date_from and v_date_to
  ),
  workday_live as (
    select
      w.work_date,
      btrim(coalesce(w.inspector_name, '')) as inspector_name,
      public.sf_normalize_text(btrim(coalesce(w.inspector_name, ''))) as inspector_name_norm,
      case when w.open_at is null then null else (timezone('Europe/Moscow', w.open_at))::time end as open_time,
      btrim(coalesce(w.open_coordinates, '')) as open_coordinates,
      btrim(coalesce(w.open_comment, '')) as open_comment,
      case when w.close_at is null then null else (timezone('Europe/Moscow', w.close_at))::time end as close_time,
      btrim(coalesce(w.close_coordinates, '')) as close_coordinates,
      btrim(coalesce(w.close_comment, '')) as close_comment,
      'live'::text as source_kind,
      coalesce(w.updated_at, w.close_at, w.open_at, w.created_at, now()) as source_updated_at
    from public.mpro_workday w
    where w.work_date between v_date_from and v_date_to
      and nullif(btrim(coalesce(w.inspector_name, '')), '') is not null
      and w.close_at is not null
  ),
  workday as (
    select
      w.work_date,
      w.inspector_name,
      w.inspector_name_norm,
      w.open_time,
      w.open_coordinates,
      w.open_comment,
      w.close_time,
      w.close_coordinates,
      w.close_comment,
      w.source_kind
    from workday_live w
    where w.inspector_name_norm <> ''
      and (w.open_time is not null or w.close_time is not null)
  ),
  day_keys as (
    select v.work_date, v.inspector_name_norm
    from visits v
    where v.inspector_name_norm <> ''
    union
    select s.work_date, s.inspector_name_norm
    from skud s
    where s.inspector_name_norm <> ''
    union
    select w.work_date, w.inspector_name_norm
    from workday w
    where w.inspector_name_norm <> ''
  ),
  daily as (
    select
      k.work_date,
      coalesce(w.inspector_name, s.inspector_name, v.inspector_name, d.inspector_name, '') as inspector_name,
      k.inspector_name_norm,
      coalesce(nullif(d.division_label, ''), nullif(v.division_label, ''), nullif(s.division_name, ''), 'Не указано') as division_label,
      coalesce(v.monitorings, 0) as monitorings,
      w.open_time as workday_open_time,
      w.close_time as workday_close_time,
      w.open_coordinates,
      w.open_comment,
      w.close_coordinates,
      w.close_comment,
      w.source_kind as workday_source_kind,
      s.arrival_time,
      s.departure_time,
      s.total_minutes as skud_total_minutes,
      s.absence_reason,
      coalesce(s.is_registry_inspector, false) as is_registry_inspector,
      v.first_object_at,
      v.last_object_at,
      v.first_geo_distance_m,
      v.last_geo_distance_m
    from day_keys k
    left join visits v
      on v.work_date = k.work_date
     and v.inspector_name_norm = k.inspector_name_norm
    left join skud s
      on s.work_date = k.work_date
     and s.inspector_name_norm = k.inspector_name_norm
    left join workday w
      on w.work_date = k.work_date
     and w.inspector_name_norm = k.inspector_name_norm
    left join inspector_dir d
      on d.inspector_name_norm = k.inspector_name_norm
  ),
  scored as (
    select
      d.work_date,
      d.inspector_name,
      d.inspector_name_norm,
      d.division_label,
      d.monitorings,
      d.workday_open_time,
      d.workday_close_time,
      d.open_coordinates,
      d.open_comment,
      d.close_coordinates,
      d.close_comment,
      d.workday_source_kind,
      d.arrival_time,
      d.departure_time,
      d.absence_reason,
      d.is_registry_inspector,
      d.first_object_at,
      d.last_object_at,
      d.first_geo_distance_m,
      d.last_geo_distance_m,
      case
        when d.workday_open_time is not null then timezone('Europe/Moscow', d.work_date::timestamp + d.workday_open_time)
        when d.arrival_time is not null then timezone('Europe/Moscow', d.work_date::timestamp + d.arrival_time)
        else null
      end as arrival_at,
      case
        when d.workday_close_time is not null then timezone('Europe/Moscow', d.work_date::timestamp + d.workday_close_time)
        when d.departure_time is not null then timezone('Europe/Moscow', d.work_date::timestamp + d.departure_time)
        else null
      end as departure_at,
      d.skud_total_minutes
    from daily d
    where coalesce(nullif(btrim(d.inspector_name), ''), '') <> ''
  ),
  prepared as (
    select
      s.work_date,
      s.inspector_name,
      s.inspector_name_norm,
      s.division_label,
      s.monitorings,
      case
        when s.workday_open_time is not null then to_char(s.workday_open_time, 'HH24:MI')
        when s.arrival_time is not null then to_char(s.arrival_time, 'HH24:MI')
        else ''
      end as open_time,
      case
        when s.workday_close_time is not null then to_char(s.workday_close_time, 'HH24:MI')
        when s.departure_time is not null then to_char(s.departure_time, 'HH24:MI')
        else ''
      end as close_time,
      case
        when s.departure_at is not null and s.arrival_at is not null
             and s.departure_at >= greatest(s.arrival_at, timezone('Europe/Moscow', s.work_date::timestamp + time '08:00'))
          then floor(extract(epoch from s.departure_at - greatest(s.arrival_at, timezone('Europe/Moscow', s.work_date::timestamp + time '08:00'))) / 60.0)::integer
        when s.skud_total_minutes is not null then s.skud_total_minutes
        else null
      end as work_minutes,
      case
        when s.arrival_at is not null and s.first_object_at is not null
          then greatest(floor(extract(epoch from s.first_object_at - s.arrival_at) / 60.0)::integer, 0)
        else null
      end as from_office_minutes,
      case
        when s.departure_at is not null and s.last_object_at is not null
          then greatest(floor(extract(epoch from s.departure_at - s.last_object_at) / 60.0)::integer, 0)
        else null
      end as to_office_minutes,
      coalesce(s.first_geo_distance_m, 0) as first_geo_distance_m,
      coalesce(s.last_geo_distance_m, 0) as last_geo_distance_m,
      s.open_comment,
      s.close_comment,
      coalesce(s.workday_source_kind, '') as workday_source_kind,
      case
        when s.arrival_time is not null or s.departure_time is not null
          then concat_ws(' / ',
            case when s.arrival_time is null then '—' else to_char(s.arrival_time, 'HH24:MI') end,
            case when s.departure_time is null then '—' else to_char(s.departure_time, 'HH24:MI') end
          )
        when nullif(btrim(s.absence_reason), '') is not null then s.absence_reason
        else 'Нет данных'
      end as skud_label,
      (s.arrival_time is not null or s.departure_time is not null or nullif(btrim(s.absence_reason), '') is not null) as skud_present
    from scored s
  ),
  finalized as (
    select
      p.*,
      (
        (p.from_office_minutes is not null and p.from_office_minutes > 130)
        or (p.to_office_minutes is not null and p.to_office_minutes > 130)
        or (p.work_minutes is not null and p.work_minutes < 540)
      ) as has_violation,
      concat_ws(' · ',
        case when p.from_office_minutes is not null and p.from_office_minutes > 130 then 'Из офиса до объекта: ' || public.mpro_minutes_to_hhmm(p.from_office_minutes) end,
        case when p.to_office_minutes is not null and p.to_office_minutes > 130 then 'До офиса после объекта: ' || public.mpro_minutes_to_hhmm(p.to_office_minutes) end,
        case when p.work_minutes is not null and p.work_minutes < 540 then 'Рабочее время: ' || public.mpro_minutes_to_hhmm(p.work_minutes) end,
        case when nullif(btrim(coalesce(p.open_comment, '')), '') is not null then 'Комментарий открытия: ' || btrim(p.open_comment) end,
        case when nullif(btrim(coalesce(p.close_comment, '')), '') is not null then 'Комментарий закрытия: ' || btrim(p.close_comment) end,
        case
          when greatest(coalesce(p.first_geo_distance_m, 0), coalesce(p.last_geo_distance_m, 0)) > 3000
            then concat_ws(' · ',
              case when coalesce(p.first_geo_distance_m, 0) > 3000 then 'Гео старта: ' || p.first_geo_distance_m::text || ' м' end,
              case when coalesce(p.last_geo_distance_m, 0) > 3000 then 'Гео финиша: ' || p.last_geo_distance_m::text || ' м' end
            )
        end
      ) as comment_text
    from prepared p
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'date', p.work_date::text,
        'dateDisplay', to_char(p.work_date, 'DD.MM.YYYY'),
        'inspector', p.inspector_name,
        'inspectorKey', p.inspector_name_norm,
        'division', p.division_label,
        'monitorings', p.monitorings,
        'openingText', coalesce(nullif(p.open_time, ''), '—'),
        'closingText', coalesce(nullif(p.close_time, ''), '—'),
        'workMinutes', p.work_minutes,
        'workdayPresent', (nullif(p.open_time, '') is not null or nullif(p.close_time, '') is not null),
        'workdaySource', p.workday_source_kind,
        'skudLabel', p.skud_label,
        'skudPresent', p.skud_present,
        'fromOfficeMinutes', p.from_office_minutes,
        'toOfficeMinutes', p.to_office_minutes,
        'hasViolation', p.has_violation,
        'commentText', coalesce(nullif(p.comment_text, ''), '—')
      )
      order by p.work_date desc, p.division_label, p.inspector_name
    ),
    '[]'::jsonb
  )
  into v_daily_rows
  from finalized p;

  with skud_period_dates as (
    select distinct s.work_date
    from public.mpro_skud_daily s
    where s.work_date between v_date_from and v_date_to
  ),
  expected_dates as (
    select gs::date as work_date
    from generate_series(v_date_from::timestamp, v_date_to::timestamp, interval '1 day') gs
    where extract(isodow from gs) between 1 and 5
  ),
  missing as (
    select e.work_date
    from expected_dates e
    left join skud_period_dates s on s.work_date = e.work_date
    where s.work_date is null
    order by e.work_date
  )
  select
    coalesce((select jsonb_agg(work_date::text order by work_date) from skud_period_dates), '[]'::jsonb),
    coalesce((select jsonb_agg(work_date::text order by work_date) from missing), '[]'::jsonb),
    (select count(*) from expected_dates),
    (select count(*) from skud_period_dates)
  into v_skud_dates, v_missing_dates, v_expected_days, v_loaded_days;

  with workday_period_dates as (
    select distinct work_date
    from public.mpro_workday w
    where w.work_date between v_date_from and v_date_to
      and w.open_at is not null
      and w.close_at is not null
  ),
  expected_dates as (
    select distinct a.monitoring_date as work_date
    from public.sf_archive_monitoring a
    where a.monitoring_date between v_date_from and v_date_to
      and coalesce(a.visit_status, 'completed') = 'completed'
  ),
  missing as (
    select e.work_date
    from expected_dates e
    left join workday_period_dates w on w.work_date = e.work_date
    where w.work_date is null
    order by e.work_date
  )
  select
    coalesce((select jsonb_agg(work_date::text order by work_date) from workday_period_dates), '[]'::jsonb),
    coalesce((select jsonb_agg(work_date::text order by work_date) from missing), '[]'::jsonb),
    (select count(*) from expected_dates),
    (select count(*) from workday_period_dates)
  into v_workday_dates, v_workday_missing_dates, v_workday_expected_days, v_workday_loaded_days;

  select jsonb_build_object(
    'fileName', coalesce(i.file_name, ''),
    'importedAt', public.sf_iso_utc(i.imported_at),
    'periodFrom', case when i.period_from is null then '' else i.period_from::text end,
    'periodTo', case when i.period_to is null then '' else i.period_to::text end,
    'rowCount', coalesce(i.row_count, 0)
  )
  into v_latest_import
  from public.mpro_skud_imports i
  order by i.imported_at desc, i.import_id desc
  limit 1;

  select jsonb_build_object(
    'fileName', '',
    'importedAt', public.sf_iso_utc(coalesce(i.updated_at, i.close_at, i.open_at, i.created_at)),
    'periodFrom', case when i.work_date is null then '' else i.work_date::text end,
    'periodTo', case when i.work_date is null then '' else i.work_date::text end,
    'rowCount', 1
  )
  into v_workday_latest_import
  from public.mpro_workday i
  where i.work_date between v_date_from and v_date_to
    and i.open_at is not null
  order by coalesce(i.updated_at, i.close_at, i.open_at, i.created_at) desc, i.work_date desc
  limit 1;

  if v_loaded_days <= 0 then
    v_status := 'missing';
    v_status_label := 'Отсутствует СКУД за период';
  elsif jsonb_array_length(v_missing_dates) > 0 then
    v_status := 'partial';
    v_status_label := 'СКУД загружен не за весь период';
  else
    v_status := 'ok';
    v_status_label := 'СКУД загружен за период';
  end if;

  if v_workday_loaded_days <= 0 then
    v_workday_status := 'missing';
    v_workday_status_label := 'Нет данных рабочего дня за период';
  elsif jsonb_array_length(v_workday_missing_dates) > 0 then
    v_workday_status := 'partial';
    v_workday_status_label := 'Рабочий день заполнен не за весь период';
  else
    v_workday_status := 'ok';
    v_workday_status_label := 'Рабочий день заполнен за период';
  end if;

  return jsonb_build_object(
    'periodFrom', v_date_from::text,
    'periodTo', v_date_to::text,
    'dailyRows', v_daily_rows,
    'skudStatus', jsonb_build_object(
      'status', v_status,
      'label', v_status_label,
      'expectedDays', v_expected_days,
      'loadedDays', v_loaded_days,
      'loadedDates', v_skud_dates,
      'missingDates', v_missing_dates,
      'latestImport', coalesce(v_latest_import, '{}'::jsonb)
    ),
    'workdayStatus', jsonb_build_object(
      'status', v_workday_status,
      'label', v_workday_status_label,
      'expectedDays', v_workday_expected_days,
      'loadedDays', v_workday_loaded_days,
      'loadedDates', v_workday_dates,
      'missingDates', v_workday_missing_dates,
      'latestImport', coalesce(v_workday_latest_import, '{}'::jsonb)
    ),
    'computedAt', public.sf_iso_utc(now())
  );
end;
$function$;

create or replace function api.mpro_import_skud_rows(p_session_token text, p_payload jsonb)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $function$
  select public.mpro_import_skud_rows($1, $2);
$function$;

create or replace function api.mpro_import_workday_rows(p_session_token text, p_payload jsonb)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $function$
  select public.mpro_import_workday_rows($1, $2);
$function$;

create or replace function api.mpro_get_work_control_dashboard(
  p_session_token text,
  p_date_from date default null,
  p_date_to date default null
)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $function$
  select public.mpro_get_work_control_dashboard($1, $2, $3);
$function$;

grant execute on function public.mpro_import_skud_rows(text, jsonb) to anon, authenticated;
grant execute on function public.mpro_import_workday_rows(text, jsonb) to anon, authenticated;
grant execute on function public.mpro_get_work_control_dashboard(text, date, date) to anon, authenticated;
grant execute on function api.mpro_import_skud_rows(text, jsonb) to anon, authenticated;
grant execute on function api.mpro_import_workday_rows(text, jsonb) to anon, authenticated;
grant execute on function api.mpro_get_work_control_dashboard(text, date, date) to anon, authenticated;

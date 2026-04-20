begin;

update public.sf_archive_monitoring a
set
  monitoring_date = timezone('Europe/Moscow', coalesce(a.exit_at, a.updated_at, a.entry_at, a.created_at))::date,
  visit_date = timezone('Europe/Moscow', coalesce(a.exit_at, a.updated_at, a.entry_at, a.created_at))::date
where (
    a.monitoring_date between date '2026-04-16' and date '2026-04-20'
    or timezone('Europe/Moscow', coalesce(a.exit_at, a.updated_at, a.entry_at, a.created_at))::date between date '2026-04-16' and date '2026-04-20'
  )
  and timezone('Europe/Moscow', coalesce(a.exit_at, a.updated_at, a.entry_at, a.created_at))::date <> a.monitoring_date;

commit;

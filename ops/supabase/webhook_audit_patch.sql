alter table if exists public.sf_edit_logs
  add column if not exists source_type text not null default 'app';

alter table if exists public.sf_edit_logs
  add column if not exists source_key text not null default '';

update public.sf_edit_logs
set source_type = 'app'
where coalesce(source_type, '') = '';

create index if not exists sf_edit_logs_lookup_idx
  on public.sf_edit_logs(field_id, uin, created_at desc);

create index if not exists sf_edit_logs_source_idx
  on public.sf_edit_logs(source_type, source_key, created_at desc);

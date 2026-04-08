-- Lock down raw public data tables so they are no longer directly readable via
-- the Supabase Data API. The frontend must use RPC functions only.

begin;

alter table if exists public.objects enable row level security;
alter table if exists public.sm enable row level security;
alter table if exists public.ppr enable row level security;
alter table if exists public.suid enable row level security;
alter table if exists public.lb enable row level security;
alter table if exists public.mgz enable row level security;
alter table if exists public.ksg enable row level security;

revoke all on public.objects from anon, authenticated;
revoke all on public.sm from anon, authenticated;
revoke all on public.ppr from anon, authenticated;
revoke all on public.suid from anon, authenticated;
revoke all on public.lb from anon, authenticated;
revoke all on public.mgz from anon, authenticated;
revoke all on public.ksg from anon, authenticated;

do $$
begin
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'objects_full'
      and c.relkind in ('r', 'p')
  ) then
    execute 'alter table public.objects_full enable row level security';
    execute 'revoke all on public.objects_full from anon, authenticated';
  end if;

  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'objects_full'
      and c.relkind = 'v'
  ) then
    execute 'revoke all on public.objects_full from anon, authenticated';
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;

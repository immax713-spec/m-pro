create table if not exists public.sf_data_state (
  scope text primary key,
  version bigint not null default 1,
  updated_at timestamptz not null default now()
);

insert into public.sf_data_state(scope, version, updated_at)
values ('global', 1, now())
on conflict (scope) do nothing;

alter table public.sf_data_state enable row level security;
revoke all on public.sf_data_state from anon, authenticated;

create or replace function public.sf_bump_data_state()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_version bigint;
begin
  insert into public.sf_data_state(scope, version, updated_at)
  values ('global', 1, now())
  on conflict (scope) do update
  set
    version = public.sf_data_state.version + 1,
    updated_at = now()
  returning version into v_version;

  return coalesce(v_version, 1);
end;
$$;

create or replace function public.sf_touch_data_state_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sf_bump_data_state();
  return null;
end;
$$;

drop trigger if exists sf_touch_objects_data_state on public.objects;
create trigger sf_touch_objects_data_state
after insert or update or delete on public.objects
for each statement execute function public.sf_touch_data_state_trigger();

drop trigger if exists sf_touch_sm_data_state on public.sm;
create trigger sf_touch_sm_data_state
after insert or update or delete on public.sm
for each statement execute function public.sf_touch_data_state_trigger();

drop trigger if exists sf_touch_ppr_data_state on public.ppr;
create trigger sf_touch_ppr_data_state
after insert or update or delete on public.ppr
for each statement execute function public.sf_touch_data_state_trigger();

drop trigger if exists sf_touch_suid_data_state on public.suid;
create trigger sf_touch_suid_data_state
after insert or update or delete on public.suid
for each statement execute function public.sf_touch_data_state_trigger();

drop trigger if exists sf_touch_lb_data_state on public.lb;
create trigger sf_touch_lb_data_state
after insert or update or delete on public.lb
for each statement execute function public.sf_touch_data_state_trigger();

drop trigger if exists sf_touch_mgz_data_state on public.mgz;
create trigger sf_touch_mgz_data_state
after insert or update or delete on public.mgz
for each statement execute function public.sf_touch_data_state_trigger();

drop trigger if exists sf_touch_ksg_data_state on public.ksg;
create trigger sf_touch_ksg_data_state
after insert or update or delete on public.ksg
for each statement execute function public.sf_touch_data_state_trigger();

create or replace function public.sf_get_data_bundle(
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
  v_version bigint := 0;
  v_updated_at timestamptz := now();
  v_ksg_field_ids text[] := '{}'::text[];
  v_object_ids bigint[] := '{}'::bigint[];
  v_rows jsonb := '[]'::jsonb;
begin
  select * into v_user from public.sf_require_session(p_session_token) limit 1;

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
      'fetchedAt', public.sf_iso_utc(v_updated_at),
      'currentUser', public.sf_build_user_json(v_user.name, v_user.role, v_user.division)
    );
  end if;

  select coalesce(
    array_agg(field_id order by ksg_group, ksg_index),
    '{}'::text[]
  )
  into v_ksg_field_ids
  from (
    select distinct
      ksg_group,
      ksg_index,
      format('ksg_%s_%s', ksg_group, ksg_index) as field_id
    from public.ksg
    where object_id > 1
  ) ksg_fields;

  with all_object_ids as (
    select object_id from public.objects where object_id > 1
    union
    select object_id from public.sm where object_id > 1
    union
    select object_id from public.ppr where object_id > 1
    union
    select object_id from public.suid where object_id > 1
    union
    select object_id from public.lb where object_id > 1
    union
    select object_id from public.mgz where object_id > 1
    union
    select distinct object_id from public.ksg where object_id > 1
  )
  select coalesce(array_agg(object_id order by object_id), '{}'::bigint[])
  into v_object_ids
  from all_object_ids;

  with ordered_object_ids as (
    select ids.object_id
    from unnest(v_object_ids) as ids(object_id)
  ),
  ksg_map as (
    select
      k.object_id,
      jsonb_object_agg(
        format('ksg_%s_%s', k.ksg_group, k.ksg_index),
        coalesce(k.value, '')
      ) as values_map
    from public.ksg k
    where k.object_id = any(v_object_ids)
    group by k.object_id
  )
  select coalesce(
    jsonb_agg(
      to_jsonb(
        array[
          coalesce(o.ro_1_1, ''),
          coalesce(o.ro_1_2, ''),
          coalesce(o.ro_1_3, ''),
          coalesce(o.ro_1_4, ''),
          coalesce(o.ro_1_5, ''),
          coalesce(o.ro_1_6, ''),
          coalesce(o.ro_1_7, ''),
          coalesce(o.ro_1_8, ''),
          coalesce(o.ro_1_9, ''),
          coalesce(o.ro_1_10, ''),
          coalesce(o.ro_1_11, ''),
          coalesce(o.ro_1_12, ''),
          coalesce(o.ro_1_13, ''),
          coalesce(sm.sm_1_1, ''),
          coalesce(sm.sm_1_2, ''),
          coalesce(sm.sm_1_3, ''),
          coalesce(sm.sm_1_4, ''),
          coalesce(sm.sm_1_5, ''),
          coalesce(sm.sm_1_10, ''),
          coalesce(sm.sm_1_6, ''),
          coalesce(sm.sm_1_9, ''),
          coalesce(sm.sm_1_7, ''),
          coalesce(sm.sm_1_8, '')
        ]::text[]
        || coalesce(
          array(
            select coalesce(ksg_map.values_map ->> kf.field_id, '')
            from unnest(v_ksg_field_ids) as kf(field_id)
          ),
          '{}'::text[]
        )
        || array[
          coalesce(su.suid_1_1, ''),
          coalesce(su.suid_1_2, ''),
          coalesce(su.suid_1_3, ''),
          coalesce(su.suid_2_1, ''),
          coalesce(su.suid_2_2, ''),
          coalesce(su.suid_2_3, ''),
          coalesce(su.suid_3_1, ''),
          coalesce(su.suid_3_2, ''),
          coalesce(su.suid_3_3, ''),
          coalesce(su.suid_4_1, ''),
          coalesce(su.suid_4_2, ''),
          coalesce(su.suid_4_3, ''),
          coalesce(su.suid_5_1, ''),
          coalesce(su.suid_5_2, ''),
          coalesce(su.suid_5_3, ''),
          coalesce(su.suid_5_4, ''),
          coalesce(su.suid_5_5, ''),
          coalesce(lb.lb_1_1, ''),
          coalesce(lb.lb_1_2, ''),
          coalesce(lb.lb_1_3, ''),
          coalesce(lb.lb_1_4, ''),
          coalesce(lb.lb_1_5, ''),
          coalesce(lb.lb_1_6, ''),
          coalesce(lb.lb_1_7, ''),
          coalesce(lb.lb_1_8, ''),
          coalesce(lb.lb_1_9, ''),
          coalesce(lb.lb_1_10, ''),
          coalesce(lb.lb_1_11, ''),
          coalesce(lb.lb_1_12, ''),
          coalesce(ppr.ppr_1_1, ''),
          coalesce(ppr.ppr_1_2, ''),
          coalesce(ppr.ppr_1_3, ''),
          coalesce(ppr.ppr_1_8, ''),
          coalesce(ppr.ppr_1_4, ''),
          coalesce(ppr.ppr_1_5, ''),
          coalesce(ppr.ppr_1_6, ''),
          coalesce(ppr.ppr_1_7, ''),
          coalesce(mgz.mgz_1_3, ''),
          coalesce(mgz.mgz_1_1, ''),
          coalesce(mgz.mgz_1_2, ''),
          coalesce(mgz.mgz_1_4, ''),
          coalesce(mgz.mgz_1_5, ''),
          coalesce(mgz.mgz_1_6, ''),
          coalesce(mgz.mgz_1_7, '')
        ]::text[]
      )
      order by ids.object_id
    ),
    '[]'::jsonb
  )
  into v_rows
  from ordered_object_ids ids
  left join public.objects o on o.object_id = ids.object_id
  left join public.sm sm on sm.object_id = ids.object_id
  left join public.suid su on su.object_id = ids.object_id
  left join public.lb lb on lb.object_id = ids.object_id
  left join public.ppr ppr on ppr.object_id = ids.object_id
  left join public.mgz mgz on mgz.object_id = ids.object_id
  left join ksg_map on ksg_map.object_id = ids.object_id;

  return jsonb_build_object(
    'changed', true,
    'version', v_version,
    'fetchedAt', public.sf_iso_utc(now()),
    'currentUser', public.sf_build_user_json(v_user.name, v_user.role, v_user.division),
    'ksgFieldIds', to_jsonb(v_ksg_field_ids),
    'objectIds', to_jsonb(v_object_ids),
    'rows', v_rows,
    'totalRows', coalesce(array_length(v_object_ids, 1), 0)
  );
end;
$$;

grant execute on function public.sf_get_data_bundle(text, bigint) to anon, authenticated;

do $$
begin
  perform public.sf_bump_data_state();
end;
$$;

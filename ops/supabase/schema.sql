create extension if not exists pgcrypto;

create table if not exists public.objects (
  object_id bigint primary key,
  ro_1_1 text,
  ro_1_2 text,
  ro_1_3 text,
  ro_1_4 text,
  ro_1_5 text,
  ro_1_6 text,
  ro_1_7 text,
  ro_1_8 text,
  ro_1_9 text,
  ro_1_10 text,
  ro_1_11 text,
  ro_1_12 text,
  ro_1_13 text
);

create table if not exists public.sm (
  object_id bigint primary key,
  sm_1_1 text,
  sm_1_2 text,
  sm_1_3 text,
  sm_1_4 text,
  sm_1_5 text,
  sm_1_10 text,
  sm_1_6 text,
  sm_1_9 text,
  sm_1_7 text,
  sm_1_8 text
);

create unique index if not exists sm_object_id_uidx
  on public.sm(object_id);

create table if not exists public.ppr (
  object_id bigint primary key,
  ppr_1_1 text,
  ppr_1_2 text,
  ppr_1_3 text,
  ppr_1_8 text,
  ppr_1_4 text,
  ppr_1_5 text,
  ppr_1_6 text,
  ppr_1_7 text
);

create unique index if not exists ppr_object_id_uidx
  on public.ppr(object_id);

create table if not exists public.suid (
  object_id bigint primary key,
  suid_1_1 text,
  suid_1_2 text,
  suid_1_3 text,
  suid_2_1 text,
  suid_2_2 text,
  suid_2_3 text,
  suid_3_1 text,
  suid_3_2 text,
  suid_3_3 text,
  suid_4_1 text,
  suid_4_2 text,
  suid_4_3 text,
  suid_5_1 text,
  suid_5_2 text,
  suid_5_3 text,
  suid_5_4 text,
  suid_5_5 text
);

create unique index if not exists suid_object_id_uidx
  on public.suid(object_id);

create table if not exists public.lb (
  object_id bigint primary key,
  lb_1_1 text,
  lb_1_2 text,
  lb_1_3 text,
  lb_1_4 text,
  lb_1_5 text,
  lb_1_6 text,
  lb_1_7 text,
  lb_1_8 text,
  lb_1_9 text,
  lb_1_10 text,
  lb_1_11 text,
  lb_1_12 text
);

create unique index if not exists lb_object_id_uidx
  on public.lb(object_id);

alter table public.lb add column if not exists lb_1_1 text;
alter table public.lb add column if not exists lb_1_2 text;
alter table public.lb add column if not exists lb_1_3 text;
alter table public.lb add column if not exists lb_1_4 text;
alter table public.lb add column if not exists lb_1_5 text;
alter table public.lb add column if not exists lb_1_6 text;
alter table public.lb add column if not exists lb_1_7 text;
alter table public.lb add column if not exists lb_1_8 text;
alter table public.lb add column if not exists lb_1_9 text;
alter table public.lb add column if not exists lb_1_10 text;
alter table public.lb add column if not exists lb_1_11 text;
alter table public.lb add column if not exists lb_1_12 text;

create table if not exists public.mgz (
  object_id bigint primary key,
  mgz_1_3 text,
  mgz_1_1 text,
  mgz_1_2 text,
  mgz_1_4 text,
  mgz_1_5 text,
  mgz_1_6 text,
  mgz_1_7 text
);

create unique index if not exists mgz_object_id_uidx
  on public.mgz(object_id);

create table if not exists public.ksg (
  object_id bigint not null,
  ksg_group integer not null,
  ksg_index integer not null,
  value text,
  primary key (object_id, ksg_group, ksg_index)
);

create unique index if not exists ksg_object_id_group_index_uidx
  on public.ksg(object_id, ksg_group, ksg_index);

create table if not exists public.sf_users (
  id bigserial primary key,
  name text not null,
  login text not null default '',
  password_hash text not null,
  role text not null default 'Пользователь',
  division text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.sf_users add column if not exists login text not null default '';

create unique index if not exists sf_users_login_unique_idx
  on public.sf_users ((lower(btrim(login))))
  where btrim(login) <> '';

create table if not exists public.sf_sessions (
  token text primary key,
  user_id bigint not null references public.sf_users(id) on delete cascade,
  remember boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists public.sf_shared_selections (
  id text primary key,
  scope text not null,
  owner_key text not null,
  owner_name text not null,
  name text not null,
  meta text not null default '',
  object_query text not null default '',
  bulk_uin_text text not null default '',
  registry_facet_filters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sf_shared_selections_scope_owner_idx
  on public.sf_shared_selections(scope, owner_key, updated_at desc);

create unique index if not exists objects_uin_unique_idx
  on public.objects(ro_1_3)
  where ro_1_3 is not null
    and btrim(ro_1_3) <> ''
    and btrim(ro_1_3) <> 'Н/Д';

create table if not exists public.sf_shared_selection_work (
  id bigserial primary key,
  selection_id text not null references public.sf_shared_selections(id) on delete cascade,
  block_key text not null,
  block_name text not null,
  object_key text not null,
  object_key_norm text not null,
  uin text not null default '',
  status text not null default '',
  assignee_key text not null default '',
  assignee_name text not null default '',
  updated_at timestamptz not null default now(),
  updated_by text not null default ''
);

create unique index if not exists sf_shared_selection_work_unique_idx
  on public.sf_shared_selection_work(selection_id, block_key, object_key_norm);

create table if not exists public.sf_edit_logs (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  source_type text not null default 'app',
  source_key text not null default '',
  user_name text not null default '',
  role text not null default '',
  division text not null default '',
  uin text not null default '',
  field_id text not null default '',
  field_label text not null default '',
  old_value text not null default '',
  new_value text not null default ''
);

create index if not exists sf_edit_logs_lookup_idx
  on public.sf_edit_logs(field_id, uin, created_at desc);

create index if not exists sf_edit_logs_source_idx
  on public.sf_edit_logs(source_type, source_key, created_at desc);

grant select on public.objects, public.sm, public.ppr, public.suid, public.lb, public.mgz, public.ksg
to anon, authenticated;

alter table public.sf_users enable row level security;
alter table public.sf_sessions enable row level security;
alter table public.sf_shared_selections enable row level security;
alter table public.sf_shared_selection_work enable row level security;
alter table public.sf_edit_logs enable row level security;

revoke all on public.sf_users from anon, authenticated;
revoke all on public.sf_sessions from anon, authenticated;
revoke all on public.sf_shared_selections from anon, authenticated;
revoke all on public.sf_shared_selection_work from anon, authenticated;
revoke all on public.sf_edit_logs from anon, authenticated;

create or replace function public.sf_normalize_text(p_value text)
returns text
language sql
immutable
as $$
  select lower(trim(coalesce(p_value, '')));
$$;

create or replace function public.sf_user_key(p_name text, p_division text)
returns text
language sql
immutable
as $$
  select array_to_string(
    array_remove(
      array[
        nullif(public.sf_normalize_text(p_name), ''),
        nullif(public.sf_normalize_text(p_division), '')
      ],
      null
    ),
    '|'
  );
$$;

create or replace function public.sf_block_key(p_division text)
returns text
language sql
immutable
as $$
  select public.sf_normalize_text(p_division);
$$;

create or replace function public.sf_is_admin(p_role text, p_name text)
returns boolean
language sql
immutable
as $$
  select public.sf_normalize_text(p_role) like '%админ%'
    or public.sf_normalize_text(p_role) like '%admin%'
    or public.sf_normalize_text(p_name) like '%админ%'
    or public.sf_normalize_text(p_name) like '%admin%';
$$;

create or replace function public.sf_iso_utc(p_value timestamptz)
returns text
language sql
immutable
as $$
  select to_char(p_value at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
$$;

create or replace function public.sf_selection_scope(p_scope text)
returns text
language sql
immutable
as $$
  select case
    when public.sf_normalize_text(p_scope) = 'division' then 'division'
    else 'shared'
  end;
$$;

create or replace function public.sf_error_code_from_message(p_message text)
returns text
language sql
immutable
as $$
  select coalesce((regexp_match(coalesce(p_message, ''), '^([A-Z_]+):'))[1], '');
$$;

create or replace function public.sf_error_message_text(p_message text)
returns text
language sql
immutable
as $$
  select trim(regexp_replace(coalesce(p_message, ''), '^[A-Z_]+:\s*', ''));
$$;

create or replace function public.sf_build_user_json(
  p_name text,
  p_role text,
  p_division text,
  p_login_time timestamptz default now()
)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'name', coalesce(p_name, ''),
    'role', coalesce(p_role, ''),
    'division', coalesce(p_division, ''),
    'spreadsheetId', 'supabase',
    'loginTime', public.sf_iso_utc(p_login_time)
  );
$$;

create or replace function public.sf_require_session(p_session_token text)
returns table(user_id bigint, name text, role text, division text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if nullif(trim(coalesce(p_session_token, '')), '') is null then
    raise exception 'UNAUTHORIZED: Требуется авторизация';
  end if;

  delete from public.sf_sessions as s where s.expires_at <= now();

  return query
  select
    u.id,
    u.name,
    u.role,
    coalesce(u.division, ''),
    s.expires_at
  from public.sf_sessions s
  join public.sf_users u on u.id = s.user_id
  where s.token = trim(p_session_token)
    and s.expires_at > now()
    and coalesce(u.is_active, true);

  if not found then
    raise exception 'UNAUTHORIZED: Требуется авторизация';
  end if;
end;
$$;

create or replace function public.sf_can_access_selection(
  p_user_name text,
  p_user_role text,
  p_user_division text,
  p_scope text,
  p_owner_key text
)
returns boolean
language sql
immutable
as $$
  select case
    when public.sf_selection_scope(p_scope) = 'division'
      then nullif(public.sf_block_key(p_user_division), '') is not null
       and public.sf_block_key(p_user_division) = coalesce(p_owner_key, '')
    else true
  end;
$$;

create or replace function public.sf_can_mutate_selection(
  p_user_name text,
  p_user_role text,
  p_user_division text,
  p_scope text,
  p_owner_key text
)
returns boolean
language sql
immutable
as $$
  select case
    when public.sf_is_admin(p_user_role, p_user_name) then true
    when public.sf_selection_scope(p_scope) = 'division'
      then coalesce(p_owner_key, '') = public.sf_block_key(p_user_division)
    else coalesce(p_owner_key, '') = public.sf_user_key(p_user_name, p_user_division)
  end;
$$;

create or replace function public.sf_build_selection_view(
  p_id text,
  p_scope text,
  p_name text,
  p_meta text,
  p_object_query text,
  p_bulk_uin_text text,
  p_registry_facet_filters jsonb,
  p_owner_name text,
  p_created_at timestamptz,
  p_updated_at timestamptz,
  p_can_delete boolean
)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'id', coalesce(p_id, ''),
    'scope', public.sf_selection_scope(p_scope),
    'name', coalesce(p_name, ''),
    'meta', coalesce(p_meta, ''),
    'objectQuery', coalesce(p_object_query, ''),
    'bulkUinText', coalesce(p_bulk_uin_text, ''),
    'registryFacetFilters', coalesce(p_registry_facet_filters, '{}'::jsonb),
    'ownerName', coalesce(p_owner_name, ''),
    'createdAt', public.sf_iso_utc(coalesce(p_created_at, now())),
    'updatedAt', public.sf_iso_utc(coalesce(p_updated_at, now())),
    'canDelete', coalesce(p_can_delete, false)
  );
$$;

create or replace function public.sf_build_work_item_view(
  p_selection_id text,
  p_block_key text,
  p_block_name text,
  p_object_key text,
  p_uin text,
  p_status text,
  p_assignee_key text,
  p_assignee_name text,
  p_updated_at timestamptz,
  p_updated_by text
)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'selectionId', coalesce(p_selection_id, ''),
    'blockKey', coalesce(p_block_key, ''),
    'blockName', coalesce(p_block_name, ''),
    'objectKey', coalesce(p_object_key, ''),
    'uin', coalesce(p_uin, ''),
    'status', coalesce(p_status, ''),
    'assigneeKey', coalesce(p_assignee_key, ''),
    'assigneeName', coalesce(p_assignee_name, ''),
    'updatedAt', public.sf_iso_utc(coalesce(p_updated_at, now())),
    'updatedBy', coalesce(p_updated_by, '')
  );
$$;

create or replace function public.sf_get_session_user(p_session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user record;
begin
  select * into v_user from public.sf_require_session(p_session_token) limit 1;
  return jsonb_build_object(
    'user', public.sf_build_user_json(v_user.name, v_user.role, v_user.division),
    'expiresAt', public.sf_iso_utc(v_user.expires_at)
  );
end;
$$;

drop function if exists public.sf_auth(text, boolean);

create or replace function public.sf_auth(p_name text, p_password text, p_remember boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.sf_users%rowtype;
  v_token text;
  v_expires_at timestamptz;
begin
  if nullif(trim(coalesce(p_name, '')), '') is null then
    raise exception 'AUTH_INPUT: Логин или имя обязательны';
  end if;

  if nullif(trim(coalesce(p_password, '')), '') is null then
    raise exception 'AUTH_INPUT: Пароль обязателен';
  end if;

  delete from public.sf_sessions as s where s.expires_at <= now();

  select *
  into v_user
  from public.sf_users
  where coalesce(is_active, true)
    and (
      public.sf_normalize_text(name) = public.sf_normalize_text(p_name)
      or (
        nullif(trim(coalesce(login, '')), '') is not null
        and public.sf_normalize_text(login) = public.sf_normalize_text(p_name)
      )
    )
    and password_hash = extensions.crypt(p_password, password_hash)
  limit 1;

  if not found then
    raise exception 'AUTH_INVALID: Неверный логин или пароль';
  end if;

  v_token := replace(extensions.gen_random_uuid()::text, '-', '') || replace(extensions.gen_random_uuid()::text, '-', '');
  v_expires_at := now() + case when coalesce(p_remember, false) then interval '30 days' else interval '12 hours' end;

  insert into public.sf_sessions(token, user_id, remember, expires_at)
  values (v_token, v_user.id, coalesce(p_remember, false), v_expires_at);

  return jsonb_build_object(
    'success', true,
    'user', public.sf_build_user_json(v_user.name, v_user.role, v_user.division),
    'sessionToken', v_token,
    'expiresAt', public.sf_iso_utc(v_expires_at),
    'remember', coalesce(p_remember, false)
  );
end;
$$;
create or replace function public.sf_get_shared_selections(p_session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user record;
begin
  select * into v_user from public.sf_require_session(p_session_token) limit 1;

  return coalesce((
    select jsonb_agg(
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
    )
    from public.sf_shared_selections s
    where public.sf_can_access_selection(v_user.name, v_user.role, v_user.division, s.scope, s.owner_key)
  ), '[]'::jsonb);
end;
$$;

create or replace function public.sf_get_shared_selection_work_state(
  p_session_token text,
  p_selection_id text
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
begin
  select * into v_user from public.sf_require_session(p_session_token) limit 1;
  v_block_key := public.sf_block_key(v_user.division);
  v_block_name := coalesce(v_user.division, '');

  if nullif(trim(coalesce(p_selection_id, '')), '') is null or nullif(v_block_key, '') is null then
    return jsonb_build_object(
      'selectionId', coalesce(trim(p_selection_id), ''),
      'blockKey', coalesce(v_block_key, ''),
      'blockName', v_block_name,
      'items', '[]'::jsonb
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
      'items', '[]'::jsonb
    );
  end if;

  return jsonb_build_object(
    'selectionId', trim(p_selection_id),
    'blockKey', v_block_key,
    'blockName', v_block_name,
    'items', coalesce((
      select jsonb_agg(
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
      )
      from public.sf_shared_selection_work w
      where w.selection_id = trim(p_selection_id)
        and w.block_key = v_block_key
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.sf_save_shared_selection(
  p_session_token text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user record;
  v_scope text;
  v_owner_key text;
  v_owner_name text;
  v_selection_id text;
  v_requested_id text;
  v_name text;
  v_meta text;
  v_object_query text;
  v_bulk_uin_text text;
  v_filters jsonb;
  v_target public.sf_shared_selections%rowtype;
  v_now timestamptz := now();
begin
  select * into v_user from public.sf_require_session(p_session_token) limit 1;

  v_requested_id := trim(coalesce(p_payload ->> 'selectionId', ''));
  v_scope := public.sf_selection_scope(p_payload ->> 'scope');
  v_name := trim(coalesce(p_payload ->> 'name', ''));
  v_meta := coalesce(p_payload ->> 'meta', '');
  v_object_query := coalesce(p_payload ->> 'objectQuery', '');
  v_bulk_uin_text := coalesce(p_payload ->> 'bulkUinText', '');
  v_filters := coalesce(p_payload -> 'registryFacetFilters', '{}'::jsonb);

  if v_name = '' then
    raise exception 'BAD_INPUT: Укажите название выборки';
  end if;

  if v_scope = 'division' then
    v_owner_key := public.sf_block_key(v_user.division);
    v_owner_name := coalesce(v_user.division, '');
    if v_owner_key = '' then
      raise exception 'BAD_INPUT: У пользователя не указан блок';
    end if;
  else
    v_owner_key := public.sf_user_key(v_user.name, v_user.division);
    v_owner_name := v_user.name;
  end if;

  if v_requested_id <> '' then
    select *
    into v_target
    from public.sf_shared_selections
    where id = v_requested_id
    limit 1;
  else
    select *
    into v_target
    from public.sf_shared_selections
    where scope = v_scope
      and owner_key = v_owner_key
      and public.sf_normalize_text(name) = public.sf_normalize_text(v_name)
    limit 1;
  end if;

  if found and not public.sf_can_mutate_selection(v_user.name, v_user.role, v_user.division, v_target.scope, v_target.owner_key) then
    raise exception 'FORBIDDEN: Эту выборку может изменять только разрешенный пользователь или администратор';
  end if;

  if found then
    update public.sf_shared_selections
    set
      scope = v_scope,
      owner_key = v_owner_key,
      owner_name = v_owner_name,
      name = v_name,
      meta = v_meta,
      object_query = v_object_query,
      bulk_uin_text = v_bulk_uin_text,
      registry_facet_filters = v_filters,
      updated_at = v_now
    where id = v_target.id;

    v_selection_id := v_target.id;
  else
    v_selection_id := case
      when v_scope = 'division' then 'division_'
      else 'shared_'
    end || replace(extensions.gen_random_uuid()::text, '-', '');

    insert into public.sf_shared_selections(
      id,
      scope,
      owner_key,
      owner_name,
      name,
      meta,
      object_query,
      bulk_uin_text,
      registry_facet_filters,
      created_at,
      updated_at
    )
    values (
      v_selection_id,
      v_scope,
      v_owner_key,
      v_owner_name,
      v_name,
      v_meta,
      v_object_query,
      v_bulk_uin_text,
      v_filters,
      v_now,
      v_now
    );
  end if;

  select *
  into v_target
  from public.sf_shared_selections
  where id = v_selection_id
  limit 1;

  return jsonb_build_object(
    'item',
    public.sf_build_selection_view(
      v_target.id,
      v_target.scope,
      v_target.name,
      v_target.meta,
      v_target.object_query,
      v_target.bulk_uin_text,
      v_target.registry_facet_filters,
      v_target.owner_name,
      v_target.created_at,
      v_target.updated_at,
      public.sf_can_mutate_selection(v_user.name, v_user.role, v_user.division, v_target.scope, v_target.owner_key)
    )
  );
end;
$$;

create or replace function public.sf_save_shared_selection_work_state(
  p_session_token text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user record;
  v_selection public.sf_shared_selections%rowtype;
  v_selection_id text := trim(coalesce(p_payload ->> 'selectionId', ''));
  v_object_key text := trim(coalesce(p_payload ->> 'objectKey', ''));
  v_uin text := trim(coalesce(p_payload ->> 'uin', ''));
  v_action text := public.sf_normalize_text(p_payload ->> 'action');
  v_block_key text;
  v_block_name text;
  v_user_key text;
  v_now timestamptz := now();
  v_existing public.sf_shared_selection_work%rowtype;
  v_result public.sf_shared_selection_work%rowtype;
begin
  select * into v_user from public.sf_require_session(p_session_token) limit 1;
  v_block_key := public.sf_block_key(v_user.division);
  v_block_name := coalesce(v_user.division, '');
  v_user_key := public.sf_user_key(v_user.name, v_user.division);

  if v_selection_id = '' or v_object_key = '' or v_action = '' then
    raise exception 'BAD_INPUT: Недостаточно данных для изменения статуса объекта';
  end if;
  if v_block_key = '' then
    raise exception 'BAD_INPUT: У пользователя не указан блок';
  end if;

  select *
  into v_selection
  from public.sf_shared_selections
  where id = v_selection_id
  limit 1;

  if not found then
    raise exception 'BAD_INPUT: Выборка не найдена';
  end if;
  if not public.sf_can_access_selection(v_user.name, v_user.role, v_user.division, v_selection.scope, v_selection.owner_key) then
    raise exception 'FORBIDDEN: Выборка недоступна';
  end if;

  select *
  into v_existing
  from public.sf_shared_selection_work
  where selection_id = v_selection_id
    and block_key = v_block_key
    and object_key_norm = public.sf_normalize_text(v_object_key)
  for update;

  if v_action in ('take', 'done') then
    if found and coalesce(v_existing.assignee_key, '') <> '' and coalesce(v_existing.assignee_key, '') <> v_user_key then
      raise exception 'WORK_BUSY: Объект уже обрабатывает %', coalesce(v_existing.assignee_name, 'другой пользователь');
    end if;

    insert into public.sf_shared_selection_work(
      selection_id,
      block_key,
      block_name,
      object_key,
      object_key_norm,
      uin,
      status,
      assignee_key,
      assignee_name,
      updated_at,
      updated_by
    )
    values (
      v_selection_id,
      v_block_key,
      v_block_name,
      v_object_key,
      public.sf_normalize_text(v_object_key),
      coalesce(nullif(v_uin, ''), coalesce(v_existing.uin, '')),
      case when v_action = 'done' then 'done' else 'in_progress' end,
      v_user_key,
      v_user.name,
      v_now,
      v_user.name
    )
    on conflict (selection_id, block_key, object_key_norm) do update
    set
      block_name = excluded.block_name,
      object_key = excluded.object_key,
      uin = excluded.uin,
      status = excluded.status,
      assignee_key = excluded.assignee_key,
      assignee_name = excluded.assignee_name,
      updated_at = excluded.updated_at,
      updated_by = excluded.updated_by
    returning * into v_result;

    return jsonb_build_object(
      'selectionId', v_selection_id,
      'blockKey', v_block_key,
      'blockName', v_block_name,
      'item', public.sf_build_work_item_view(
        v_result.selection_id,
        v_result.block_key,
        v_result.block_name,
        v_result.object_key,
        v_result.uin,
        v_result.status,
        v_result.assignee_key,
        v_result.assignee_name,
        v_result.updated_at,
        v_result.updated_by
      )
    );
  end if;

  if v_action = 'release' then
    if found and coalesce(v_existing.assignee_key, '') <> '' and coalesce(v_existing.assignee_key, '') <> v_user_key then
      raise exception 'WORK_BUSY: Объект уже обрабатывает %', coalesce(v_existing.assignee_name, 'другой пользователь');
    end if;

    delete from public.sf_shared_selection_work
    where selection_id = v_selection_id
      and block_key = v_block_key
      and object_key_norm = public.sf_normalize_text(v_object_key);

    return jsonb_build_object(
      'selectionId', v_selection_id,
      'blockKey', v_block_key,
      'blockName', v_block_name,
      'item', public.sf_build_work_item_view(
        v_selection_id,
        v_block_key,
        v_block_name,
        v_object_key,
        coalesce(nullif(v_uin, ''), coalesce(v_existing.uin, '')),
        '',
        '',
        '',
        v_now,
        v_user.name
      )
    );
  end if;

  raise exception 'BAD_INPUT: Неизвестное действие';
end;
$$;

create or replace function public.sf_save_shared_selection_work_batch(
  p_session_token text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_selection_id text := trim(coalesce(p_payload ->> 'selectionId', ''));
  v_action text := public.sf_normalize_text(p_payload ->> 'action');
  v_items jsonb := coalesce(p_payload -> 'items', '[]'::jsonb);
  v_user record;
  v_block_key text;
  v_block_name text;
  v_item jsonb;
  v_result jsonb;
  v_updated_items jsonb := '[]'::jsonb;
  v_skipped jsonb := '[]'::jsonb;
  v_requested_count integer := 0;
  v_updated_count integer := 0;
  v_skipped_count integer := 0;
  v_message text;
  v_code text;
  v_clean_message text;
begin
  select * into v_user from public.sf_require_session(p_session_token) limit 1;
  v_block_key := public.sf_block_key(v_user.division);
  v_block_name := coalesce(v_user.division, '');

  if v_selection_id = '' or v_action = '' then
    raise exception 'BAD_INPUT: Недостаточно данных для пакетного изменения статусов';
  end if;

  for v_item in select value from jsonb_array_elements(v_items)
  loop
    v_requested_count := v_requested_count + 1;
    begin
      v_result := public.sf_save_shared_selection_work_state(
        p_session_token,
        jsonb_build_object(
          'selectionId', v_selection_id,
          'objectKey', trim(coalesce(v_item ->> 'objectKey', '')),
          'uin', trim(coalesce(v_item ->> 'uin', '')),
          'action', v_action
        )
      );
      v_updated_items := v_updated_items || jsonb_build_array(v_result -> 'item');
      v_updated_count := v_updated_count + 1;
    exception when others then
      v_message := SQLERRM;
      v_code := public.sf_error_code_from_message(v_message);
      v_clean_message := public.sf_error_message_text(v_message);
      v_skipped := v_skipped || jsonb_build_array(
        jsonb_build_object(
          'objectKey', trim(coalesce(v_item ->> 'objectKey', '')),
          'uin', trim(coalesce(v_item ->> 'uin', '')),
          'code', coalesce(nullif(v_code, ''), 'ERROR'),
          'message', coalesce(nullif(v_clean_message, ''), 'Не удалось обработать объект'),
          'assigneeName', ''
        )
      );
      v_skipped_count := v_skipped_count + 1;
    end;
  end loop;

  return jsonb_build_object(
    'selectionId', v_selection_id,
    'blockKey', v_block_key,
    'blockName', v_block_name,
    'action', v_action,
    'requestedCount', v_requested_count,
    'updatedCount', v_updated_count,
    'skippedCount', v_skipped_count,
    'updatedItems', v_updated_items,
    'skipped', v_skipped
  );
end;
$$;

create or replace function public.sf_delete_shared_selection(
  p_session_token text,
  p_selection_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user record;
  v_target public.sf_shared_selections%rowtype;
begin
  select * into v_user from public.sf_require_session(p_session_token) limit 1;

  if nullif(trim(coalesce(p_selection_id, '')), '') is null then
    raise exception 'BAD_INPUT: Не указан идентификатор выборки';
  end if;

  select *
  into v_target
  from public.sf_shared_selections
  where id = trim(p_selection_id)
  limit 1;

  if not found then
    return jsonb_build_object('deleted', false, 'selectionId', trim(p_selection_id));
  end if;

  if not public.sf_can_mutate_selection(v_user.name, v_user.role, v_user.division, v_target.scope, v_target.owner_key) then
    raise exception 'FORBIDDEN: Удалять эту выборку может только разрешенный пользователь или администратор';
  end if;

  delete from public.sf_shared_selections where id = v_target.id;

  return jsonb_build_object('deleted', true, 'selectionId', v_target.id);
end;
$$;
create or replace function public.sf_assert_admin(p_session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user record;
begin
  select * into v_user from public.sf_require_session(p_session_token) limit 1;
  if not public.sf_is_admin(v_user.role, v_user.name) then
    raise exception 'FORBIDDEN: Недостаточно прав для редактирования реестра';
  end if;
  return jsonb_build_object(
    'name', v_user.name,
    'role', v_user.role,
    'division', v_user.division
  );
end;
$$;

create or replace function public.sf_target_table_for_field(p_field_id text)
returns text
language plpgsql
immutable
as $$
begin
  if p_field_id ~ '^ro_\d+_\d+$' then return 'objects'; end if;
  if p_field_id ~ '^sm_\d+_\d+$' then return 'sm'; end if;
  if p_field_id ~ '^ppr_\d+_\d+$' then return 'ppr'; end if;
  if p_field_id ~ '^suid_\d+_\d+$' then return 'suid'; end if;
  if p_field_id ~ '^lb_\d+_\d+$' then return 'lb'; end if;
  if p_field_id ~ '^mgz_\d+_\d+$' then return 'mgz'; end if;
  if p_field_id ~ '^ksg_\d+_\d+$' then return 'ksg'; end if;
  return '';
end;
$$;

create or replace function public.sf_delete_registry_rows(
  p_session_token text,
  p_object_ids jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted bigint[] := '{}';
  v_object_id bigint;
begin
  perform public.sf_assert_admin(p_session_token);

  for v_object_id in
    select distinct value::bigint
    from jsonb_array_elements_text(coalesce(p_object_ids, '[]'::jsonb))
    where value ~ '^\d+$'
  loop
    if v_object_id <= 1 then
      continue;
    end if;

    delete from public.ksg where object_id = v_object_id;
    delete from public.mgz where object_id = v_object_id;
    delete from public.lb where object_id = v_object_id;
    delete from public.suid where object_id = v_object_id;
    delete from public.ppr where object_id = v_object_id;
    delete from public.sm where object_id = v_object_id;
    delete from public.objects where object_id = v_object_id;

    v_deleted := array_append(v_deleted, v_object_id);
  end loop;

  return jsonb_build_object(
    'deletedRows', coalesce(array_length(v_deleted, 1), 0),
    'deletedObjectIds', to_jsonb(coalesce(v_deleted, '{}'::bigint[])),
    'deletedAt', public.sf_iso_utc(now())
  );
end;
$$;

create or replace function public.sf_add_registry_row(
  p_session_token text,
  p_values jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user jsonb;
  v_object_id bigint;
begin
  v_user := public.sf_assert_admin(p_session_token);

  if trim(coalesce(p_values ->> 'ro_1_3', '')) = '' then
    raise exception 'BAD_INPUT: Укажите УИН';
  end if;
  if trim(coalesce(p_values ->> 'ro_1_4', '')) = '' then
    raise exception 'BAD_INPUT: Укажите Код ДС';
  end if;
  if trim(coalesce(p_values ->> 'ro_1_5', '')) = '' then
    raise exception 'BAD_INPUT: Укажите наименование объекта';
  end if;

  select coalesce(max(object_id), 1) + 1 into v_object_id from public.objects;

  insert into public.objects(
    object_id, ro_1_2, ro_1_3, ro_1_4, ro_1_5, ro_1_6, ro_1_7, ro_1_8, ro_1_9, ro_1_10, ro_1_11, ro_1_12, ro_1_13
  )
  values (
    v_object_id,
    p_values ->> 'ro_1_2',
    p_values ->> 'ro_1_3',
    p_values ->> 'ro_1_4',
    p_values ->> 'ro_1_5',
    p_values ->> 'ro_1_6',
    p_values ->> 'ro_1_7',
    p_values ->> 'ro_1_8',
    p_values ->> 'ro_1_9',
    p_values ->> 'ro_1_10',
    p_values ->> 'ro_1_11',
    p_values ->> 'ro_1_12',
    p_values ->> 'ro_1_13'
  );

  insert into public.sm(object_id) values (v_object_id) on conflict (object_id) do nothing;
  insert into public.ppr(object_id) values (v_object_id) on conflict (object_id) do nothing;
  insert into public.suid(object_id) values (v_object_id) on conflict (object_id) do nothing;
  insert into public.lb(object_id) values (v_object_id) on conflict (object_id) do nothing;
  insert into public.mgz(object_id) values (v_object_id) on conflict (object_id) do nothing;

  return jsonb_build_object(
    'added', true,
    'objectId', v_object_id,
    'uin', coalesce(p_values ->> 'ro_1_3', ''),
    'values', coalesce(p_values, '{}'::jsonb),
    'addedAt', public.sf_iso_utc(now())
  );
end;
$$;

create or replace function public.sf_save_edits(
  p_session_token text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user record;
  v_edit jsonb;
  v_field_id text;
  v_table_name text;
  v_object_id bigint;
  v_value text;
  v_updated_rows bigint[] := '{}';
  v_group integer;
  v_index integer;
  v_count integer := 0;
begin
  select * into v_user from public.sf_require_session(p_session_token) limit 1;

  for v_edit in select value from jsonb_array_elements(coalesce(p_payload, '[]'::jsonb))
  loop
    v_field_id := trim(coalesce(v_edit ->> 'field_id', ''));
    v_table_name := public.sf_target_table_for_field(v_field_id);
    v_object_id := coalesce(nullif(v_edit ->> 'object_id', ''), '0')::bigint;
    v_value := coalesce(v_edit ->> 'value', '');

    if v_table_name = '' then
      raise exception 'BAD_INPUT: Неизвестное поле %', v_field_id;
    end if;
    if v_object_id <= 1 then
      raise exception 'BAD_INPUT: Некорректный object_id';
    end if;

    if v_table_name = 'ksg' then
      v_group := split_part(v_field_id, '_', 2)::integer;
      v_index := split_part(v_field_id, '_', 3)::integer;
      if trim(v_value) = '' then
        delete from public.ksg
        where object_id = v_object_id
          and ksg_group = v_group
          and ksg_index = v_index;
      else
        insert into public.ksg(object_id, ksg_group, ksg_index, value)
        values (v_object_id, v_group, v_index, v_value)
        on conflict (object_id, ksg_group, ksg_index) do update
        set value = excluded.value;
      end if;
    else
      execute format('insert into public.%I(object_id) values ($1) on conflict (object_id) do nothing', v_table_name)
      using v_object_id;

      execute format('update public.%I set %I = $1 where object_id = $2', v_table_name, v_field_id)
      using v_value, v_object_id;
    end if;

    insert into public.sf_edit_logs(
      created_at,
      source_type,
      source_key,
      user_name,
      role,
      division,
      uin,
      field_id,
      field_label,
      old_value,
      new_value
    )
    values (
      now(),
      'app',
      '',
      coalesce(v_user.name, ''),
      coalesce(v_user.role, ''),
      coalesce(v_user.division, ''),
      coalesce(v_edit ->> 'uin', ''),
      v_field_id,
      coalesce(v_edit ->> 'field_label', ''),
      coalesce(v_edit ->> 'old_value', ''),
      v_value
    );

    v_updated_rows := array_append(v_updated_rows, v_object_id);
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'updatedCells', v_count,
    'updatedRows', coalesce((select count(distinct value) from unnest(v_updated_rows) as value), 0),
    'logEntries', v_count,
    'savedAt', public.sf_iso_utc(now())
  );
end;
$$;

grant execute on function public.sf_auth(text, text, boolean) to anon, authenticated;
grant execute on function public.sf_get_session_user(text) to anon, authenticated;
grant execute on function public.sf_get_shared_selections(text) to anon, authenticated;
grant execute on function public.sf_get_shared_selection_work_state(text, text) to anon, authenticated;
grant execute on function public.sf_save_shared_selection(text, jsonb) to anon, authenticated;
grant execute on function public.sf_save_shared_selection_work_state(text, jsonb) to anon, authenticated;
grant execute on function public.sf_save_shared_selection_work_batch(text, jsonb) to anon, authenticated;
grant execute on function public.sf_delete_shared_selection(text, text) to anon, authenticated;
grant execute on function public.sf_delete_registry_rows(text, jsonb) to anon, authenticated;
grant execute on function public.sf_add_registry_row(text, jsonb) to anon, authenticated;
grant execute on function public.sf_save_edits(text, jsonb) to anon, authenticated;

comment on table public.sf_users is 'Пользователи приложения. Храните password_hash через extensions.crypt(password, extensions.gen_salt(''bf'')).';

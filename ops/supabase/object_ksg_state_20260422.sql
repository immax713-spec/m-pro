create table if not exists public.mpro_object_ksg_state (
  object_id text primary key,
  updated_date date not null,
  updated_at timestamptz not null default now(),
  updated_by text not null default ''
);

create or replace function public.mpro_get_object_ksg_state(
  p_session_token text,
  p_object_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user record;
  v_object_id text := trim(coalesce(p_object_id, ''));
begin
  select * into v_user from public.sf_require_session(p_session_token) limit 1;

  if v_object_id = '' then
    return jsonb_build_object(
      'objectId', '',
      'updatedDate', '',
      'updatedAt', '',
      'updatedBy', ''
    );
  end if;

  return coalesce(
    (
      select jsonb_build_object(
        'objectId', s.object_id,
        'updatedDate', to_char(s.updated_date, 'YYYY-MM-DD'),
        'updatedAt', public.sf_iso_utc(s.updated_at),
        'updatedBy', coalesce(s.updated_by, '')
      )
      from public.mpro_object_ksg_state s
      where s.object_id = v_object_id
    ),
    jsonb_build_object(
      'objectId', v_object_id,
      'updatedDate', '',
      'updatedAt', '',
      'updatedBy', ''
    )
  );
end;
$function$;

create or replace function public.mpro_set_object_ksg_state(
  p_session_token text,
  p_object_id text,
  p_updated_date date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user record;
  v_object_id text := trim(coalesce(p_object_id, ''));
  v_row public.mpro_object_ksg_state%rowtype;
begin
  select * into v_user from public.sf_require_session(p_session_token) limit 1;

  if v_object_id = '' then
    raise exception 'BAD_INPUT: Не указан объект';
  end if;

  if p_updated_date is null then
    raise exception 'BAD_INPUT: Не указана дата обновления КСГ';
  end if;

  insert into public.mpro_object_ksg_state (
    object_id,
    updated_date,
    updated_at,
    updated_by
  )
  values (
    v_object_id,
    p_updated_date,
    now(),
    coalesce(v_user.name, '')
  )
  on conflict (object_id) do update
    set updated_date = excluded.updated_date,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by
  returning * into v_row;

  return jsonb_build_object(
    'objectId', v_row.object_id,
    'updatedDate', to_char(v_row.updated_date, 'YYYY-MM-DD'),
    'updatedAt', public.sf_iso_utc(v_row.updated_at),
    'updatedBy', coalesce(v_row.updated_by, '')
  );
end;
$function$;

create or replace function api.mpro_get_object_ksg_state(
  p_session_token text,
  p_object_id text
)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $function$
  select public.mpro_get_object_ksg_state($1, $2);
$function$;

create or replace function api.mpro_set_object_ksg_state(
  p_session_token text,
  p_object_id text,
  p_updated_date date
)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $function$
  select public.mpro_set_object_ksg_state($1, $2, $3);
$function$;

grant execute on function public.mpro_get_object_ksg_state(text, text) to anon, authenticated;
grant execute on function public.mpro_set_object_ksg_state(text, text, date) to anon, authenticated;
grant execute on function api.mpro_get_object_ksg_state(text, text) to anon, authenticated;
grant execute on function api.mpro_set_object_ksg_state(text, text, date) to anon, authenticated;

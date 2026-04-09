alter table public.sf_users
  add column if not exists login text not null default '';

create unique index if not exists sf_users_login_unique_idx
  on public.sf_users ((lower(btrim(login))))
  where btrim(login) <> '';

drop function if exists public.sf_auth(text, boolean);

create or replace function public.sf_auth(
  p_name text,
  p_password text,
  p_remember boolean default false
)
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

grant execute on function public.sf_auth(text, text, boolean) to anon, authenticated;

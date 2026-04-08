insert into public.sf_users(name, password_hash, role, division)
values (
  'ИМЯ ПОЛЬЗОВАТЕЛЯ',
  extensions.crypt('ПАРОЛЬ', extensions.gen_salt('bf')),
  'Администратор',
  'НАЗВАНИЕ БЛОКА'
);

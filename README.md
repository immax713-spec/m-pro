# db

Тестовый deploy bundle для публикации проекта на `mpro7.ru/77/`.

Существующий проект на `mpro7.ru/ss/` этот набор не трогает.

## Структура

- `site/` — только статический фронт, который должен попасть в web-root `/77/`
- `ops/` — SQL, Edge Functions, Apps Script, smoke test и служебные инструкции
- `.github/workflows/deploy-77.yml` — отдельный GitHub Actions deploy только для `/77/`

## Что выкладывается на сайт

В каталог `mpro7.ru/77/` должны попадать только файлы из `site/`:

- `site/index.html`
- `site/src/`

Файл `site/serve.ps1` нужен только локально и в deploy не отправляется.

## GitHub Actions deploy в /77/

Workflow `deploy-77.yml`:

- не изменяет `mpro7.ru/ss/`
- создает каталог `/77/`, если его еще нет
- синхронизирует содержимое `site/` в `/var/www/mpro7.ru/77/`
- удаляет из `/77/` старые лишние файлы, которых уже нет в `site/`

### Нужные GitHub Secrets

- `SERVER_HOST`
- `SERVER_USER`
- `SERVER_PORT`
- `SERVER_PATH`
- `SERVER_SSH_KEY`

Если `SERVER_PATH` пустой, используется `/var/www/mpro7.ru`.

## Что не должно лежать в web-root

В `ops/` специально вынесены:

- `ops/supabase/` — схема БД, hardening, perf patch, smoke test, Edge Functions
- `ops/scripts/google_sheet_webhook.template.gs` — Apps Script для Google Sheets
- `ops/scripts/import_auth_users.py` — разовый импорт пользователей
- `ops/scripts/sync_summary_to_supabase.py` — разовая заливка сводной

## Безопасный порядок запуска

1. Развернуть статику из `site/`
2. Применить `ops/supabase/schema.sql`
3. Применить `ops/supabase/perf_patch.sql`
4. Применить `ops/supabase/hardening_lockdown.sql`
5. Задеплоить нужные Edge Functions из `ops/supabase/functions/`
6. Настроить Apps Script из `ops/scripts/google_sheet_webhook.template.gs`

## Важно

- `schema.sql` без `hardening_lockdown.sql` недостаточен
- `ops/supabase/functions/auth-users-import` держите выключенным по умолчанию и включайте только на время разового импорта через `AUTH_USERS_IMPORT_ENABLED=true`
- секреты Apps Script должны храниться только в `Script Properties`, не в коде

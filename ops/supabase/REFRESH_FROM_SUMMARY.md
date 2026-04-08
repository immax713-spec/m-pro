# Refresh From Summary

## Что меняется

- Новая сводная CSV считается единым источником истины.
- Строки `1 / 2 / 3` трактуются как метаданные: `field_id / блок / label`.
- В импорт теперь включены новые поля лаборатории `lb_1_5 ... lb_1_12`.
- Стабильный ключ синка: `УИН` (`ro_1_3`). Для строк без `УИН` используется резервная идентичность.

## Локальная подготовка файлов

```powershell
python .\scripts\sync_summary_to_supabase.py --csv ".\Сводная таблица АНО _СМГ_ - Сводная (7).csv"
```

Скрипт создаст папку `generated/import_bundle` с файлами:

- `objects.csv`
- `sm.csv`
- `ppr.csv`
- `suid.csv`
- `lb.csv`
- `mgz.csv`
- `ksg.csv`
- `field_catalog.csv`
- `object_id_map.json`
- `report.json`

## Прямая заливка в Supabase

Нужен `service role key`.

```powershell
python .\scripts\sync_summary_to_supabase.py `
  --csv ".\Сводная таблица АНО _СМГ_ - Сводная (7).csv" `
  --upload `
  --supabase-url "https://<project-ref>.supabase.co" `
  --service-role-key "<service-role-key>"
```

Скрипт очищает рабочие строки `object_id > 1` в таблицах:

- `objects`
- `sm`
- `ppr`
- `suid`
- `lb`
- `mgz`
- `ksg`

После этого он заливает свежий набор батчами через REST API Supabase.

## SQL, который нужно применить

1. `supabase/schema.sql`
2. `supabase/perf_patch.sql`

Важно:

- `schema.sql` теперь добавляет новые лабораторные колонки.
- `schema.sql` также создает partial unique index на `objects.ro_1_3`, чтобы `УИН` был опорным ключом для будущего синка.
- `perf_patch.sql` теперь включает новые лабораторные поля в fast bundle.

## Webhook из Google Sheets

Google Sheets не умеет нативный webhook на внешний сервер. Практический вариант здесь такой:

1. Развернуть Edge Function:
   `supabase/functions/google-sheet-webhook/index.ts`
2. Задать переменные окружения функции:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GOOGLE_SHEET_WEBHOOK_SECRET`
3. В Apps Script таблицы коллег вставить шаблон:
   `scripts/google_sheet_webhook.template.gs`
4. Поставить installable trigger:
   - либо `installHourlySnapshotTrigger`
   - либо `installOnEditSnapshotTrigger`

Функция ожидает полный снимок листа и:

- читает `field_id` из первой строки,
- игнорирует служебный `id_DB`,
- сопоставляет записи по `УИН`,
- апсертит данные в `objects/sm/ppr/suid/lb/mgz/ksg`.

## Что еще нужно решить перед боем

- Две колонки в сводной не имеют `field_id`, поэтому сейчас не импортируются автоматически.
- Если эти колонки надо хранить в приложении, им нужно выдать стабильные `field_id` и добавить в схему.

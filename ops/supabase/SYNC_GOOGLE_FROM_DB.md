# Sync Google From DB

## Что делает

Кнопка `sync Google` берет актуальную сводную из БД и перезаписывает лист `Сводная` в Google Sheets.

## 1. Обновить Apps Script в Google Sheet

Вставьте шаблон:

`scripts/google_sheet_webhook.template.gs`

Заполните в нем:

- `webhookUrl` и `webhookSecret` для направления `Google -> Supabase`
- `sheetSyncSecret` для направления `DB -> Google`
- `sheetName`, обычно `Сводная`

## 2. Развернуть Apps Script как Web App

В Apps Script:

1. `Deploy`
2. `New deployment`
3. `Web app`
4. `Execute as`: `Me`
5. `Who has access`: `Anyone with the link`

Скопируйте URL web app.

## 3. Задать секреты в Supabase

```powershell
npx.cmd supabase secrets set `
  GOOGLE_SHEET_SYNC_WEB_APP_URL='https://script.google.com/macros/s/.../exec' `
  GOOGLE_SHEET_SYNC_SECRET='ваш-длинный-секрет-для-db-to-google' `
  --project-ref lkflvchascdapzcbennf
```

`GOOGLE_SHEET_SYNC_SECRET` должен совпадать со значением `sheetSyncSecret` в Apps Script.

## 4. Задеплоить Edge Function

```powershell
cd C:\Users\maxp\Desktop\sdb
npx.cmd supabase functions deploy google-sheet-sync --project-ref lkflvchascdapzcbennf --no-verify-jwt
```

## 5. Как понять, что синк сработал

- В интерфейсе появится toast вида:
  `Google обновлен: 1801 строк -> "Сводная"`
- В Apps Script можно открыть `Executions` и увидеть вызов `doPost`
- Лист `Сводная` обновится целиком из текущей БД

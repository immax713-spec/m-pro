# Google Script Secrets

Use `scripts/google_sheet_webhook.template.gs` without hardcoded secrets.

## In Apps Script

1. Open `Project Settings`
2. Find `Script properties`
3. Add:
   - `GOOGLE_TO_DB_WEBHOOK_SECRET`
   - `DB_TO_GOOGLE_SYNC_SECRET`

## In the script file

Keep only non-secret values in code:

- `webhookUrl`
- `sourceKey`
- `sheetName`
- row numbers

## In Supabase

`GOOGLE_SHEET_SYNC_SECRET` must match `DB_TO_GOOGLE_SYNC_SECRET` from Script Properties.

`GOOGLE_SHEET_WEBHOOK_SECRET` must match `GOOGLE_TO_DB_WEBHOOK_SECRET` from Script Properties.

# Hardening

## Goal

Disable direct access to raw data tables in the `public` schema and force the app
to work only through the protected RPC layer.

## What changed in the client

- `src/supabase-shell-api.js` no longer falls back to direct `.from(table).select(*)`
  reads.
- Data loading now requires:
  - a valid session token
  - the RPC `public.sf_get_data_bundle`

## What to run in Supabase

Run [hardening_lockdown.sql](./hardening_lockdown.sql) in the SQL Editor.

This script:

- enables RLS for raw tables:
  - `objects`
  - `sm`
  - `ppr`
  - `suid`
  - `lb`
  - `mgz`
  - `ksg`
  - `objects_full` if it exists as a table
- revokes direct access from `anon` and `authenticated`
- also revokes access from `anon` and `authenticated` on `objects_full` if it exists as a view

After that, orange `UNRESTRICTED` badges should disappear from these tables in the
Supabase Dashboard.

## Required secret rotation

Treat previously shown secrets as compromised and rotate them:

- Supabase secret/service key
- `GOOGLE_SHEET_WEBHOOK_SECRET`
- `GOOGLE_SHEET_SYNC_SECRET`
- `AUTH_USERS_IMPORT_SECRET`
- `AUTH_USERS_IMPORT_ENABLED` should stay unset unless you explicitly run a one-time user import
- Supabase CLI personal access token, if one was used

Also remove plaintext password files like `AuthorizationPage.csv` after import.

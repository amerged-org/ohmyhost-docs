---
name: ohmyhost-export-database
description: Request and download an on-demand password-encrypted SQL ZIP from ohmyho.st. Use for a customer database backup or export; does not restore or overwrite another database.
---

# Export a database

The organization Owner can request one export per project per rolling 24 hours, including at zero credits. Exports contain SQL only: separate Dev/Prod dumps for isolated data, or one shared dump. Files, application source and configuration are not included.

1. Ask the user to choose and retain the ZIP password. Use an existing private UTF-8 password file (1–1,024 bytes, not blank) on the machine running the local MCP server; do not put the password in the prompt or tool arguments. Preserve its exact bytes, including any final line break. On POSIX the file must be owner-only (`chmod 600`). Do not silently save a password elsewhere.
2. Discover `project_export_create`, then supply the project ID, absolute `password_file` path and one saved idempotency key. The CLI alternative reads the password from stdin:

   ```sh
   ohmyhost export create --project "$PROJECT_ID" --idempotency-key "$EXPORT_REQUEST_KEY" --stdin --json < "$BACKUP_PASSWORD_FILE"
   ```

3. Poll `project_export_get` with the returned export/operation ID at `next_poll_after_seconds`. Reuse the original create key after an uncertain response; polling does not create a new export. An accepted failed export still uses that day's allowance; follow `next_request_at` or `Retry-After`.
4. When ready, download from the returned signed URL within 24 hours. Keep that link out of shared project notes and feedback. The encrypted archive is retained seven days; a new link requires at least 24 hours of remaining retention, so download during the first six days.
5. Open the ZIP with an AES-compatible reader such as 7-Zip using the user-held password. Confirm the expected SQL entries. Report any export error with its operation ID; do not claim an unavailable link is a finished download.

The plaintext SQL limit is 256 MiB. The platform stores the encrypted export in Cloudflare R2. A customer-selected S3, R2 or Drive destination is not currently available. This on-demand SQL export is separate from the database size's included seven-day operational backups. Restoring is a separate requested action: choose the destination explicitly and do not overwrite the existing production database to test a backup.

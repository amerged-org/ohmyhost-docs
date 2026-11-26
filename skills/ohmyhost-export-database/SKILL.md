---
name: ohmyhost-export-database
description: Request and download an on-demand password-encrypted SQL ZIP from ohmyho.st; its download link is requested separately. Use for a customer database backup or export; does not restore or overwrite another database.
---

# Export a database

Use the [customer voice](../ohmyhost-get-started/references/customer-voice.md) in replies.

The organization Owner can request one export per project per rolling 24 hours, including at zero credits. Exports contain SQL only: separate Dev/Prod dumps for isolated data, or one shared dump. Files, application source and configuration are not included.

This workflow needs the separately selected local CLI/MCP password-input path. A remote-only chat cannot read a password file on the user's computer, and the API reference does not make it available. Explain that specific limitation without requesting the password in chat or substituting a credential-bearing generic call.

1. Ask the user to choose and retain the ZIP password. The platform refuses a new export password of fewer than 12 characters, so ask for a longer passphrase. Use an owner-only UTF-8 password file (at least 12 characters, 1–1,024 bytes, not blank) on the machine running the local MCP server. Keep the password out of prompts and tool arguments. To create a new file on POSIX, use `(umask 077; set -C; printf '%s' "$PASSPHRASE" > "$BACKUP_PASSWORD_FILE")` with an unused path. This creates the file with mode `0600` before writing and refuses to overwrite an existing file. The password is the file's exact bytes, including any final line break. Use the same passphrase when opening the archive. Do not silently save a password elsewhere.
2. Discover `project_export_create`, then supply the project ID, absolute `password_file` path and one saved idempotency key. The CLI alternative reads the password from stdin:

   ```sh
   ohmyhost export create --project "$PROJECT_ID" --idempotency-key "$EXPORT_REQUEST_KEY" --stdin --json < "$BACKUP_PASSWORD_FILE"
   ```

3. Poll `project_export_get` with the returned export/operation ID at `next_poll_after_seconds`. Reuse the original create key after an uncertain response; polling does not create a new export. An accepted failed export still uses that day's allowance; follow `next_request_at` or `Retry-After`.
4. When ready, `project_export_get` shows the state but never a download link. Request one with `ohmyhost export download-link EXPORT_ID --project PROJECT_ID --json` (MCP `project_export_download_link_create`; REST `POST /v1/projects/{project_id}/exports/{export_id}/download-links`; owner only): it signs a link valid for 24 hours, audits each request, and an organization may take six links a minute. Download within 24 hours. Keep that link out of shared project notes and feedback. The encrypted archive is retained seven days; a new link requires at least 24 hours of remaining retention, so download during the first six days.
5. Open the ZIP with an AES-compatible reader such as 7-Zip using the user-held password. Confirm the expected SQL entries. Keep the operation ID for support. Tell the customer whether the backup can be downloaded.

The plaintext SQL limit is 256 MiB. The platform stores the encrypted export in Cloudflare R2. A customer-selected S3, R2 or Drive destination is not currently available. This on-demand SQL export is separate from the database size's included seven-day operational backups. Restoring is a separate requested action: choose the destination explicitly and do not overwrite the existing production database to test a backup.

Skill release 0.1.85. Compare it with the version at <https://ohmyho.st/client-release.json>. If your copy is older, refresh the installed Skill or plugin before following its instructions.

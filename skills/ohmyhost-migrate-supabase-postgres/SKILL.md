---
name: ohmyhost-migrate-supabase-postgres
description: Migrate customer-selected Supabase capabilities in a TypeScript application to portable PostgreSQL and the ohmyho.st runtime. Use when real Supabase database, Auth, Storage, Functions or Realtime usage needs conversion; not merely because an SDK is installed.
---

# Migrate a Supabase application

Keep the application working while converting only the capabilities the customer selected.

## Inspect and choose

Run `ohmyhost init --dry-run --json` in the chosen repository. Inventory actual database queries, RPCs, migrations, RLS assumptions, Auth sessions, Storage calls, Edge Functions and Realtime subscriptions. Distinguish used services from unused dependencies and preserve a valid hosting configuration.

Explain what can remain external, what needs application changes, and any unsupported runtime capability. Do not replace the customer's auth provider or discard data without their decision. A database dump does not migrate every Supabase service.

Read [provider contracts](references/provider-contracts.md) only for the affected capabilities. The [portable baseline helper](scripts/create-portable-baseline.mjs) can prepare a reviewed migration baseline; inspect its documented input/output and the selected migration files before running it. It does not grant database authority or prove that application data has moved.

## Convert the selected capabilities

- Replace selected Supabase-specific database calls with typed SQL or narrow repositories through `createPrivateDatabaseClient` and `OHMYHOST_DATABASE`. Use `transaction()` for predefined statements and bounded `withConnection()` for read-decide-write; see [database runtime](../ohmyhost-build-portable-app/references/database-runtime.md). Preserve transaction boundaries, constraints and tenant filtering.
- Review SQL functions and RLS-dependent assumptions explicitly. Keep immutable migrations in `YYYYMMDDHHMMSS_name.sql` format and follow [expand-only admission](../ohmyhost-manage-database/SKILL.md). Ordinary row changes, destructive schema changes, CREATE OR REPLACE, roles/grants and changes to existing constraints are refused. Reviewed policy migrations and ENABLE/FORCE on explicitly selected ordinary `public`/`private` tables use the backend RLS contract.
- To retain Supabase policies, explicitly select the baseline helper's `preserve-rls` mode, review every original RLS table and supply the identity/claim mapping described in [provider contracts](references/provider-contracts.md#preserving-backend-rls). Keep every policy or stop on a concrete unsupported construct; never fall back to policy removal. Verify the application session on the server and pass only selected, server-trusted claims through `withRls`; the backend derives `sub` and the `anon`/`authenticated` role. Browser IDs and editable user metadata are never authority. This choice does not change the customer's auth provider, and a UUID cast requires confirmed identity compatibility.
- Preserve or integrate the customer-chosen application auth. Configure its callback URLs and private server secrets. Test login, protected access, session refresh/reload and logout; hosting login is separate.
- Convert selected Storage, Functions and Realtime behavior only when the current runtime contract supports the equivalent application behavior. If it does not, state the gap and agree on the feature decision instead of inserting a fake success or silent fallback.
- Selected Edge Functions become authenticated framework-native server routes or plain Worker handlers. Declare schedules through `functions.crons`; the platform owns cron delivery/retries, rather than customer Queue/Workflow bindings. Existing external functions may stay when the customer chooses them and their declared interfaces are verified.
- Optional managed Better Auth uses explicit `auth.provider: better-auth` and its database. Managed mail is optional for verified-user/session/token flows; the bridge's verification/reset sends use its platform sender and need `mail.enabled: true`, Paid access and a verified sender. Keep a custom Resend callback in an application-owned Better Auth handler with `auth.provider: none`; this disables only the managed bridge, not Better Auth or login. SDK dependency detection selects no managed capability. CLI 0.1.24 may incorrectly return `managed_auth_mail_required`; use the corrective 0.1.25 release or later and preserve the selected auth and sender.
- Keep application runtime secrets separate from repository/build inputs. Use `secret_set_command` and the intended environment ID for private values.

## Verify and deploy

Run relevant application tests and the real framework build, then rerun `init` until the selected conversion requirements are resolved. Use **ohmyhost-build-portable-app** for the resulting runtime and **ohmyhost-deploy-github** for publication.

Check real login, data reads/writes, constraints and any required files, email or functions on the hosted Dev app. Promote only within the customer's request, preserving Prod records. Rollback or deletion tests belong only to separately requested or explicitly disposable test resources.

For an unsupported operation or suspected platform bug, use `feedback_submit` with a minimal redacted reproduction and the safe operation/error ID. Keep the unresolved capability visible; do not claim the migration complete until the requested application behavior works.

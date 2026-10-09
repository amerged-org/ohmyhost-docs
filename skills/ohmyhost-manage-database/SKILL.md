---
name: ohmyhost-manage-database
description: Read or update authorized ohmyho.st project data, open time-bound psql access, change compute or Dev/Prod data assignments, reset isolated Dev, and prepare admitted schema or backend RLS migrations. Use for SQL operations, database sizing, idle costs, shared data or schema promotion.
---

# Manage project data, compute and migrations

Read `project_context_get` and `database_compute_get` for the selected Dev or Prod environment. The compute tool reads metadata without waking the database; use its observation rather than inferring size from the plan.

| Profile          | Compute | RAM  | Sleep after idle |
| ---------------- | ------- | ---- | ---------------- |
| Free standard    | 0.25 CU | 1 GB | 1 minute         |
| Paid standard    | 0.5 CU  | 2 GB | 1 minute         |
| Paid performance | 1 CU    | 4 GB | 5 minutes        |

Performance costs 2.5 times Paid-standard database compute credits for the same active duration. Its longer idle window can add active time. Storage and retained history are billed separately. Avoid periodic SQL health checks that keep idle compute awake; explain the first-query cold start when discussing savings.

For a customer-requested resize, use `database_compute_set` with the explicit environment, `standard` or `performance`, confirmation and one idempotency key. Preserve existing authorization; explain any new cost or shared-environment effect before applying it. Poll its operation, then read actual compute again. A successful submission is not proof that resizing finished. Do not reset the database to resize it.

## Read and update data

Use the customer's existing CLI login or API token; new user tokens remain valid until revoked. Confirm the intended organization/project and explicitly select `dev` or `prod`. `OHMYHOST_ENVIRONMENT` selects the independent platform, while the tool's `environment` selects this project's data.

Read with `database_query` using `project_id`, `environment`, one SELECT/WITH statement and scalar parameters. Discover an unfamiliar schema first and prefer aggregates or the necessary selected rows over personal records. The limit is 100 rows and five seconds. Application RLS can filter results; an empty query is not proof that the database is empty. Use the authorized export workflow when the customer requests a full archive.

For a requested data change, review one parameterized INSERT, UPDATE or DELETE/upsert and the affected rows. Use `database_write` with the explicit environment, JSON `parameters`, one saved `idempotency_key` and `confirmed: true`. Existing authorization for that exact change is sufficient; resolve an ambiguous environment or scope before writing. The CLI reads one statement from a UTF-8 SQL file of at most 64 KiB. It must start with INSERT, UPDATE or DELETE, with no leading comment or WITH:

```sh
ohmyhost database write --project "$PROJECT_ID" --environment "$PROJECT_ENVIRONMENT" --statement-file "$SQL_FILE" --parameters-json "$PARAMETERS_JSON" --idempotency-key "$WRITE_REQUEST_KEY" --yes --json
```

`PROJECT_ENVIRONMENT` must be `dev` or `prod`. SQL parameters are data, never hosting tokens or passwords. Writes use the restricted database role and preserve application RLS; do not disable policies or alter roles to force a result. A shared placement affects both logical environments. Compute wakes and is metered normally; current credit grace and project Stop budgets apply.

An invalid file answers exit 2 `statement_file_invalid` (not retryable). Correct the named file, then rerun with the same key; nothing was sent. This command's statement-file restriction is separate from the hosted application database client's supported SQL.

Check receipt `state` and `error`, not only HTTP status: a failed receipt can use HTTP 200. `succeeded` returns the command and `affected_rows`, not records; fetch records separately. `running` means use `operation_get` with the returned ID. A single write permits at most 1,000 directly affected rows and five seconds; triggers/cascades may affect additional rows.

After a network uncertainty, retain the exact request and key. An existing same-key receipt observes the original attempt. On `database_write_outcome_unknown`, inspect the target data and retain the operation ID before deciding on another write; never automatically pick a new key or claim the transaction failed to commit. Do not save SQL parameters or rows in project context/feedback. Schema changes remain reviewed versioned source migrations; role/grant changes are unsupported. The coordinated backend-RLS capability adds a bounded authorization-DDL exception for policy lifecycle and ENABLE/FORCE on owned public/private ordinary tables; read [its runtime and rollout contract](../ohmyhost-build-portable-app/references/row-level-security.md) before adoption. Public SQL tools retain context-free restricted roles and do not bypass application policies.

[Database API examples](https://docs.ohmyho.st/database) explain CLI, MCP and REST usage.

## Dev and Prod data

`data_mode` is optional at creation and defaults to `shared`: Dev and Prod use one database/Auth record set and one logical file namespace. Recommend `isolated` for testing when the customer accepts the second database's normal consumption. In shared mode, writes, compute changes and migrations affect both environments. Public Dev also exposes the app over that shared data.

Only the Owner changes assignments. Read `project_data_plan` for the exact `change`, explain its effects, destructive effects, cost and required redeployment, then use `project_data_change` within the customer's explicit authorization. Supply the plan's `resource_etag` as `if_match`, its `confirmation_token`, `confirmed: true` and one retained idempotency key. The plan lasts ten minutes; after uncertainty observe `operation_get` and replay the original key rather than starting another reset.

| Change                    | Starting mode                  | Result                                                                                                            |
| ------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `isolate_prod_keeps_data` | shared                         | Prod keeps the existing data/files; Dev gets an empty area and needs redeployment.                                |
| `isolate_dev_keeps_data`  | shared                         | Dev keeps the existing data/files; Prod gets an empty area and needs redeployment.                                |
| `share_prod_keeps_data`   | isolated, with a Prod database | Dev joins Prod; Dev-only database/files, deployment and retained rollback scripts are removed. Redeploy Dev.      |
| `reset_dev`               | isolated                       | Remove Dev database/files, deployment and retained rollback scripts; assign a fresh empty Dev area. Redeploy Dev. |

No action copies records, users, sessions or files. New databases are created by the next deployment, which replays the repository's admitted migrations. Files follow the data assignment and keep their recorded physical locators; the new empty area can reuse logical names such as `avatar.png`. Secrets and Dev access mode survive a Dev reset or share; protected Dev gets a renewed share link. Losing database bindings, held connections and time-bound SQL logins are revoked. The operation does not deploy automatically: check its result and redeploy the listed environment. `reset_dev` is refused in shared mode, because that would delete Prod's data. Reversing a mode cannot recover deleted Dev records/files.

CLI alternatives are `ohmyhost project data plan --project ULID --change KIND --json` and `ohmyhost project data change --project ULID --change KIND --if-match ETAG --confirmation-token TOKEN --idempotency-key KEY --yes --wait --json`.

If the customer explicitly requests copying selected records, use their reviewed portable SQL through separately authorized time-bound `psql` access to the source and destination. Keep credentials private, preserve schema/tenant checks and verify selected destination records; do not imply that promotion or a data-mode command copies data or application-auth sessions. Files need a separate authorized application transfer.

## Time-bound PostgreSQL access

`database_access_create` / `ohmyhost database access create` issues a `read` or confirmed `write` login for 5 minutes to 24 hours, with at most three active per logical environment. It returns the URI/password once for the customer's SQL client; keep them out of arguments/source/logs and revoke through `database_access_revoke` when finished. The shortcut `ohmyhost database psql --project ULID --environment dev|prod --mode read|write` creates its own temporary credential, passes the password in the subprocess environment and revokes it on exit. These roles cannot change schema, and application RLS still applies. Hosted code continues to use `OHMYHOST_DATABASE`.

## Schema and promotion

Keep immutable migrations in the configured directory as `YYYYMMDDHHMMSS_name.sql`. Ordinary schema admission is expand-only: create schemas `auth`, `extensions` or `private` with IF NOT EXISTS; extensions `pgcrypto`, `btree_gist` or `unaccent`; tables, types, domains, sequences, views, functions and indexes. Functions use SQL or PL/pgSQL, with a fixed search_path for SECURITY DEFINER. On existing tables, add only nullable columns without defaults and non-unique indexes. Constraints, foreign keys, unique indexes and triggers may attach to tables created in the same pending migration run, not existing tables. The matching backend-RLS release additionally admits bounded CREATE/ALTER/DROP POLICY and ENABLE/FORCE statements on explicitly qualified, migrator-owned ordinary public/private tables; all touched tables must finish enabled and forced. Ordinary DROP, row-changing statements, CREATE OR REPLACE, other ALTER and role/grant changes remain refused. Reserved-schema references are rejected except structurally checked `ohmyhost.user_id()` and `ohmyhost.claims()` calls inside policy expressions. Supabase helper SQL must first pass explicit reviewed conversion. At most 128 files, 256 KiB per file and 2 MiB total; use UTF-8/LF without BOM. Pending files apply atomically with a 30-second statement and five-second lock timeout. Applied files cannot change, and new timestamps must follow the applied catalog. Read `init` blockers before paying for a build. Source planning checks filenames, so a plan alone does not establish SQL admission; runtime catalog checks may still refuse changes to existing schema.

Add a nullable column, deploy compatible code and backfill through bounded, authorized application writes. Removing columns or tightening an existing constraint remains unsupported by this migration path. Test against representative records. Never promote a Dev dump over production data.

Use `promotion_plan` to review the artifact and migration effects, then `promotion_execute` within the requested scope. Verify the new application behavior and preservation of existing Prod records. Use `database_query` for explicitly selected Dev or Prod verification and `database_write` only for an authorized data change; both retain application RLS. Record the selected profile and data decision in project notes with the current version; use live compute for current status.

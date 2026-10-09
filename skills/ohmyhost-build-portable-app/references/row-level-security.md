# Backend row level security

Use PostgreSQL policies when the customer wants database-enforced row permissions. Backend RLS is part of the coordinated 0.1.30 cohort and requires both the matching customer-runtime package with `withRls` and the deployed database service exposing `openRls`, including trusted SQL-helper preparation. Source code or a package import alone does not prove the deployed capability. Report a missing capability; never replace a refused RLS call with a context-free query. The earlier 0.1.29 package does not provide `withRls`.

The application authenticates its own users before accessing protected data. An ohmyho.st login, API key, MCP project grant or protected Dev ticket is not the application's end-user identity. Authentication tables and existing unprotected application tables are not automatically changed.

## Define a policy in a new migration

For a new application table, add an immutable `YYYYMMDDHHMMSS_name.sql` migration:

```sql
CREATE TABLE public.notes (
  id text PRIMARY KEY,
  owner_id text NOT NULL,
  body text NOT NULL
);
CREATE POLICY own_notes ON public.notes
  FOR ALL TO PUBLIC
  USING (owner_id = ohmyhost.user_id())
  WITH CHECK (owner_id = ohmyhost.user_id());
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes FORCE ROW LEVEL SECURITY;
```

Native v1 policy changes cover CREATE POLICY, ALTER POLICY conditions, DROP POLICY with RESTRICT/default and single ENABLE/FORCE statements. Targets are explicitly qualified, migrator-owned ordinary tables in `public` or `private`, with `TO PUBLIC` or omitted role. The complete migration run must leave every touched table both enabled and forced. No policy means default-deny. Append a new migration for policy changes; do not edit an applied file. Ordinary destructive schema/data operations, role/grant changes, DISABLE/NO FORCE, CASCADE and policy renames remain unsupported.

Existing SQL table grants still determine which commands a login may execute. Policies further restrict the rows; they do not create privileges. A missing grant or WITH CHECK violation produces SQLSTATE `42501`; a USING denial can simply return zero rows. Verify that a denied write left its intended target unchanged. Multiple permissive policies combine with OR; restrictive policies add AND requirements and need an applicable permissive policy.

## Bind a verified application user

`subject` is opaque text, supporting UUIDs and provider-specific IDs. Use the ID from a verified server session; only pass selected server-controlled authorization claims. Reject missing, tampered, expired or revoked sessions before opening a protected data transaction. Better Auth's server session API or the customer's WorkOS server SDK performs authentication; decoding a cookie/JWT or accepting a body `user_id` does not.

After the route has obtained a verified session and its actual Worker binding:

```ts
import { createPrivateDatabaseClient } from "@ohmyhost/customer-runtime/database";

const database = createPrivateDatabaseClient(env.OHMYHOST_DATABASE);
const rows = await database.withRls({ subject: session.user.id }, async (tx) => {
  const result = await tx.query({
    text: "SELECT id, body FROM public.notes ORDER BY id",
    values: [],
  });
  return result.rows;
});
```

The callback contains no explicit BEGIN/COMMIT/ROLLBACK, savepoints or session-control SQL. It receives only query, on one service-owned transaction. The service sets complete transaction-local claims; any query or result-validation error prevents commit even when the callback catches it. Unawaited dispatched work is settled before completion, and captured handles cannot be used afterwards. An uncertain COMMIT raises nonretryable `database_transaction_outcome_unknown`: inspect the business outcome before an explicitly bounded retry; do not assume it rolled back.

`database.withRls(null, callback)` explicitly selects anonymous access. Policies can use `ohmyhost.claims()->>'role'`, whose value is `authenticated` or `anon`, and `ohmyhost.user_id()`, which is NULL for anonymous/context-free access. Additional claims are passed through `claims`; callers cannot override reserved `sub` or `role`. Identity is limited to 512 UTF-8 bytes; the complete plain-JSON claims document is at most 16 KiB, depth eight, 1,000 nodes and 128-byte keys. Current query/result limits, 100 statements, thirty-second lifetime and five-second idle timeout apply. Do not wait for mail, uploads or external providers inside the transaction.

For organization or administrator policies, derive claims from checked membership or server authority. Freely editable user profile metadata is not authorization. Background jobs receive no automatic service role; define their allowed rows through an explicit trusted identity and policy. These PostgreSQL settings are assertions by trusted backend code, not protection from a compromised backend or arbitrary SQL injection.

## Use Kysely within the same scope

```ts
import { Kysely } from "kysely";
import { createRlsTransactionDialect } from "@ohmyhost/customer-runtime/database-kysely";

const rows = await database.withRls({ subject: session.user.id }, async (tx) => {
  const db = new Kysely<{ notes: { id: string; owner_id: string; body: string } }>({
    dialect: createRlsTransactionDialect(tx),
  });
  try {
    return await db.selectFrom("notes").select(["id", "body"]).execute();
  } finally {
    await db.destroy();
  }
});
```

Do not open a nested Kysely transaction or use its streaming API in this scope. Destroying this dialect releases its wrappers, not the owner transaction. The existing private dialect remains available for non-RLS work and authentication/session lookup.

## Adopt on an existing application

First deploy identity-aware application code while tables remain unenforced. Then add policy/enforcement migrations only after every live consumer of the physical database is verified context-ready. Shared Dev/Prod data requires both active applications ready immediately before enforcement, because migrations precede the new Worker cutover. After activation, only a verified context-ready artifact is a supported rollback target; never disable RLS automatically to rescue old code.

Ordinary CLI/MCP reads/writes and temporary SQL logins do not manufacture an application actor or bypass row policies. An empty result is not proof that the database has no rows. Authorized complete export uses the existing private privileged recovery path; verify that the archive contains hidden rows, the SQL helpers and policies and can be restored with different environment role names. Do not use a restricted query result as a full backup.

For Supabase schema baselines, use the [explicit reviewed RLS conversion mode](../../ohmyhost-migrate-supabase-postgres/references/provider-contracts.md#preserving-backend-rls). Unsupported policies, roles or claim mappings stop conversion. Source migration, authentication choice, data movement and provider rollout remain separate authorized actions.

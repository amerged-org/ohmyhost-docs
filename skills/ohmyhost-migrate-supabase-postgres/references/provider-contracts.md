# Supabase conversion contracts

Use this reference when a detected Supabase capability needs a replacement. Keep each capability independently testable; a PostgreSQL import does not convert Auth, Functions, Storage, Realtime, or mail.

## Portable target

- The repository pins exactly one `npm`, `pnpm`, `yarn`, or `bun` version and commits exactly one matching frozen lockfile.
- Vite, TanStack Start, and Next.js remain framework-native. The service-owned build overlay pins OpenNext `1.20.9` and Wrangler `4.125.0`; customer source never commits those dependencies, generated configuration, `OHMYHOST_BASE_PATH`, or provider bindings.
- Read `compatibility.frameworks[].status` from init: `admitted` meets the security floor, `pending` is a range the build checks after installing it, and `unsupported` stops until the package is at its `minimum` or a later stable release.

## Database and Auth

- Replace selected Supabase database/PostgREST calls and browser SQL with authenticated server use cases backed by `OHMYHOST_DATABASE`. A deliberately retained Supabase browser integration needs its exact origins in `runtime.browser`; server routes use `runtime.egress.allow` instead. Verify the real exported app's auth/data flows before claiming it works. Remove `@supabase/supabase-js` only when no deliberately retained customer-owned Supabase Auth or other approved capability still needs it. Retained external auth must be independently verified; SDK package evidence alone neither selects a managed database nor blocks hosting.
- The regional database service and Neon management are platform-private. Customer code receives only the scoped `OHMYHOST_DATABASE` binding, never a database URL or migration credentials.
- Convert RPCs to explicit transactions or reviewed PostgreSQL functions with fixed `search_path`, explicit authorization, idempotency, and concurrency tests.
- Canonical migrations are expand-only `YYYYMMDDHHMMSS_name.sql` files. A reviewed PostgreSQL schema-only dump may include `public` and app-owned `private`, never Supabase `auth` or `storage`.
- If the customer selects `auth.provider: better-auth`, the managed bridge owns the new `auth` schema, UUID identities, verification/reset callbacks, host-only cookies, session revocation and database sessions. It requires its managed database; verified-user/session/token flows need no mail sender. The private bridge's verification/reset sends use the platform sender and require `mail.enabled: true`, Paid access and a verified sender when invoked. Preserve a custom Resend callback in an application-owned Better Auth handler with `auth.provider: none`; this disables only the managed bridge and keeps application login. Never recreate browser-controlled JWT GUCs or Supabase roles.

First-party references: [Supabase migration scope](https://supabase.com/docs/guides/platform/migrating-to-supabase/postgres), [PostgreSQL pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html), and [Better Auth PostgreSQL](https://better-auth.com/docs/adapters/postgresql). Hosted database code follows [the private runtime contract](../../ohmyhost-build-portable-app/references/database-runtime.md).

## Functions, files, Realtime, and mail

- Move bounded request-local Edge Functions into authenticated same-origin Vite companion handlers, TanStack Start server routes, or Next.js route handlers. Plain Worker functions use `runtime.mode: functions` and `src/ohmyhost/worker.ts` with a default `fetch` and optional default `scheduled(controller, env, ctx)`. Declare `functions.crons` in `ohmyhost.yaml` and verify runs through `function_runs_list`; the platform owns scheduled delivery/retries, without customer Queue/Workflow bindings.
- Replace Supabase Storage calls with `@ohmyhost/customer-runtime/storage`. The Storage Gateway owns raw R2, signed access, quotas, receipts, and provider cleanup.
- Realtime is a typed unsupported blocker until a product contract exists. Do not simulate success or replace it with polling without an explicit product decision.
- Replace application mail selected for ohmyho.st with `createTransactionalMailClient`; set `mail.enabled: true`, configure/verify the customer's Paid sender and let the platform install its environment-specific mail key. Never call customer secret-set for reserved `OHMYHOST_MAIL_KEY`. Receiving uses a signed application webhook whose returned signing secret is installed under an application-owned name such as `APP_MAIL_WEBHOOK_SECRET`. Preserve verification/reset mail handled by the customer's explicitly retained external auth provider.

## Baseline helper

Choose the authorization mode explicitly. With no authorization selection, provider dependencies and RLS state are rejected. The helper prepares a new, reviewed schema baseline; it never rewrites already-applied immutable migrations, moves customer data or proves that the application is ready to enforce policies.

All output modes create new files only. An existing output file or symlink stops generation, including an identical file from an earlier run. Choose a new `--output` filename or a fresh `--migration-prefix`; do not replace an applied migration. Directory output checks every generated target for collisions before writing and uses exclusive file creation to refuse concurrent replacements.

### Preserving backend RLS

Use `--authorization-mode preserve-rls --rls-options <reviewed-json-file>` after reviewing every original RLS table and the application's session verification. The JSON file accepts only these fields:

```json
{
  "backendRlsTables": ["public.profiles"],
  "userIdMapping": "uuid",
  "claimMappings": [
    {
      "sourcePath": ["app_metadata", "organization_id"],
      "targetPath": ["organization_id"],
      "trust": "server-verified"
    },
    {
      "sourcePath": ["role"],
      "targetPath": ["role"],
      "trust": "server-verified"
    }
  ]
}
```

```text
scripts/create-portable-baseline.mjs --input <dump> --output-directory <migrations> --migration-prefix <YYYYMMDDHHMMSS_slug> --authorization-mode preserve-rls --rls-options <reviewed-json-file>
```

- `backendRlsTables` is an explicit selection of newly created ordinary tables in `public` or app-owned `private`. It must cover every original policy and RLS-enabled/forced table. Each selected table must have an input ENABLE statement; the output retains ENABLE and adds FORCE where absent. Review `normalizedForceRlsTables` before applying the baseline, including every application/job that uses a shared Dev/Prod database.
- Set `userIdMapping: "uuid"` only after confirming that the verified backend subject preserves the original Supabase UUID identity. Only then does `auth.uid()` become `ohmyhost.user_id()::uuid`. Omit it when unused; opaque or remapped subjects require an explicit application/data migration outside this helper.
- `claimMappings` explicitly maps supported literal `auth.jwt()->'field'->>'nested_field'` paths to the JSON fields populated from verified server-side authority in `withRls`. Review the origin of every value; the `trust` field records that review and does not authenticate a value. User-editable `user_metadata`/`raw_user_meta_data`, whole-JWT copies, dynamic paths and missing mappings are rejected. Target field names must satisfy the runtime's 128-byte key limit and exclude `__proto__`, `prototype` and `constructor` at every depth. A role mapping can only map `role` to `role`; the runtime derives that role from the explicit anonymous or authenticated identity. Supported role predicates compare text to literal `anon`/`authenticated` with equality/inequality or IN/NOT IN; service-role branches and dynamic role expressions require manual conversion.
- Source `TO anon` and `TO authenticated` become `TO PUBLIC` with role applicability inside each condition. Permissive conditions use `role_match AND predicate`; restrictive conditions use `NOT role_match OR predicate`. Implicit PostgreSQL USING/WITH CHECK defaults are expanded before adding these guards. Policy names, commands and permissive/restrictive modes are retained; missing role context does not match either source role. Existing `TO PUBLIC` remains universal.
- This baseline path supports CREATE POLICY with ALL/SELECT/INSERT/UPDATE/DELETE and USING/WITH CHECK, boolean/comparison expressions, selected PostgreSQL conditional syntax and scalar `SELECT auth.uid()` forms. Custom function calls, physical-role checks (including SQL `USER`), service-role bypass, other roles, policy ALTER/DROP lifecycle statements, partitioned/inherited tables, Unicode-escaped tokens, adjacent/newline-concatenated strings and unsupported JWT extraction forms stop with a concrete error. `standard_conforming_strings` must remain explicitly enabled; disabling forms and unknown settings are rejected. Lexical parsing preserves literal/comment/quoted-identifier boundaries; PostgreSQL admission/execution still validates SQL expression semantics. Do not work around an unsupported form by deleting its policy.
- The report exposes `inputPolicyCount`, `emittedPolicyCount`, `translatedPolicyCount`, `omittedPolicyCount`, identity-reference conversions and normalized FORCE tables. In `preserve-rls`, every policy must be emitted and omissions are zero. Verify original and converted anonymous/user/tenant read and write outcomes, including denied writes, on disposable PostgreSQL before deployment.

Retaining policies does not select Better Auth or another auth provider. If an independently selected Better Auth migration has preserved UUID user identities and the dump references `auth.users`, add the existing explicit `--auth-mode better-auth-uuid`; only those relation references become `auth."user"`. Unsupported Auth/Storage dependencies still stop. Authenticate before the short `withRls` transaction; these transaction claims are trusted backend assertions, not protection from SQL injection or a compromised backend. Adopt context-ready application code before applying enforcement, and roll back only to a context-ready version.

### Existing server authorization mode

Only after the customer chooses Better Auth and its replacement server authorization/boundaries are implemented and reviewed, run:

```text
scripts/create-portable-baseline.mjs --input <dump> --output-directory <migrations> --migration-prefix <YYYYMMDDHHMMSS_slug> --auth-mode better-auth-uuid --authorization-mode server
```

This explicitly selected mode converts only executable `auth.users` and `auth.uid()` references, replaces the service-request helper, reports omitted RLS policies, retains admitted app-private functions, and splits output under platform limits. It keeps the existing `public.current_actor_id()` contract. Nonzero conversion/omission counts require review; they are never automatic approval. It is not a fallback when RLS preservation cannot translate a policy.

## Completion

Delete only the superseded Supabase database clients/configuration, roles, grants, RLS/JWT helpers, Functions and Storage calls after replacement tests pass. Preserve any explicitly retained external authentication integration; do not treat a database move as an auth migration. Then rerun init and verify the actual service-owned build, managed database and required public behavior. Rollback, repeated deletion and provider absence tests require the customer's separate authorization or disposable acceptance resources; do not delete the migrated application after an ordinary deployment. A root HTTP `200` is not completion.

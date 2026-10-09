# Calling the ohmyho.st database from your application

The server binding is `OHMYHOST_DATABASE`. Install the exact npm alias from
`ohmyhost init --dry-run --json` under `runtime.packages.customerRuntime` and commit the lockfile.
This applies to Next.js, TanStack Start, Vite companions and functions Workers alike.

```ts
import {
  createPrivateDatabaseClient,
  type CustomerDatabaseBinding,
} from "@ohmyhost/customer-runtime/database";

export default {
  async fetch(request: Request, env: { OHMYHOST_DATABASE: CustomerDatabaseBinding }) {
    const database = createPrivateDatabaseClient(env.OHMYHOST_DATABASE);
    const { rows } = await database.query({
      text: "SELECT $1::int AS ready",
      values: [1],
    });
    return Response.json(rows);
  },
};
```

Several statements that are decided before the first result arrives go in one transaction:

```ts
const results = await database.transaction([
  { text: "INSERT INTO notes(body) VALUES($1)", values: ["first"] },
  { text: "INSERT INTO notes(body) VALUES($1)", values: ["second"] },
]);
```

For database-enforced per-user rows, follow [backend row-level security](row-level-security.md).
Its `withRls(identity, callback)` opens a service-owned transaction after the application verifies
its user session. This is a coordinated new capability; check both the deployed service and SDK,
and never fall back to an ordinary query if RLS is unavailable. Existing `withConnection` lets the
caller control transactions and is not a replacement for the RLS scope.

For JSON/JSONB parameters, pass ordinary JavaScript objects, including nested objects and arrays:

```ts
const { rows } = await database.query({
  text: "SELECT $1::jsonb AS settings",
  values: [{ notifications: { channels: ["email"] } }],
});
```

The current client creates RPC-compatible plain objects and measures result depth from each row.
JSON keys may contain dates, ULIDs, dots, `@` and non-ASCII characters: each key must be 1–128 UTF-8
bytes without control characters, and must not be `__proto__`, `constructor` or `prototype`.
Older clients can reject otherwise valid JSON keys; upgrade the alias and lockfile together.
Verify an actual JSON write/read through the hosted application route. A scalar health query does
not exercise object serialization or prove that the application's database repositories work.

## What you cannot do, and why

- **No connection string or `pg` in customer code.** A customer Worker never receives a database URL
  and cannot open a socket: outbound `connect()` is disabled. A `pg` `Pool` or a platform URL
  is outside the customer runtime contract.
- **Interactive transactions are bounded.** Use `database.withConnection(callback)` for read-decide-write
  flows, sending `BEGIN`, your parameterized statements and `COMMIT` or `ROLLBACK` through the
  callback's `connection.query({ text, values })`; the client closes the connection in `finally`.
  Limits are two active transaction/auth connections per physical data area, 100 statements, 30 seconds
  total and five seconds idle; closing rolls back an uncommitted transaction. Standalone statements
  commit before their response; use explicit `BEGIN` and `COMMIT` when several calls must be atomic.
  Transaction-local timeouts release database slots even if the callback stops making requests.
- **Pool and result limits apply.** Each physical data area has one standalone-query lane and two
  transaction/auth lanes; shared Dev/Prod consume the same lanes. Each lane permits 32 waiting
  acquisitions, with a ten-second connection/wait bound and ten-second SQL statement timeout.
  `transaction()` accepts 1–25 preselected statements. A statement accepts SQL up to 64 KiB and
  100 parameters; each JSON parameter is at most 64 KiB, with a 1 MiB aggregate parameter budget. JSON depth is at most eight. Results are at most 1,000 rows, 10,000 values/nodes and 1 MiB.
- **Distinguish refused input from executed SQL.** The client refuses `PREPARE` outside
  `withConnection`, chained `COMMIT`/`ROLLBACK ... [NO] CHAIN` inside it, and an oversized JSON
  parameter before RPC as `database_query_invalid` (not retryable). Plain `PREPARE` inside a held
  connection is allowed. An oversized result (including more than 1,000 rows, 10,000 values/nodes or 1 MiB), or the 101st held statement, throws
  `CustomerDatabaseError` with `error.code === "54000"`, `retryable: false` and message
  `database_statement_failed: SQLSTATE 54000`. Page reads, split writes or open a new scope;
  retrying the same oversized statement cannot help.
  Each call contains one statement. `SET`, `RESET`, `DISCARD` and oversized input are refused
  before sending. Standalone `query()`/`transaction()` also refuse transaction-control SQL;
  use `withConnection` for `BEGIN`, `COMMIT`, `ROLLBACK` and savepoints. For a transaction-local
  application setting, run `SELECT set_config('app.user_id', $1, true)` after `BEGIN` in that scope.
- **End an open transaction after a result-limit error.** A write with `RETURNING`, or a `WITH`
  statement, is rolled back on an oversized result through `query()`, `transaction()` or an
  autocommit statement inside `withConnection`. Inside your own `BEGIN`, its effects remain in
  that open transaction: send `ROLLBACK`, or let the callback end without `COMMIT`. A scope idle
  for five seconds or open for thirty seconds closes and rolls back uncommitted work, answering
  `database_unavailable`; open a new scope instead of retrying on the closed connection.
- **Keep provider work outside that scope.** Finish a small database claim, close its connection,
  transfer/process the bounded file or call the provider, then open a fresh short transaction to
  persist the outcome. Waiting for an upload or AI response consumes the connection's idle lease.
- **Keep calendar days as calendar days.** SQL `DATE` and `date[]` elements return `YYYY-MM-DD`
  strings (an array may include `null`), without a
  timezone conversion. Timestamp values keep their existing decoding; do not convert every date
  field to midnight or slice an arbitrary timestamp to repair an application type mismatch.
- **Handle database conflicts by SQLSTATE.** A verified statement failure exposes its five-character
  PostgreSQL code on `error.code`, such as `23505` for a duplicate or `23P01` for an exclusion conflict.
  SQL text, row values and provider messages are not returned. Only serialization failure `40001`
  and deadlock `40P01` are marked retryable; retry the whole transaction within a bound. Transport
  failures remain `database_unavailable` and must not be mistaken for a rejected business action.
  Import `CustomerDatabaseError` from `@ohmyhost/customer-runtime`, not its `/database` subpath.
- **Use the actual server context.** Missing bindings answer non-retryable `database_binding_missing`.
  Pass `env.OHMYHOST_DATABASE`; in Next.js obtain `getCloudflareContext({ async: true }).env`.
  `process.env`, a browser bundle or a deployment without `database.enabled: true` has no binding.
- **Never detect the platform by probing a method.** A Workers service binding is a proxy, so
  `typeof binding.anything === "function"` is true for every name, including methods the receiver
  does not implement. The call then fails at runtime with an unimplemented-method error. Detect the
  platform by the presence of `OHMYHOST_PROJECT_ID`, or by your own capability flag.

## What it costs

The database sleeps when idle and bills by active compute. A query wakes it. Do not add a periodic
health query that keeps it awake; it turns an idle project into a billed one.

Dev and Prod may share one data area or use two isolated areas. A data assignment change never
copies records or sessions; read [the database Skill](../../ohmyhost-manage-database/SKILL.md)
before changing or resetting that assignment. Old Worker bindings continue only while their
immutable target stays unchanged and their logical environment remains continuously authorized.

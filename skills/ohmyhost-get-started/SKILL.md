---
name: ohmyhost-get-started
description: Connect a customer agent or native chat to ohmyho.st, verify the intended account and workspace, and continue an application from its saved source. Use managed OAuth for a remote chat and the existing local login for a terminal agent. Also use for account selection, customer support, or private automation credentials; use ohmyhost-deploy once access is ready.
---

# Start with ohmyho.st

Connect this agent to the customer's account, then continue with the selected app and its saved source.

## What ohmyho.st is and what you can do with it

ohmyho.st hosts a customer's app: Vite/React, TanStack Start, Next.js or a plain Worker
module with HTTP handlers and optional cron schedules. A coding agent uses the local MCP server or
CLI; a connected native chat uses the remote MCP server. Both use the same product REST contract.
Source can be a connected GitHub repository or an ohmyho.st-managed repository. Deploy an exact commit to Dev or Prod,
verify the app, and promote a tested Dev artifact when appropriate. Dev is protected by default;
the deployment Skill handles public Dev, data choices and the shared-database promotion rule.
You can also give the app Postgres, private runtime secrets, Cloudflare R2 files, optional
transactional mail and a custom domain, export its database as an encrypted SQL ZIP, and read
usage, credits and project budgets. The customer keeps their own application authentication;
nothing here replaces it. Sign-up is open and free to start.

The initial connection asks the customer to sign in and approve the access they want to give this
agent. GitHub authorization is needed only for the GitHub source route. A working saved local login
or API token can avoid another local sign-in; a remote chat uses its managed OAuth connection.
Optional payments, DNS/account consent or harness
reloads can require further customer action; use the relevant Skill for the feature they chose.

The local-agent path, and the proof that each step is done:

| Step | Result                                                        | Proof                                                                                                                         | Section      |
| ---- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 1    | You know what is installed and who is signed in               | `ohmyhost --version`, `ohmyhost whoami --json` or MCP `identity_get`, and the MCP tool list                                   | Step 1       |
| 2    | CLI and MCP are current and registered                        | Installed versions match the published release; the harness's MCP `tools/list` exposes the tools after any required reload    | Step 2       |
| 3    | The intended account is authenticated                         | `ohmyhost whoami --json` or MCP `identity_get` returns the intended user                                                      | Step 3       |
| 4    | A workspace is selected                                       | The identity returns the intended organization                                                                                | Step 4       |
| 5    | Access survives this session                                  | The same identity check succeeds from a fresh process with its chosen login or private token source                           | Step 5       |
| 6    | GitHub is connected and existing projects are known           | MCP `github_status` returns `connected`; `projects_list` identifies a project to reuse                                        | Step 6       |
| 7    | The repository is linked and the app is deployed and verified | MCP `source_get` confirms the linked repository; the deployment operation succeeds and the selected app URL passes its checks | Deploy Skill |

Each step is a separate result. Confirm it using the Proof column; a completed browser page,
a saved MCP configuration or a started process does not substitute for its returned state.

Which Skill to read next:

| The customer wants to …                                          | Skill                              |
| ---------------------------------------------------------------- | ---------------------------------- |
| prepare or adapt an app so it runs here                          | ohmyhost-build-portable-app        |
| convert a real Supabase database, Auth, Storage or Functions use | ohmyhost-migrate-supabase-postgres |
| deploy a commit, verify it, promote Dev to Prod                  | ohmyhost-deploy                    |
| deploy an explicitly selected GitHub repository                  | ohmyhost-deploy-github             |
| understand a queued, stuck or failed deployment, or report a bug | ohmyhost-troubleshoot-deployment   |
| read or change data, database size or Dev-to-Prod migrations     | ohmyhost-manage-database           |
| connect a custom domain or mail sender                           | ohmyhost-domains-and-mail          |
| export the database as an encrypted backup                       | ohmyhost-export-database           |
| see usage, credits or set a spending limit                       | ohmyhost-usage-and-budgets         |

Users normally reach this Skill from a prompt such as "connect this agent to ohmyho.st and deploy
this project". In that case finish the relevant access steps with as few messages as possible, then continue
with the deployment Skill without asking again for anything already decided.

## Native chat with a remote connection

Use this path when the enabled authenticated remote server exposes `connection_request`.
Discover its tools and call `identity_get`; do not install a CLI,
start a device-code login, or ask for an API key in this chat. The client completes the managed
OAuth sign-in itself. A configured plugin or completed browser page is not proof of authorization.

Verify the account and read `connection_grants` for the returned organization silently.
A returned `allow_create: true` records consent to create a new application, even when `projects`
is empty; do not request another project-selection approval just because that list is empty.
Every operation still checks current human and project authorization.
`allow_publish_created_projects` records consent inherited only by newly created apps; an existing
app needs its own entry in `projects`.
Reuse the customer's selected project when its grant allows the requested action. Otherwise
use `connection_request` for that exact
organization and the intended `project_ids`; request `allow_create: true` only when the user
wants a new application, and `allow_publish: true` only when they asked to publish. Prefer the
**Review connection** card when the client displays it; otherwise present the actual returned
private approval URL. Let the host preserve its actual return-to-chat context; pass `return_url`
only when the actual conversation URL is available, never derive it from an anonymized session
ID. After the user completes approval, verify `connection_status` with its `request_id` and
reread the grants silently. The browser must be signed in as the same person as the chat connection.
Continue with app creation, editing and Dev previews when authorized. Explain missing publication
permission only when a requested publication needs its own approval handoff; never promise
publication before that access is confirmed.

If the intended existing project is not yet visible to this client, request the workspace's
portal picker with `project_ids: []` and `allow_create: false`. The signed-in user selects their
existing project there. After approval, reread `connection_grants` and `project_list`; do not
invent a project ID or create a replacement application to gain visibility.

An identity with no organization needs `workspace_setup` before project work. Present its
returned portal URL and ask the customer to sign in there with the same connected account.
After setup, call `identity_get` again, then obtain the selected workspace's project grant.
Reconnect OAuth if its actual authorization response requires it. Never
guess an organization from a project name or treat identity-only access as a project grant.

Continue with **ohmyhost-deploy**. A new application developed entirely in this chat uses managed
source. Read the project's source and context before continuing a saved app; changing chats does
not create another project. Before using source connection/generation guards, request
`source_get` with `include_binding: true`; ordinary source selection may use its default
released GitHub view, while managed source includes those guards in either view.
For a complete native file tree or an explicitly requested GitHub-to-managed switch,
**ohmyhost-deploy** uses `source_upload_prepare`, `source_blob_put`, `source_upload`,
`source_upload_commit` or `source_switch`; retain the actual upload operation and receipts.
These remote tools accept bounded file contents, not local directory paths or credentials.
For private application credentials, use `secret_input_request` and its portal handoff,
then `connection_status`. Values stay out of chat, source, tools and logs.
If the required remote tools are unavailable, state that concrete capability gap; local device
tokens are not a substitute for a missing remote connection.

## How to talk to the customer here

- One action per message, in short plain sentences. Give the link, then what they will see.
- For native `connection_request` handoffs, use only one short localized sentence plus the actual
  **Review connection** card or returned approval link, such as "Please confirm the connection."
  Let the portal show the requested rights. Omit rights lists, routine status summaries such as
  "not confirmed" or "no app created", and timestamps or validity details unless the customer asks
  or an expired link needs action. Verify the actual grant internally after approval.
- Write in the language the customer writes in. Translate the message templates below; copy no
  other sentence from this file into the chat.
- Keep customer-facing messages focused on the action and why it is needed. Avoid narrating
  routine internal steps; explain an actual limitation when it prevents the requested work.
- After the verified connection, if the customer has not said what they want to build or host,
  ask only "What would you like to host?" in their language (for example, "Was möchtest du hosten?").
  If the app or task is already known, continue directly without this question.
- Keep raw account/grant IDs, permission tables, `projectId: null` and routine access diagnostics
  out of normal chat replies. Use recognizable account or application names when a choice is needed.
- Wait for required browser input before taking actions that depend on it. Independent repository
  inspection can continue while the customer signs in; do not start another sign-in for the same
  account or repeat the instruction without new information. Respect the customer's existing authorization and scope.
- Never ask for a password, an email code or a token value. Never paste a credential into chat,
  source or a command argument.
- After they report back, verify with a command instead of trusting the report.

## Prepare a domain before the first deployment

A customer can authorize Cloudflare before the website is live. Follow the domains Skill: plan the requested hostname, apply it once and retain its idempotency key. `awaiting_deployment` means the name is declared, with no DNS changes, certificate or domain charges yet. Return the Cloudflare authorization URL, verify consent, then deploy and verify Prod on the platform address. Repeat the same domain apply to activate the hostname. The callback and a successful deployment never switch customer DNS by themselves. A current CLI/MCP is required to read the new state.

## Prepare a Next.js application

For Next.js, run the portable-app inspection before deployment. Its supported versions match the pinned OpenNext adapter; update package.json and its lockfile when inspection reports an unsupported version. Runtime data files need Next's normal file tracing. MDX that compiles JavaScript at request time must instead compile to static ES modules during the build; the portable-app Skill describes that conversion. Verify every content route the app uses before calling a deployment complete.

Next.js pages rendered during the build use a private, immutable cache. Its capacity defaults to
32 MiB; CLI/MCP 0.1.28 or later accept optional `build.ssg_cache_max_mib` in `ohmyhost.yaml`, an
integer from 1 to 64. Public static assets retain their separate 25 MiB allowance. The selected
cache, public assets, Worker modules, migrations and archive metadata together must fit the
deployment artifact ceilings of 30 MiB compressed and 64 MiB expanded. Choose a cache capacity
that leaves room for the other archive contents. See the
[portable-app runtime contracts](https://ohmyho.st/skills/ohmyhost-build-portable-app/references/stack-contracts.md)
before changing a limit. Cache storage has provider cost 0, so cost × 1.5 is still 0 credits; build and
runtime charges continue unchanged. New deployments replace this build-time cache; time-based
and on-demand revalidation and Cache Components are not supported.

## Step 1 — determine the state before doing anything

If the customer's prompt names an account ("Use my ohmyho.st account user … in organization …"),
read "Several accounts on one computer" first. Use that login's `--profile-name` on authenticated
checks when needed. Then run these checks:

```sh
ohmyhost --version
ohmyhost whoami --json
ohmyhost profile list --json
```

Also list the MCP tools of the `ohmyho` server. A saved configuration alone is not a working connection.

Read the result:

| Observation                                               | State                      | Continue with    |
| --------------------------------------------------------- | -------------------------- | ---------------- |
| `ohmyhost` missing, or the MCP server exposes no tools    | not installed              | Step 2           |
| `--version` is older than the published release           | outdated                   | Step 2           |
| CLI runs, `whoami` fails with `authentication_required`   | installed, signed out      | Step 3           |
| `whoami` fails with `credential_store_unavailable`        | no usable credential store | Step 5           |
| `whoami` returns an identity with an organization         | ready                      | Step 5           |
| `whoami` returns `next_action` instead of an organization | signed in, no workspace    | Step 4           |
| `whoami` fails with `profile_selection_required`          | several saved logins       | Several accounts |

`whoami` selects the workspace itself when the customer has exactly one, so an identity that
arrives with an organization needs no workspace step. Without an organization, `next_action`
means the choice would be a guess or no workspace exists yet. With an organization,
`next_action` can name `github connect`: that workspace has no GitHub connection yet, and Step 6
handles it.

If `OHMYHOST_TOKEN` is set in this process, that token is the credential: the CLI and MCP ignore any
saved login. Verify its returned identity, organization and selected platform against the task,
even if a browser is already signed in. If `whoami` succeeds for that account, go to Step 5 without
starting another login. If it fails, ask the customer to update the private credential source,
not to paste a replacement value into chat.
Do not send them to a sign-in link, because `ohmyhost login` refuses to run while the variable is set.
With a working token, `profile list` can still answer `credential_store_unavailable` on a host
without a credential store; no repair is needed unless the task names a saved login.

Say nothing about a state that needs nothing from the customer. A ready agent deploys without a
single question. Report a state only in the message that also asks them to act, so they never
receive one message about the problem and a second one about the link.

## Several accounts on one computer

Each `ohmyhost login` saves one login: one user in one organization, kept in the operating
system's credential store. `ohmyhost profile list --json` (MCP `profile_list`) shows each login's
name, user and organization, never a token. There is no active login for the whole computer: with
one saved login every command uses it; with several, every command names one with
`--profile-name NAME`, MCP tools take `profile_name`, and `OHMYHOST_PROFILE=NAME` binds a whole
process or MCP server. A command with `--organization` (MCP `organization_id`) uses that
organization's login by itself. A project command can also select it from a checkout link,
including a link for its explicit `--project`; `whoami` and `project list` do not select a login
from checkout links, so name one when several are saved. `ohmyhost init` uses no login and
refuses `--profile-name`. Another agent's choice never changes which account your command runs as.

- When the prompt names a user and an organization, act only as the saved login with exactly that
  user and organization, and confirm it with `whoami --profile-name NAME` before any change. These
  IDs are context, not credentials. Never guess an account and never use another login instead.
- If no saved login matches, add it and send its link and code as in Step 3:
  `ohmyhost login --organization ORGANIZATION_ID --user USER_ID --json`. If the browser is
  signed in as another account, the login saves nothing and answers `login_account_mismatch`:
  ask the customer to switch the browser to the named account (or use a private window), then
  repeat the login.
- When the prompt names only a user ("it has no organization yet"), use the saved login with that
  user and no organization, confirmed with `whoami --profile-name NAME`. If none exists, add it
  with `ohmyhost login --user USER_ID --json`, then continue with Step 4.
- `profile_selection_required` means several logins could run the command: ask the customer which
  account to use. `profile_not_found` names the login to add, `profile_context_mismatch` means the
  request contradicts its binding, organization or user, and `environment_token_context_mismatch`
  means `OHMYHOST_TOKEN` belongs to another account.
- A saved login never switches organizations. For another workspace, add its own login with
  `ohmyhost login --organization ORGANIZATION_ID --user USER_ID --json`.
  `ohmyhost logout --profile-name NAME` removes only that login.
- `secret_set_command` takes `profile_name` like every tool and returns a command that names the
  same login with `--profile-name` plus its user and organization (`--profile-user`,
  `--profile-organization`); an MCP server with `OHMYHOST_TOKEN` names its key's user and
  organization with `--token-user` and `--token-organization` instead. Keep those flags when you
  run the command, so the secret is written as exactly this account. A login of that name that
  belongs to another user or organization, for example on another computer, answers
  `profile_context_mismatch`. The key form runs only where `OHMYHOST_TOKEN` holds a key of that
  user and organization, never with a saved login: it answers `environment_token_required` without
  a key and `environment_token_context_mismatch` with another account's key. None of these
  refusals reads the value or sends anything.
- Tokens stay in the operating system's credential store; the list of saved logins (names, users
  and organizations, never a token) is kept in `~/.ohmyhost/profiles/`, so agents that sign in at
  the same moment never lose each other's login. One environment keeps up to 64 saved logins;
  beyond that `login` answers `profile_limit_reached` and saves nothing: ask the customer which
  saved login to remove with `ohmyhost logout --profile-name NAME`.
- One checkout can be linked for several organizations, one link each. With several links, name
  the login with `--profile-name`; an older link without organization is used only after the API
  confirms that the chosen login can see its project (`linked_project_organization_mismatch`
  otherwise).
- Errors that depend on the account name it in `acting_as`: `resource_not_found` with another
  account's login means the wrong login, `github_connection_required` means that workspace has no
  GitHub connection yet, and `repository_not_installed` means its GitHub App installation does not
  cover the repository.

## Step 2 — install what is missing

Read <https://ohmyho.st/llms.txt> and the [CLI/MCP installation guide](https://docs.ohmyho.st/agents/mcp).
Compare the installed versions with <https://ohmyho.st/client-release.json>: `ohmyhost --version`
names the CLI, and `npm ls --global --depth=0` lists both packages (`ohmyhost-mcp` has no
`--version` flag; it starts the server). When either is missing or older, install both from the
source already in use: the current archive URLs from that guide, or npm
(`npm install --global @amerged/ohmyhost-cli @amerged/ohmyhost-mcp`). Both provide the same
`ohmyhost` and `ohmyhost-mcp` commands, so uninstall one pair before switching to the other.
An older client lacks commands and rejects newer server responses with `response_contract_invalid`;
an older MCP server reports the same case as `client_request_failed` although connection and login
work. Upgrade both clients and reload MCP before treating either as a platform fault; if both are
current, report it with `feedback_submit`.

Read [harness setup](references/harness-setup.md) and register the local `ohmyhost-mcp` command with this harness's documented settings. Preserve other MCP servers, model choices and permission settings. Use `OHMYHOST_ENVIRONMENT=production` for CLI and MCP unless the customer explicitly selected the development platform.

Every CLI command and MCP tool is listed in [surfaces](references/surfaces.md); use it to find the exact name of a capability a customer asks for instead of guessing or assuming it is missing.

Reload the MCP connection after every install or upgrade, then verify `tools/list` and `resources/list`. A running server keeps the tool list it started with, so a freshly installed version is invisible until it restarts. Repeat Step 1 afterwards.

## Step 3 — the customer signs in once

```sh
ohmyhost login --json
```

When the prompt named a user and organization, add
`--organization ORGANIZATION_ID --user USER_ID`, so nothing is saved unless the browser signs in
as exactly that account. Each login is saved under a name derived from its organization;
`--profile-name NAME` chooses another (lowercase letters, digits, `-` and `_`, starting with a
letter or digit, at most 63 characters; another name answers `invalid_command`). If that name
already belongs to another saved login (`profile_name_conflict`), choose a different name;
remove the other login only when the customer asks.

Start it as a background process and read its output while it runs: a sign-in link, a confirmation
code such as `ABCD-EFGH` and how many minutes both stay valid appear on stderr at once. The
command waits up to 30 minutes for the customer and saves the login only when it ends by itself;
a harness timeout that stops it earlier saves nothing. The sign-in page shows the same code and
asks the customer to confirm it. Send one message with the full link, code and validity, then
wait for the customer while leaving the command running.

> I found no valid ohmyho.st login for this account on this computer. Open this link to connect it:
>
> [full link exactly as printed]
>
> The page shows the code **[code]**. Continue only if it shows exactly this code.
> Sign in there, or choose **Sign up** on that same page if you do not have an account yet.
> Link and code are valid for [minutes] minutes; if the page rejects the code, say so and I will send a new one.
> Tell me when you are done.

Rules for this step:

- Always show the code. Every message that carries a sign-in link also carries its code, the first
  time and after every repeated login. The customer checks it against the page; a code that
  appears on the page but never in the chat gives them nothing to check.
- Write the full link on its own line, exactly as the CLI printed it, so the customer sees the
  address before opening it. Never hide it behind words like "this link" or "sign-in link" and
  never shorten it; a bare address the chat makes clickable is fine. The customer types nothing.
- State how long link and code are valid, taking the number from the CLI's own message rather than
  inventing one.
- Do not ask whether they have an account. The same page serves both, so naming both costs one
  sentence and saves a round trip.
- Sign-up is open. There is no invitation, no waitlist and no access code. Never send the customer
  somewhere else to request access.
- Wait for the customer. The command completes on its own once they finish; do not start a second
  login while the first is still open.
- A confirmation code lives only a few minutes. While `ohmyhost login --json` still runs, it
  replaces a lapsed code by itself for up to 30 minutes and prints the new link and code: send
  them the same way. Run the original login command again, keeping its account flags, only
  after it ended with `device_authorization_expired`. This is expected, not a failure: do not
  report an error or suggest the customer did something wrong.

When the command returns, verify and continue:

```sh
ohmyhost whoami --json
```

## Step 4 — make sure a workspace is selected

`login` and `whoami` select the workspace themselves when the customer has exactly one, and their
response names the selected organization. They report `next_action` with several choices, and then
the customer decides; with no workspace at all, create the first one. `organization use` binds a
login that has no organization yet; a login that already has one keeps it (use a separate login
for another workspace, see "Several accounts on one computer").

Always look before creating. A verified first portal signup creates or reuses **My workspace**,
including a direct signup or one with an invalid referral. The customer may also have a workspace
from an earlier session:

```sh
ohmyhost organization list --json
ohmyhost organization use --organization "$ORGANIZATION_ID" --json
```

Create a workspace only when that list is empty, with a name the customer gave you:

```sh
ohmyhost organization create --name "$ORGANIZATION_NAME" --source "$SIGNUP_SOURCE" --idempotency-key "$ORGANIZATION_REQUEST_KEY" --json
ohmyhost whoami --json
```

- `--source` (MCP `signup_source`) is optional attribution. If the task mentioned a campaign,
  referral (`https://ohmyho.st/?r=ref-…`) or flag (`https://ohmyho.st/?r=flag-…`) link, pass its
  single accepted `r` value unchanged (lowercase letters, digits, `-` and `_`, starting with a
  letter or digit, at most 64 characters); otherwise omit it. The portal treats a malformed
  value as Direct, so missing or invalid attribution never blocks signup and earns no referral
  bonus. The server decides any once-per-user benefit: an eligible
  referral or active flag on the first workspace gives 1,000 credits and 30 days of Paid, and a
  registered campaign can add credits; promise nothing else. Attribution is never an access
  code or secret and is fixed per user: later workspaces pass the same Signup source shown on
  the portal's Profile page (omit the flag for Direct); another value answers `forbidden`.
- Reuse the same name, source and idempotency key after an interrupted response instead of creating a second organization.
- Creating a workspace selects it immediately for a login that had none; `whoami` or `identity_get` confirms the selection before you create a project. A login already in another workspace keeps it, and the response names the `login` that adds one for the new workspace.
- Over MCP, `organization_create`, `organization_list` and `organization_use` do the same and report the same `selected` workspace.
- Creating, listing and selecting a workspace need the interactive login. An API token can do none of them, and says so.
- Never create another workspace on your own when the customer already has one.
- A session that selected none lists no projects: `projects_list` and `ohmyhost project list` answer `organization_required` instead of an empty page. Select a workspace, then read the list again.

## Step 5 — keep access for later

The current CLI login is enough to continue; MCP uses it. Ordinary account connection,
development and deployment do not authorize creating a persistent API token.

`ohmyhost login` saves each login in the operating system's credential store, and MCP reads it
there. `credential_store_unavailable` means the CLI cannot use that store. On a desktop, ask the
customer to unlock it, then retry. In a container, CI runner or headless Linux, do not start a
sign-in that cannot be saved: ask the customer to create a user token at
<https://app.ohmyho.st/tokens> and load it as `OHMYHOST_TOKEN` from a private env file.

Only when the customer explicitly requests an automation credential and authorizes its
account, workspace and private output file, use `token_create` with `out_file`, or
`ohmyhost token create --organization ULID --name NAME --idempotency-key KEY --out .env.local --json`.
The client appends `OHMYHOST_TOKEN` once to that private env file, sets mode `600` and returns
only metadata; the value is never shown in the client result and cannot be read again. The file
name must start or end with `.env`, be ignored by Git or lie outside the repository
(`token_file_not_ignored`), and not already hold `OHMYHOST_TOKEN` (`token_file_has_token`).
Configure the process to load it. Preserve existing credentials and never put the value in chat,
source or a command argument. New user tokens remain valid until revoked; a general hosting
request is not consent for that lasting access. On replay, reuse the original private file.
If `token_file_changed` names an issued key that could not be saved, or
`token_value_unavailable` means the original file is unavailable, do not revoke or replace an
existing key automatically. Revoke or replace only the exact key covered by scoped customer
authorization; existing explicit cleanup authorization can cover that action without another
question. Otherwise explain the failed save and obtain that authorization first. Never change
an already working credential merely to make a replay return a new value.

`OHMYHOST_TOKEN` overrides the saved logins in any process where it is set. A token alone runs every
command in these Skills except these, which need the interactive login: `login`, `logout` (including
`logout --revoke`), `organization create|list|use`, and `token create|list|revoke`. Run those in a
process without the variable. Never delete a saved token file. A token belongs to one account and
organization: a command that names another (`--profile-name`, `--organization`, or a checkout
linked for another organization) is refused with `environment_token_context_mismatch` before
anything is sent.

## Step 6 — continue with the app

First use **ohmyhost-deploy** to resolve the saved source or the customer's explicit source
choice. The GitHub connection instructions below apply only to the GitHub route. A managed
source does not require a GitHub account, App installation, repository or provider token.

Confirm the selected directory and GitHub repository. Read `github_status` for the selected workspace. If it is not connected, an Owner or Admin uses `github_connect` (CLI below), opens its single `authorization_url`, then repeats the same request/key after the browser completes until the returned status is `connected`.

```sh
ohmyhost github status --organization "$ORGANIZATION_ID" --json
ohmyhost github connect --organization "$ORGANIZATION_ID" --idempotency-key "$GITHUB_CONNECT_KEY" --json
```

The one link handles the required installation/user authorization. Do not construct a second installation link, replay OAuth callbacks, or ask for an installation ID or provider token. Use the intended GitHub browser profile. A connected installation covers only its selected repositories; if one is missing, open `connection.settings_url` from status, add the repository and repeat its original source-link request/key.

MCP/REST returns these objects directly. CLI JSON wraps the handoff in `authorization` and status
in `github`: read `authorization.authorization_url` and `github.connection.settings_url`.
The handoff lives 30 minutes (`expires_at`). While `pending`, a `last_failure` of
`provider_unavailable` or `authorization_code_rejected` means reopen the returned
`authorization_url` with the same key. `failed` or `expired` is final: `account_admin_required`
needs the GitHub account owner or organization admin, `installation_access_required` means the
App was not installed for that account, `session_inactive` needs a fresh login by a workspace
Owner or Admin, and `denied` means the customer declined. Resolve the cause, then connect with a
new key for the same workspace; never poll a terminal failure.

Use `projects_list` to reuse a project and `project_context_get` when resuming one. Preserve an existing project's region. For a new project, an explicit customer region wins; otherwise use a browser-location hint supplied in the customer's onboarding prompt and send that region explicitly. Without either, ask once for US or EU. Never infer customer location from the agent/server IP. The API default remains US; the selected region cannot change later.

Continue with **ohmyhost-deploy-github** when GitHub is the selected source, or return to
**ohmyhost-deploy** for managed source. Login, workspace creation, source connection and project
linking are distinct results; check each returned state rather than treating a completed browser
page as deployment success.

For a repository containing several apps, run local `init` from its Git root and check that the
repository-root `ohmyhost.yaml` selects the intended `applicationRoot` before planning the pushed
commit. For example, `applicationRoot: apps/web` selects that app's sources and migrations;
an `ohmyhost.yaml` inside `apps/web` does not override the repository's selection. Compare the
local result with the plan's `application_root` and keep any admission diagnostic visible.

Support runs through this agent. When the customer needs help, reports a bug or asks for a feature, submit a redacted report with `feedback_submit` (CLI `ohmyhost feedback submit`), give the customer the receipt ID and read replies later with `feedback_status`; the **ohmyhost-troubleshoot-deployment** Skill describes a good report. Point the customer to https://ohmyho.st/contact only when they cannot sign in, a billing issue names `contact_support`, or they ask about privacy or the DPA. The customer page is https://docs.ohmyho.st/support.

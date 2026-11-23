---
name: ohmyhost-get-started
description: Sign a customer in to ohmyho.st and reach a first deployment. Use it first from a desktop, a cloud session or a container with a shell (one link, one code, one question, no token, no GitHub), from a chat that has the ohmyho.st remote tools, or from CI with a token. It checks that the account and workspace are the customer's, routes to the right Skill, and holds account selection, support, private automation credentials, the Owner's review of connected MCP clients and the routing of LLM, image, speech, classifier or OCR requests to the app Skill; use ohmyhost-deploy once access is ready.
---

# Start with ohmyho.st

Sign the customer in, check that the account and workspace are theirs, then continue with their app. Choose the row that matches what you have:

| The agent has                                                        | It signs in with                                                                                                                   | What the customer does                    |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| a shell with the customer's files: desktop, cloud session, container | a saved login for that account if `ohmyhost whoami --json` shows one; otherwise `ohmyhost login --json`, started in the background | opens one link, confirms one code         |
| a chat without a shell, and ohmyho.st remote tools are connected     | `identity_get`                                                                                                                     | nothing                                   |
| no person present (CI, scheduled automation)                         | `OHMYHOST_TOKEN` from the process environment                                                                                      | creates the token once, see the reference |

Connected remote tools never select the remote route for an agent that has a shell, and a connected account that differs from the customer's is not used. Whatever the route, confirm that the signed-in account and workspace are the ones the customer means before you create or deploy anything. The CLI alone is enough for every step; registering the MCP server is optional and never a condition of progress.

## With a shell: look first

```sh
ohmyhost whoami --json
```

Read the answer. Say nothing about a state that needs nothing from the customer: a ready agent deploys without a single question, and a state is reported only in the message that also asks them to act.

| `whoami` shows                                                                | State                                                | Do                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ohmyhost` is missing, or older than <https://ohmyho.st/client-release.json>  | not installed or outdated                            | [Install](#install)                                                                                                                                                                                                                                                                                                                                                                             |
| `authentication_required`                                                     | signed out                                           | [Sign in](#sign-in-with-one-link-and-one-code)                                                                                                                                                                                                                                                                                                                                                  |
| `credential_store_unavailable`                                                | this machine cannot keep a login now                 | The answer says why: a sandbox without access, a locked desktop store, or a refused file store whose path and reason it names. Fix that, then run it again. If a previous local workspace or credential store is unreachable in this session, say that concrete environment gap; never claim credentials were deleted, change the saved source or use an unrelated Review/demo account instead. |
| `internal_error` on macOS or Windows right after an install                   | the native credential module is missing              | [Install](#install) both clients again                                                                                                                                                                                                                                                                                                                                                          |
| `token_refresh_failed`                                                        | a saved login could not be renewed                   | Run it again in a minute; if it fails again, sign in again                                                                                                                                                                                                                                                                                                                                      |
| an identity with an organization                                              | ready                                                | Continue with [the hand-over](#after-sign-in); follow `next_action` when the answer has one                                                                                                                                                                                                                                                                                                     |
| an identity without an organization, and a `next_action`                      | signed in, no workspace                              | Read the final answer of the login (see below) and follow its `next_action`; [workspace](references/workspace.md)                                                                                                                                                                                                                                                                               |
| `profile_selection_required`, `profile_not_found`, `profile_context_mismatch` | several or other saved logins                        | [Several accounts](references/accounts.md)                                                                                                                                                                                                                                                                                                                                                      |
| `invalid_environment_token`, `environment_token_context_mismatch`             | `OHMYHOST_TOKEN` decides                             | [Automation tokens](references/automation-tokens.md); a token overrides every saved login, so verify its identity against the task. `environment_token_active` comes only from `login` and `logout`: unset the variable first                                                                                                                                                                   |
| `invalid_profile_binding`, `invalid_environment`                              | a wrong `OHMYHOST_PROFILE` or `OHMYHOST_ENVIRONMENT` | Correct the variable: a saved login name, or `development` or `production`                                                                                                                                                                                                                                                                                                                      |

A `next_action` next to an organization is advice, not a state: it can name publishing this directory as the first deployment, or the later step that connects GitHub. If the customer's prompt names an account ("Use my ohmyho.st account user … in organization …"), read [several accounts](references/accounts.md) first and name that login with `--profile-name` on every authenticated call.

## Install

Skip this when `ohmyhost --version` shows the published release or newer. On a machine without a terminal user (a cloud session, a container, CI), install both clients with Node 22 or newer:

```sh
npm install --global @amerged/ohmyhost-cli @amerged/ohmyhost-mcp
```

Release 0.1.72 is the oldest client that keeps a login in a container. `ohmyhost --version` names the CLI and `npm ls --global --depth=0` lists both packages (`ohmyhost-mcp` has no `--version` flag; it starts the server). Both provide `ohmyhost` and `ohmyhost-mcp`; uninstall one pair before switching to the other. The installer script at <https://ohmyho.st/0.sh> needs a terminal and says so. Read <https://ohmyho.st/llms.txt> and the [CLI/MCP installation guide](https://docs.ohmyho.st/agents/mcp) for the archive URLs. An older client lacks commands and rejects newer server responses with `response_contract_invalid`; an older MCP server reports the same case as `client_request_failed`. Upgrade both before you treat either as a platform fault, and report a fault that remains with `feedback_submit`.

Register the local `ohmyhost-mcp` command with the harness only when the customer wants MCP tools in this harness: read [harness setup](references/harness-setup.md), preserve other MCP servers and settings, reload the connection, and check `tools/list` and `resources/list`: a running server keeps the tool list it started with, so a new version is invisible until it restarts. Use `OHMYHOST_ENVIRONMENT=production` unless the customer explicitly selected the development platform. The [surface reference](references/surfaces.md) lists CLI commands, local MCP and remote MCP separately; reference entries do not prove that a host has exposed a new tool. [Client versions](references/client-versions.md) lists what older clients lack.

## Sign in with one link and one code

Start the login as a background process whose output goes to private files outside the checkout, so that no publication can upload them:

```sh
mkdir -p -m 700 "$HOME/.ohmyhost-login"
(umask 077; ohmyhost login --json > "$HOME/.ohmyhost-login/answer.json" 2> "$HOME/.ohmyhost-login/progress.txt" &)
```

The link, a confirmation code such as `ABCD-EFGH` and how many minutes both stay valid appear in `progress.txt` at once. If no link is there after a few seconds, the command ended: read `answer.json` (for example `credential_store_unavailable`) and fix that first. The command waits up to 30 minutes and saves the login only when it ends by itself; a harness timeout that stops it earlier saves nothing. When the prompt named a user and an organization, add `--organization ORGANIZATION_ULID --user USER_ID`, so nothing is saved unless the browser signs in as exactly that account. `--profile-name NAME` chooses the saved name (lowercase letters, digits, `-` and `_`, starting with a letter or digit, at most 63 characters; another name answers `invalid_command`); an existing name answers `profile_name_conflict`: choose another and remove the other login only when the customer asks.

Send **one message** with the full link, the code, the validity and the one question, in the customer's language (translate this template and copy no other sentence from this file into the chat):

> Open this link to connect ohmyho.st:
>
> [full link exactly as printed]
>
> The page shows the code **[code]**. Continue only if it shows exactly this code. It is valid for [minutes] minutes.
> No account yet? The same page creates one. If it says the code has expired, tell me and I send a fresh one.
>
> One question while you do that: should your app run in the **EU** or in the **US**?

Ask the question unless the customer's prompt already names a region or carries a browser-region hint; an explicit region wins, and a region cannot be changed later.

Rules for this message:

- Always show the code, in every message that carries a link, the first time and after every renewal. Write the full link on its own line, exactly as printed; never shorten it or hide it behind words.
- Take the validity from the CLI's own message. Do not ask whether they have an account; the same page serves both, and sign-up is open (no invitation, no waitlist, no access code), so never send the customer somewhere else to request access.
- The code lives five minutes. While the command runs it replaces a lapsed code by itself, up to 30 minutes in all, and prints the new link and code: send each renewed code as a **new message**. Run the original login again, keeping its flags, only after it ended with `device_authorization_expired`. That is expected, not a failure.
- If the sign-up page says it cannot verify that the user is human, tell the customer to try again, on a stable connection if possible; there is nothing to configure on your side.
- Never ask for a password, an email code or a token value, and never put a credential into chat, source or a command argument. Wait for the customer; do not start a second login while the first is open.

Wait until the customer says they are done, then verify instead of trusting the report:

```sh
ohmyhost whoami --json
```

If `whoami` still answers `authentication_required` after the customer says they are done, read `progress.txt` and `answer.json`: the login is either still waiting or it ended, and a second login must not start while the first runs. `answer.json` is the final answer of the login. When it reports that the first workspace was not confirmed, or asks for a choice between workspaces, follow its `next_action` exactly: it names the one command that repeats the identical request as the same caller, and `whoami` does not replace it.

## After sign-in

1. Confirm that the account and the workspace are the customer's before anything is created.
2. Continue with **ohmyhost-deploy**. A first deployment publishes the working directory as it is; GitHub is the later step for deployment on every push (see [GitHub](references/github-connection.md)). The first project takes the platform defaults, Dev protected by a shareable link and shared data, and reports them; the one question was EU or US.
3. An app that needs private values: a local agent sets each one through the CLI's standard input, with the complete command that **ohmyhost-deploy** shows, which needs a terminal on the customer's side. The protected one-hour form (`secret_input_request`) exists only in the remote connection; keep values out of chat, arguments and logs.
4. Progress is "source saved", then "deployment succeeded and the app URL passes its checks". A saved MCP configuration, a reloaded tool list or a finished browser page proves none of it.
5. The customer's workspace, region and project are in [projects and region](references/projects-and-region.md); a workspace is selected as in [workspace](references/workspace.md).

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
| add LLMs, images, speech, classifiers or OCR to the app          | ohmyhost-build-portable-app        |
| export the database as an encrypted backup                       | ohmyhost-export-database           |
| see usage, credits or set a spending limit                       | ohmyhost-usage-and-budgets         |

## Without a shell, and without a person

- **A chat with the remote tools.** Call `identity_get`; do not install a CLI, start a device login or ask for an API key in this chat. The client completes the managed OAuth sign-in itself. An identity with no organization needs `workspace_setup`: show its returned portal URL, ask the customer to sign in there with the same connected account, then call `identity_get` again. Details, `api_reference`, `secret_input_request` and the local/remote tool names are in [remote chat](references/remote-chat.md). If the remote tools are unavailable, say that concrete gap; local device tokens do not stand in for a missing remote connection.
- **CI or scheduled automation.** `OHMYHOST_TOKEN` is the credential: verify its identity with `ohmyhost whoami --json` against the task. If it fails, ask the customer to update the private credential source, never to paste a value into chat, and never send them to a sign-in link: `ohmyhost login` refuses to run while the variable is set. [Automation tokens](references/automation-tokens.md) has the whole route, including Native Auth permissions.

## How to talk to the customer

- One action per message, in short plain sentences. Give the link, then what they will see. Write in the language the customer writes in.
- Keep messages about the action and why it is needed; do not narrate routine internal steps. Keep raw account IDs, permission tables and routine access diagnostics out of normal replies; use recognizable account or application names when a choice is needed.
- After the verified connection, if the customer has not said what to host, ask only "What would you like to host?" in their language; if the app is already known, continue.
- Wait for required browser input before actions that depend on it. Independent repository inspection can continue while they sign in. Respect the customer's existing authorization and scope.
- Explain an actual limitation when it prevents the requested work, and do not repeat an instruction without new information. OpenAI and Claude use the same remote server catalog even when their imported Skills cover different workflows.
- After they report back, verify with a command.

## More

- [What ohmyho.st is](references/overview.md), [Make connections](references/make-connections.md), [domain preparation](references/domain-preparation.md), [Next.js preparation](references/nextjs-preparation.md), [connected MCP clients](references/connected-clients.md).
- Support runs through this agent. When the customer needs help, reports a bug or asks for a feature, submit a redacted report with `feedback_submit` (CLI `ohmyhost feedback submit`), give them the receipt ID and read replies later with `feedback_status` or `ohmyhost feedback status FEEDBACK_ULID --json`; the **ohmyhost-troubleshoot-deployment** Skill describes a good report. Point the customer to <https://ohmyho.st/contact> only when they cannot sign in, a billing issue names `contact_support`, or they ask about privacy or the DPA. The customer page is <https://docs.ohmyho.st/support>.

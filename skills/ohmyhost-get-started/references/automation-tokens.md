# Private automation credentials

Use a token only where no person is present (CI, a scheduled automation) or when the customer
explicitly asks for one. A customer's agent that has a shell signs in with `ohmyhost login --json`
instead, also in a container: see the router.

## Where a token comes from

The customer creates it once on the portal's **API Tokens** page, its own menu entry:
<https://app.ohmyho.st/tokens>, or <https://dev.app.ohmyho.st/tokens> for the development platform.
The value is shown once. The harness's secret store keeps it, so the value never enters the chat,
and the process reads it as `OHMYHOST_TOKEN`. A local MCP server needs the same variable in its own
`env` block. A token belongs to one account and workspace and can never create or select a workspace.

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

If `OHMYHOST_TOKEN` is set in this process, that token is the credential: the CLI and MCP ignore any
saved login. Verify its returned identity, organization and selected platform against the task,
even if a browser is already signed in. If `whoami` succeeds for that account, continue with the app without
starting another login. If it fails, ask the customer to update the private credential source,
not to paste a replacement value into chat.
Do not send them to a sign-in link, because `ohmyhost login` refuses to run while the variable is set.
With a working token, `profile list` reads only the list of saved logins, which can be empty;
no repair is needed unless the task names a saved login.

`OHMYHOST_TOKEN` overrides the saved logins in any process where it is set. A token alone runs every
command in these Skills except these, which need the interactive login: `login`, `logout` (including
`logout --revoke`), `organization create|list|use`, and `token create|list|revoke`. Run those in a
process without the variable. Never delete a saved token file. A token belongs to one account and
organization: a command that names another (`--profile-name`, `--organization`, or a checkout
linked for another organization) is refused with `environment_token_context_mismatch` before
anything is sent.

## Native Auth permissions

Native Auth management requires the separate `auth:read` or `auth:manage` permission in addition to current Owner authority. Existing tokens retain their recorded permissions; a token limited to environment secrets does not gain Native Auth access. For a project approved by the existing Native launch allowlist, a current Owner may explicitly authorize creation of a new Native-capable token with the needed permissions. Never revoke or replace an existing token without the customer's scoped authorization.

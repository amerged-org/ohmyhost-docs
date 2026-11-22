# Several accounts on one computer

Each `ohmyhost login` saves one login: one user in one organization, kept in the operating
system's credential store on macOS and Windows and in owner-only files on Linux. `ohmyhost profile list --json` (MCP `profile_list`) shows each login's
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
- If no saved login matches, add it and send its link and code as in the login block of the router:
  `ohmyhost login --organization ORGANIZATION_ID --user USER_ID --json`. If the browser is
  signed in as another account, the login saves nothing and answers `login_account_mismatch`:
  ask the customer to switch the browser to the named account (or use a private window), then
  repeat the login.
- When the prompt names only a user ("it has no organization yet"), use the saved login with that
  user and no organization, confirmed with `whoami --profile-name NAME`. If none exists, add it
  with `ohmyhost login --user USER_ID --json`, then continue with [workspace](workspace.md).
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
- On macOS and Windows tokens stay in the operating system's credential store. On Linux each login is
  a directory of owner-only files below `~/.ohmyhost/profiles/<service>/credentials/`, and a login in a
  container ends with the container's home directory. The list of saved logins (names, users and
  organizations, never a token) is kept in `~/.ohmyhost/profiles/`, so agents that sign in at the
  same moment never lose each other's login. One environment keeps up to 64 saved logins;
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

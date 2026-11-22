# Connect GitHub to the workspace

This applies only to the GitHub source route, which is the later step for deployment on every push. A managed source needs no GitHub account, App installation, repository or provider token.

Confirm the selected directory and GitHub repository. Read `github_status` for the selected workspace. If it is not connected, an Owner or Admin uses `github_connect` (CLI below), opens its single `authorization_url`, then repeats the same request/key after the browser completes until the returned status is `connected`.

```sh
ohmyhost github status --organization "$ORGANIZATION_ID" --json
ohmyhost github connect --organization "$ORGANIZATION_ID" --idempotency-key "$GITHUB_CONNECT_KEY" --json
```

The one link handles the required installation/user authorization, and whoever completes it must be signed in to the ohmyho.st portal as the same person who started it (otherwise the page says the link does not belong to an active request and nothing is consumed). Do not construct a second installation link, replay OAuth callbacks, or ask for an installation ID or provider token. Use the intended GitHub browser profile. A connected installation covers only its selected repositories; if one is missing, open `connection.settings_url` from status, add the repository and repeat its original source-link request/key.

MCP/REST returns these objects directly. CLI JSON wraps the handoff in `authorization` and status
in `github`: read `authorization.authorization_url` and `github.connection.settings_url`.
The handoff expires at the `expires_at` it returns, and the remote `github_connect` link lives 10 minutes; never assume a longer life. While `pending`, a `last_failure` of
`provider_unavailable` or `authorization_code_rejected` means reopen the returned
`authorization_url` with the same key. `failed` or `expired` is final: `account_admin_required`
needs the GitHub account owner or organization admin, `installation_access_required` means the
App was not installed for that account, `session_inactive` needs a fresh login by a workspace
Owner or Admin, and `denied` means the customer declined. Resolve the cause, then connect with a
new key for the same workspace; never poll a terminal failure.

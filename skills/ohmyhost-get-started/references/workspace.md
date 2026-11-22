# Make sure a workspace is selected

`login` and `whoami` select the workspace themselves when the customer has exactly one, and their
response names the selected organization. A first sign-up gets **My workspace** from `login` itself.
They report `next_action` with several choices, and then the customer decides; when the answer of
`login` reports that the first workspace was not confirmed, it names the one command that repeats
the identical request. Never create a second workspace to recover. `organization use` binds a
login that has no organization yet; a login that already has one keeps it (use a separate login
for another workspace, see "Several accounts on one computer").

Always look before creating. A verified first portal signup and a verified first device login
both create or reuse **My workspace**, including a direct signup or one with an invalid referral.
The customer may also have a workspace from an earlier session:

```sh
ohmyhost organization list --json
ohmyhost organization use --organization "$ORGANIZATION_ID" --json
```

Create a workspace only when that list is empty and the answer of `login` named no command for it:

```sh
ohmyhost organization create --name "My workspace" --idempotency-key "$ORGANIZATION_REQUEST_KEY" --json
ohmyhost whoami --json
```

- `--source` (MCP `signup_source`) is optional attribution; leave the flag out when there is none, and never pass it empty. If the task mentioned a campaign,
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
- Never create another workspace on your own when the customer already has one. One user can start at most five new workspaces per hour; a sixth request answers `forbidden`, so reuse an existing workspace instead of retrying.
- A session that selected none lists no projects: `projects_list` and `ohmyhost project list` answer `organization_required` instead of an empty page. Select a workspace, then read the list again.

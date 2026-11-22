# Native chat with a remote connection

Use this path when the task's established access context calls for the authenticated remote
server.
Discover its tools and call `identity_get`; do not install a CLI,
start a device-code login, or ask for an API key in this chat. The client completes the managed
OAuth sign-in itself. A configured plugin or completed browser page is not proof of authorization.

Verify the account with `identity_get` and use `project_list` to find the intended project.
Current workspace membership, role and any explicit token restrictions determine access. Continue
with the requested work when authorized; a role denial needs the appropriate workspace role,
not a separate project approval. Do not create a replacement project to gain visibility.

An identity with no organization needs `workspace_setup` before project work. Present its
returned portal URL and ask the customer to sign in there with the same connected account.
After setup, call `identity_get` again. Never guess an organization from a project name.

Continue with **ohmyhost-deploy**. A new application developed entirely in this chat uses managed
source. Read the project's source and context before continuing a saved app; changing chats does
not create another project. Before using source connection/generation guards, request
`source_get` with `include_binding: true`; ordinary source selection may use its default
released GitHub view, while managed source includes those guards in either view.
For a complete native file tree or an explicitly requested GitHub-to-managed switch,
**ohmyhost-deploy** uses `source_upload_prepare`, `source_blob_put`, `source_upload`,
`source_upload_commit` or `source_switch`; retain the actual upload operation and receipts.
These remote tools accept bounded file contents, not local directory paths or credentials.
For private application credentials, use one `secret_input_request` per project and environment.
Pass up to ten distinct secret names with `names`, or use `name` for the existing single-secret flow.
Share its one `url` only with the person setting the values. The link needs no sign-in and expires
one hour after creation. Grouped forms have Dice, Copy and Show/Hide for each field.
For a single `name`, **Generate token** creates and copies the value in the browser. The Copy
and Show/Hide controls are also available for that field.
One valid Save consumes the link. For a group, check the name-only results in `connection_status`
and report separately which names were saved, failed or remain unconfirmed. Request a fresh link
for failed names and verify unconfirmed writes before retrying them. For an existing single-secret
link, confirm the name with `secrets_list` before relying on `secret_submitted`.
For a Native Auth provider link, `secret_uncertain` means the person can reopen the original
protected form and use the same value to retry the same request. Use the local stdin path
(`secret_set_command` or CLI stdin) for multiline values such as PEM keys. Keep secret values out
of chat, tool arguments and logs. Use the connector's `tools/list` to find remote tools and the
[surface reference](references/surfaces.md) to distinguish local from remote tools.
If the required remote tools are unavailable, state that concrete capability gap; local device
tokens are not a substitute for a missing remote connection.

For an unfamiliar capability, inspect the named tools and use remote `api_reference` when exposed.
It reads bounded API summaries or schemas with the compiled contract hash and explains each operation's
named tool, protected handoff, equivalent workflow or explicit exception. This Master Tool Contract is
documentation, not an executable API proxy. A documented operation is not callable unless its named
tool is available in this host. New/changed OpenAI tools can be held for continuous checks while old
definitions remain available; imported Skill/listing changes have their own package review. Preserve
working OAuth instead of reconnecting merely because a tool definition has not refreshed.

Some established local names differ from the remote workflow names. Use local `projects_list` /
remote `project_list`, local `deployments_list` / remote `deployment_list`, local `promotion_execute` /
remote `deployment_promote`, and local `rollback_execute` / remote `deployment_rollback`.
Mail setup/status use remote `mail_domain_set` / `mail_domain_status`; local examples may use
`mail_setup` / `mail_status`. Local `operation_logs` has no remote stream equivalent: use bounded
`operation_get` / `deployment_logs`. For any other mismatch, look up the operation with `api_reference`
and follow an actually exposed named tool or its stated limitation; do not guess an alias or switch identity.

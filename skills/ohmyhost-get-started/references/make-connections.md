# Connect and import from Make

A signed-in user can connect Make to a workspace before creating a project. Run
`ohmyhost connection begin --organization ULID --idempotency-key KEY --json`, or use
`integration_connection_begin` with the workspace ID and idempotency key. Open the protected
consent link and complete sign-in and approval. `connection status` and `connection list`, or
`integration_connection_status` and `integration_connection_list`, show the request and the
user's workspace grants. Provider credentials stay private.

Use `connection discover --organization ULID --grant ULID --json` or
`integration_connection_discover` to choose a Make organization, then supply its ID to discover
teams and both organization and team IDs to discover connections. Confirm the destination project
and environment with the user, then use `connection import` or `integration_connection_import`
with the grant, project, environment and all three selected Make IDs. Each destination requires
its own import; the same workspace grant can serve multiple authorized projects.
Older project-bound grants still require their original project and environment for discovery.
Each import records a reference to the selected Make connection.

If the owner needs a new connection or key for a Make standard app, use
`integration_credential_request_create` with the workspace grant, verified Make
organization and team, and concrete module IDs or published Endpoint names for
the app version. Ask for the Make zone and team only when you cannot identify
them from the request and discovery. Make derives the credentials and scopes.
Give the requesting owner the private Make authorization link returned by the
tool. Use `integration_credential_request_status` with the returned request ID
to check authorization. Discover the resulting connection before importing it.
Retry the same selections with the same idempotency key. Verify an uncertain
result before starting another request. Reconnect requires the owner's explicit
authorization to disconnect an existing grant.

Use the Make Endpoints SDK definitions to find a published Endpoint for the selected app and
connection. Bind it in the intended project and environment with the ohmyho.st SDK or REST.
Store the action key as a server-side runtime secret and use the SDK or REST to run the action.

If the Endpoint definitely did not dispatch, you can use an explicitly bound Make API Shell.
Use an active, on-demand, three-module app-specific scenario with the exact imported connection,
fixed method and origin-relative path prefix. Share the
[Make API Shell ZIP](https://raw.githubusercontent.com/sebmer-com/make-skills/2b053dbd2d4892e17a485e9999a2dd9745443da7/dist/make-api-shell-connection-workflow.zip)
with the user so they can install the skill in a compatible agent. Follow the hosted shell scope
and setup in the [Make connections guide](https://docs.ohmyho.st/make-connections).

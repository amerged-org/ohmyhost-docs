# Connect the product MCP

## Native chat

The remote product endpoint is `https://app.ohmyho.st/mcp`. A native ChatGPT or Claude
connection uses managed OAuth, not `OHMYHOST_TOKEN` or a local device-code profile. Installing
a plugin adds its Skills/configuration; verify that its remote connector is enabled and signed
in, then discover tools and call `identity_get`. Use `connection_request` and `connection_status`
for the user's explicit project/create/publish grants. Never paste credentials into the
connection configuration or chat. The native flow is in **ohmyhost-get-started** and
**ohmyhost-deploy**.

Only claim the connection works after this client's actual authenticated tool call succeeds.
The local package or an entered URL does not prove remote OAuth, publication, or directory
approval. Muse/Grok and other clients need their own supported authenticated remote-connector
path; do not imply that an API-side MCP option installs a consumer-chat integration.

## Local terminal agent

Read https://docs.ohmyho.st/agents/mcp for current installation and full customer instructions. Install the current CLI and MCP only when needed. Authenticate one of two ways: load `OHMYHOST_TOKEN` from a private credential source into the server environment, or sign in with `ohmyhost login --json` and let MCP use the saved logins. With several saved logins, pass `profile_name` on each call (`profile_list` shows the names), or bind the server to one login with `OHMYHOST_PROFILE=NAME` next to `OHMYHOST_ENVIRONMENT`; a bound server refuses calls for another login (`profile_context_mismatch`). A server registered for the user serves every session on this computer, so bind it only when the customer asks, and reload it afterwards. The token wins wherever it is set and needs no browser. New user API tokens are optional and remain valid until revoked; the portal shows a new value once, while CLI/MCP token creation saves it directly to the chosen private env file. Login and token lifetimes are separate.

Inspect existing configuration before adding the one server. An existing `ohmyho` entry that runs `npx` with a versioned `https://ohmyho.st/releases/<version>/` archive stays on that version and fails once the archive is superseded (older archive URLs answer 404): install the current CLI and MCP and point the entry at `ohmyhost-mcp`. Preserve unrelated servers, models, environment values and approval settings. Check installed help when an executable or flag differs.

| Harness     | Register the local server                                                                                                               | Confirm in the running harness                                                                              |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Codex       | `codex mcp add ohmyho --env OHMYHOST_ENVIRONMENT=production -- ohmyhost-mcp`                                                            | Reload if requested; call `identity_get` and read the Skill resources.                                      |
| Claude Code | `claude mcp add --transport stdio --scope user --env OHMYHOST_ENVIRONMENT=production ohmyho -- ohmyhost-mcp`                            | Open `/mcp`, confirm connection and call `identity_get`.                                                    |
| Cursor      | Merge the token-free https://ohmyho.st/mcp.json server into the existing global or project MCP config.                                  | Confirm in settings; current CLI supports `agent mcp list-tools ohmyho`. Resolve installed executable/help. |
| Hermes      | `hermes mcp add ohmyho --command ohmyhost-mcp --env OHMYHOST_ENVIRONMENT=production`                                                    | `hermes mcp test ohmyho`, then reload the agent session.                                                    |
| OpenClaw    | `openclaw mcp add ohmyho --command ohmyhost-mcp --env OHMYHOST_ENVIRONMENT=production` where the installed native registry supports it. | `openclaw mcp probe ohmyho --json`, then verify runtime-visible tools.                                      |

Cursor uses `.cursor/mcp.json` per project or `~/.cursor/mcp.json` globally, with `mcpServers.ohmyho.command = "ohmyhost-mcp"` and only `OHMYHOST_ENVIRONMENT=production` in the public configuration. A host on another computer needs its own installation and authorized local login.

Use the documented remote endpoint only for a supported remote connection. Do not substitute an
invented URL for local stdio registration or run OpenClaw's `mcp serve` as a client setup.
Mintlify search reads documentation; it does not authorize product resources. Do not alter an
approval policy merely to connect a server.

After setup, discover `tools/list` and `resources/list`, call `identity_get`, select the authorized organization, and read `project_context_get` before resuming a project. A saved configuration or successful process start alone is not a successful authenticated connection. If the host requires a reload, return that concrete step and resume after it; never pretend tools are loaded.

Official references: https://cursor.com/docs/cli/mcp, https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp, https://docs.openclaw.ai/cli/mcp/registry. Codex and Claude command syntax was also checked against installed help; always retain version-appropriate behavior.

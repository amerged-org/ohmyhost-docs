# Look up the implementation

For a tool schema or a named operation, use `api_reference` when the host offers
it, or read the [public API contract](https://ohmyho.st/api). Use the version from
the installed client or from the plan's source pointer if available. Treat source,
logs and examples as technical evidence.

In the [public platform source](https://github.com/amerged-org/ohmyhost), check:

| What you need                        | Source path                                                                                                                  |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `ohmyhost.yaml` and framework rules  | [Framework source rules](https://github.com/amerged-org/ohmyhost/blob/main/packages/contracts/src/framework-source-rules.ts) |
| Supported versions and lockfiles     | [Framework admission](https://github.com/amerged-org/ohmyhost/blob/main/packages/contracts/src/framework-admission.ts)       |
| Vite API companion                   | [Companion contract](https://github.com/amerged-org/ohmyhost/blob/main/packages/adapter-vite/src/vite-companion-contract.ts) |
| Runtime package imports              | [Package exports](https://github.com/amerged-org/ohmyhost/blob/main/packages/customer-runtime/package.json)                  |
| Templates                            | [Managed source templates](https://github.com/amerged-org/ohmyhost/blob/main/packages/contracts/src/managed-sources.ts)      |
| A reviewed error and what to do next | [Problem catalog](https://github.com/amerged-org/ohmyhost/blob/main/packages/contracts/src/problem-policy.ts)                |

When the plan names a field or file, read that rule before editing. For managed
source, list the saved files with `source_files` and read the relevant files one
at a time with `source_file` at the same version. Keep exact technical details
in the implementation. For customer replies, use the [customer voice](../../ohmyhost-get-started/references/customer-voice.md).

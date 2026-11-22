# Client versions and what each introduced

Use the CLI and the local MCP server of the same current release together; the oldest release that keeps a login in a container is 0.1.72. Native Auth management commands and tools require version 0.1.50 or newer. Older clients reject the credits and usage
responses that 0.1.41 and 0.1.43 changed (credits is now only the balance) with
`response_contract_invalid`, the native `psql` access transport needs 0.1.39 or newer, the
database webhook, schedule and executions commands and tools need 0.1.42 or newer, the
`database watch` commands and tools need 0.1.45 or newer, and the `database table` commands and tools need 0.1.46 or newer. The `ai` block in `ohmyhost.yaml` needs 0.1.47 or newer: `ai: {enabled: true, jurisdiction: eu}` (or `any`) declares LLM, image, speech, classifier and OCR use, and `jurisdiction` is required whenever `enabled` is true. A Vite app with `ai` uses `runtime.mode: edge` and a companion Worker, as the init refusal names. Models are served through [orq.ai](https://orq.ai). `ohmyhost whoami` and MCP `identity_get` return the current account's email and the
credential's organizations with IDs and current names. Compare that email and workspace with the account the customer intended before
changing resources. Service credentials have `email: null`.

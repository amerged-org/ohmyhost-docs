# What ohmyho.st is and what you can do with it

ohmyho.st hosts a customer's app: Vite/React, TanStack Start, Next.js or a plain Worker
module with HTTP handlers and optional cron schedules. A coding agent uses the local MCP server or
CLI; a connected native chat uses the remote MCP server. Both use the same product REST contract.

See [amerged-org/ohmyhost](https://github.com/amerged-org/ohmyhost) for the ohmyho.st hosting platform (OMH) and [amerged-org/cloudflare-postgres](https://github.com/amerged-org/cloudflare-postgres) for its PostgreSQL infrastructure (PGCF).

Source can be a connected GitHub repository or an ohmyho.st-managed repository. Deploy an exact commit to Dev or Prod,
verify the app, and promote a tested Dev artifact when appropriate. Dev is protected by default;
the deployment Skill handles public Dev, data choices and the effects of shared databases.
You can also give the app Postgres, private runtime secrets, Cloudflare R2 files, optional
transactional mail, LLMs, images, speech, classifiers and OCR through an OpenAI-compatible gateway, and a custom domain, export its database as an encrypted SQL ZIP, and read
usage, credits and project budgets. The customer chooses application authentication.
Omh Native Auth requires launch approval for the project and current Owner authority to configure it. The project needs Paid access, its own authorized verified sender and the approved application identity and origin. Check readiness and the actual hosted flow before reporting success. For Google or GitHub, use the customer's own OAuth app and the exact callback returned for the selected environment. Follow the [application authentication guide](https://docs.ohmyho.st/application-auth) for setup. Choosing Native does not authorize a provider migration or copying users. See the [runtime contracts](../ohmyhost-build-portable-app/references/stack-contracts.md) for the requirements. Sign-up is open and free to start.

The initial connection asks the customer to sign in and approve the access they want to give this
agent. GitHub authorization is needed only for the GitHub source route. A working saved local login
or API token can avoid another local sign-in; a remote chat uses its managed OAuth connection.
Optional payments, DNS/account consent or harness
reloads can require further customer action; use the relevant Skill for the feature they chose.

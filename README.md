# ohmyho.st documentation

Customer documentation at https://docs.ohmyho.st. Editorial MDX and navigation live in this repository.

OpenAPI, executable Skills, tool schemas, install snippets and Ω assets are synchronized from the reviewed platform release and listed in generated-content.json. Never edit those generated files independently. Platform synchronization preserves editorial pages. Mintlify generates llms.txt and llms-full.txt from the published documents; do not replace them with a stale copied index.

Install a Skill with `npx skills add amerged-org/ohmyhost-docs -s ohmyhost-get-started`. Validate content and broken links with the official Mintlify CLI before publishing.

Anyone can read the [ohmyho.st platform source](https://github.com/amerged-org/ohmyhost) to trace a build or deployment, and the [managed PostgreSQL source](https://github.com/amerged-org/cloudflare-postgres) to trace a database change. Your app’s code stays in your project. The hosting source uses Elastic License 2.0. PGCF uses Apache-2.0.

# ohmyho.st documentation

Customer documentation at https://docs.ohmyho.st. Editorial MDX and navigation live in this repository.

OpenAPI, executable Skills, tool schemas, install snippets and Ω assets are synchronized from the reviewed platform release and listed in generated-content.json. Never edit those generated files independently. Platform synchronization preserves editorial pages. Mintlify generates llms.txt and llms-full.txt from the published documents; do not replace them with a stale copied index.

Install a Skill with `npx skills add amerged-org/ohmyhost-docs -s ohmyhost-get-started`. Validate content and broken links with the official Mintlify CLI before publishing.

The PostgreSQL databases behind ohmyho.st run on [PGCF](https://github.com/amerged-org/cloudflare-postgres), an open-source PostgreSQL platform.

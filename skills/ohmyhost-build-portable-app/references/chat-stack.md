# Start a new app in chat

Use the managed `vite-react` template and TypeScript. Render the actual page at
`/`. For data or sign-in, use edge mode with the API companion at
`src/ohmyhost/companion.ts` for same-origin `/api/*` routes. Connect the form and
sign-in controls to these routes. Preserve the customer's choice of sign-in provider.
For a lightweight HTTP handler, server-rendered HTML or a scheduled job, use a
plain TypeScript Worker with `runtime.mode: functions`. Export `fetch` from
`src/ohmyhost/worker.ts` and put `scheduled` on the same default export for a cron.
Keep the starter's manifest and lockfile and enable only the capabilities in use.

For Next.js App Router, use a local checkout or GitHub repository with its matching
lockfile, or save the exact [pinned example bytes](stack-contracts.md#form-and-admin-apps)
where the host can write them. The server has no managed Next.js starter. Use the
Vite starter in chats that cannot save the example lockfile.

Use the [source pointers](source-pointers.md) for framework and application contracts.
When adding the Vite companion, keep the managed starter's runtime dependency in
`package.json`:

```json
"@ohmyhost/customer-runtime": "npm:@amerged/ohmyhost-runtime@0.1.82"
```

Keep the template's pinned pnpm version and its saved `pnpm-lock.yaml`. To add
packages in chat, put them in `package.json` and keep the saved lockfile. If the
frozen install reports a stale pnpm lockfile, preview and build can resolve the
added packages while preserving existing pins. The update runs on the server;
the saved lockfile stays unchanged. If it fails, use existing dependencies or
prepare a matching lockfile in a checkout. For upgrades, removals and other
package managers, use a checkout with the pinned manager and save the matching
lockfile with the manifest.

Save the real app and [open its private preview](../../ohmyhost-deploy/references/preview.md)
before deploying.

## Staff access and managed requests

For staff invitations and password resets, build email links from the server-configured
canonical HTTPS origin of the selected application environment. On projects
configured for Native Auth, the project Owner can invite a directory user and
the app assigns the tenant role. For app-owned auth, use its owner-authorized
bootstrap or a signed-in administrator with permission for that tenant. Verify
the delivered link, its single use, subsequent sign-in and any required MFA.

The starter pins customer runtime 0.1.82. For managed mail and storage on that
version, set the client's `fetch` and storage's `capabilityFetch` callbacks to
`(request) => fetch(request, { redirect: "manual" })`. An app built and
redeployed with runtime 0.1.85 receives this mode on SDK-created requests by
default. For an application-issued signed download,
use the returned URL and required headers with the same redirect mode.

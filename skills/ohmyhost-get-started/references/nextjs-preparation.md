# Prepare a Next.js application

For Next.js, run the portable-app inspection before deployment. The current security floor is 16.4.5, with no upper bound; planning and the build refuse older releases. The GitHub Advisory Database published [GHSA-mfr8-8qww-v76h](https://github.com/advisories/GHSA-mfr8-8qww-v76h) on 16 November 2026: it affects Next.js 16.3.0 through 16.4.4 and is fixed in 16.4.5. Next.js 16.4.0 and older 16.x releases had already been refused following the 22 October 2026 security advisories. A deployment that is already live keeps running, but an affected app remains exposed until rebuilt on a fixed release. When inspection reports an unsupported version, update package.json and its lockfile to the reported `minimum` or a later stable release, then commit and plan the new commit. Next.js 15 builds stopped on 21 October 2026, when the pinned OpenNext started refusing Next.js 15 as an unsupported major; a Next.js 15 app now moves to Next.js 16.4.5 or later. Use Next.js 16 for new work. A `create-next-app` 16.4 app with Tailwind CSS, its `--yes` default, loads Tailwind only through a Turbopack rule that the Webpack build here ignores; planning refuses it as `next_tailwind_turbopack_only` until the application root has a PostCSS configuration, as that refusal describes. Runtime data files need Next's normal file tracing. MDX that compiles JavaScript at request time must instead compile to static ES modules during the build; the portable-app Skill describes that conversion. Verify every content route the app uses before calling a deployment complete.

Next.js pages rendered during the build use a private, immutable cache. Its capacity defaults to
32 MiB; CLI/MCP 0.1.28 or later accept optional `build.ssg_cache_max_mib` in `ohmyhost.yaml`, an
integer from 1 to 64. Public static assets retain their separate 25 MiB allowance. The selected
cache, public assets, Worker modules, migrations and archive metadata together must fit the
deployment artifact ceilings of 30 MiB compressed and 64 MiB expanded. Choose a cache capacity
that leaves room for the other archive contents. See the
[portable-app runtime contracts](https://ohmyho.st/skills/ohmyhost-build-portable-app/references/stack-contracts.md)
before changing a limit. The immutable build-time cache has provider cost 0; writable cache backing
is platform-owned and has no separate customer file-storage charge. Build and runtime charges
continue unchanged. By default, new deployments replace this read-only cache and
on-demand revalidation is refused. An app on Next.js 16.4.5 may opt into the bounded writable cache
with `build.next_revalidate_path: true` for `revalidatePath` in Server Actions or Route Handlers;
the runtime contracts describe its response buffering and limits. Time-based ISR, `revalidateTag`
and revalidation deferred until after the response remain unsupported. Cache Components and `"use cache"` are supported:
request-time `"use cache"` values are never stored, build-time values stay until the next
deployment in the default mode, and each dynamic page needs a static shell. A CLI older than 0.1.33 still refuses Cache
Components in `ohmyhost init`; upgrade it instead of removing them. The runtime contracts list the
exact rules.

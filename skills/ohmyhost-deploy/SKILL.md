---
name: ohmyhost-deploy
description: Develop, version, preview and publish an application with ohmyho.st from a local checkout or a connected native chat. Reuse the saved project and source, select managed source or GitHub only when needed, and switch an existing project only on request. Use troubleshooting for a stuck deployment.
---

# Develop and deploy an app

Read available MCP tool schemas or installed CLI help. Complete access with
**ohmyhost-get-started**, preserving the user's selected account, organization and project.
Keep explanations in the user's language; users need app versions, a preview and a working
address, not the storage provider's implementation details.

## Select the source once

The saved project binding and `source_get` determine how to continue an existing application.
Reuse them before interpreting local Git remotes. Never silently replace a source because the
agent changed, a checkout was cloned, or a GitHub remote is missing on this computer.
For generation-aware inspection, initialization, commits or a source switch, request
`source_get` with `include_binding: true`. Its default preserves the existing GitHub view;
the opt-in returns the exact source connection and generation. Managed source already includes
those guards in either view. `ohmyhost source status` opts in for the local source workflow.

| Situation                                                           | Continue with                                                |
| ------------------------------------------------------------------- | ------------------------------------------------------------ |
| Existing managed binding                                            | Managed source on that project                               |
| Existing GitHub binding                                             | **ohmyhost-deploy-github**                                   |
| Explicit request to use GitHub                                      | **ohmyhost-deploy-github**, including GitHub setup if needed |
| Explicit request to store/deploy directly with ohmyho.st            | Managed source                                               |
| New application developed entirely in native chat                   | Managed source                                               |
| Unbound local checkout with a selected GitHub remote                | **ohmyhost-deploy-github**                                   |
| Unbound local checkout without GitHub and no explicit source choice | Ask once: "Keep versions with ohmyho.st, or set up GitHub?"  |

A local `.git` directory may belong to a non-GitHub host or have no remote. A copied GitHub
remote alone does not override the saved project binding. If the existing source conflicts
with an explicit new choice, use the source-switch flow after its concrete effects are reviewed.
The direct managed route requires neither GitHub signup nor a copied platform/device token.

## Local managed checkout

Run the installed source/deploy help and inspect the repository with `ohmyhost init --dry-run
--json`. Resolve real framework/configuration blockers through **ohmyhost-build-portable-app**;
preserve the app's authentication, migrations, selected application root and region. A supported
app needs its actual `ohmyhost.yaml` and lockfile, not a generated pretend-success result.

Use `ohmyhost source inspect --directory PATH --json` for read-only evidence, then
`ohmyhost source publish` to bind or continue the selected project. Inspect its installed help
before choosing `--mode initialize`, `commit` or the explicitly requested `switch`, and supply
the saved `--expected-source-generation` and source connection when that mode requires them,
with a concise `--message` and one saved `--idempotency-key`. For an existing managed checkout,
omit `--expected-commit` to use its own `last_confirmed_commit_sha` as the optimistic base.
Supply an explicit newer SHA only after reading and merging the other chat's changes into these
local files; never attach a newly fetched remote head to an unchanged stale checkout. It stages the filtered
application manifest, uploads the changed blobs and commits
the completed tree. Preserve executable bits. Exclude credentials, `.env` files, local caches,
dependency directories and build outputs. Do not require `git push` to GitHub for this route.
Save the returned project/source binding; the accepted server commit identifies the version
to plan and deploy. An upload is not itself a successful build or publication.

If publication is pending, poll its saved `operation_get` and then run
`ohmyhost source publish complete --project ULID --directory PATH --operation ULID --json`
under the same login. This confirms the persisted version and finishes the local binding.
Resume a pending upload from `source inspect`'s `pending_publications`; preserve its operation
and key. Completing an already authorized publication needs no second routing question.

| Local task                               | Installed command                                                                                                 |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Read the persisted source                | `ohmyhost source status --project ULID --json`                                                                    |
| List or read a version's files           | `ohmyhost source files` / `ohmyhost source file --path PATH`, with `--project ULID` and optional `--commit SHA`   |
| Inspect history or a diff                | `ohmyhost source versions` / `ohmyhost source diff --from SHA --to SHA`, scoped to the same project               |
| Observe a saved upload                   | `ohmyhost source upload --project ULID --operation ULID --json`                                                   |
| Finish an accepted local publication     | `ohmyhost source publish complete --project ULID --directory PATH --operation ULID --json`                        |
| Initialize an explicitly chosen template | `ohmyhost source initialize`, with the project, template, current source generation and saved key                 |
| Restore files as a new version           | `ohmyhost source restore`, with the current source generation/head, `--restore-commit SHA`, message and saved key |

Use the returned exact schemas and [the generated surface reference](../ohmyhost-get-started/references/surfaces.md)
for flags. Restoring files is separate from publication and does not import local Git history.
Local MCP exposes the corresponding `source_inspect`, `source_publish`, `source_publish_complete`, `source_upload`,
`source_initialize`, `source_files`, `source_file`, `source_versions`, `source_diff`,
`source_changes` and `source_restore` tools. `source_inspect` and `source_publish` operate on
this computer's checkout; never use their local paths as native-chat source files. Local
`source_publish` can use the cached optimistic base when `expected_commit_sha` is omitted;
`source_publish_complete` finishes pending work using the same project, directory and profile.
Local MCP `source_file` reads default to `format: "text"`: valid UTF-8 returns `content_text`
with `encoding: "utf8"`; a file that cannot be decoded returns base64. Choose `format: "base64"`
for exact binary contents. The REST/SDK wire format remains base64.

## Managed application in native chat

This workflow needs the authenticated remote tools; it has no local filesystem or shell
dependency. Use `connection_grants` and the approved `connection_request`/`connection_status`
flow from the get-started Skill before project actions.

1. Reuse the chosen project via `project_list`/`project_get` and read `project_context_get`. For a new
   app, use `project_create` with its approved organization, name, region, data mode and Dev
   access mode, `source_provider: "managed"` and the intended `template`. Choose `vite-react`
   for a basic web app, or `empty` for a specifically chosen supported stack. Preserve an
   existing project's region and data; do not infer region from an
   agent's IP. Shared Dev/Prod data requires Dev followed by promotion; isolated data permits
   independent environments and incurs separate database usage.
2. Follow the accepted project operation, then read `source_get` with `include_binding: true` until its managed source is
   `ready` and has a persisted commit. Creation queues source initialization after the project
   is provisioned; a completed project operation can still have `source.status: "pending"`.
   Keep polling that source rather than starting a duplicate initialization. A `failed` source
   needs its recorded failure diagnosed. When `initialization_operation_id` is returned, follow
   that actual child operation with `operation_get`; otherwise use the returned
   `initialization_error_code`. An `authorization_changed` failure needs the approved connection
   and project grant restored through **ohmyhost-get-started** before retrying the source action.
   For an existing project with no source and no pending
   initialization, `source_initialize` can create the explicitly chosen template under the
   current generation and a saved key. Observe that accepted operation and reread `source_get`
   before writing files. A GitHub source is not permission to initialize over it.
3. Read the manifest with `source_files`, then pass `path` for each relevant file at the current
   commit. `format: "text"` is the default; it returns `content_text` with `encoding: "utf8"`
   when valid UTF-8, otherwise `content_base64` with `encoding: "base64"`. Choose the explicit
   base64 format for binary contents. Apply purposeful
   batches with `source_changes`: exact `expected_source_generation`, `expected_commit_sha`,
   a concise commit `message`, and each changed path's plain UTF-8 `content_text` and executable
   flag. Supply exactly one content field per change: use `content_base64` for binary contents
   or `content_base64: null` to delete the file. Do not supply both text and base64. Preserve
   the returned executable flags when editing existing files. Reuse the idempotency key after an uncertain
   response. If another chat advanced the source, read the current version and reconcile the
   changes; never force-overwrite the other chat's work. Follow each accepted source operation
   to success, then read `source_get` for its persisted commit before planning a build.
   Source generation changes when a binding is initialized or switched, not on every commit;
   concurrent edits are guarded by the expected commit. Copy both guards from current state.
   A change batch accepts at most 2 MiB of decoded content. For a complete atomic tree or
   related edits larger than that batch, use the remote upload flow below rather than
   splitting one intended version into several unrelated commits.
4. Use `source_versions` and `source_diff` to inspect saved work. `source_restore` creates a
   new version from the selected earlier commit under the same revision guards; it does not
   delete history or roll back database migrations. Observe its accepted operation before
   reading the resulting current commit.
5. Set required application credentials using `secret_input_request` for the chosen environment.
   Give the private portal URL to the user and observe `connection_status`. `secrets_list` shows
   metadata only. Never put a password, model API key or runtime secret into a tool argument,
   source file, commit, project note or chat message.
6. Call `deployment_plan` for the exact accepted commit and `environment: "dev"`; review its
   real costs/effects within the user's existing authorization, then `deployment_create` with
   the plan and one saved key. Follow the same `operation_get` until its terminal state; use
   `deployment_get` and `deployment_logs` for diagnosis. A running operation is not a reason
   to start another build.
7. Read `project_status` for the Dev URL and access mode. Public Dev opens directly. For
   protected Dev, give the user the private reusable `share_url` from
   `project_dev_share_link_get`. To inspect it as the agent, use `project_dev_access_create`
   and open its one-time `redeem_url`; do not issue another ticket while the first is unused.
   Then verify the clean preview URL. Keep these entry links out of notes, source and logs.
   Verify the app's meaningful
   interaction, expected content and any requested data flow before calling it ready. If the
   chat cannot inspect the preview, say exactly what remains unverified and keep the same project.
8. Publish only when requested and allowed by the project's explicit publishing grant. Use
   `promotion_plan` then `deployment_promote` for the verified Dev deployment, including the
   exact ETag, confirmation and idempotency guards. Alternatively plan an exact commit into
   isolated Prod when that is the requested supported route. Prod needs its own secret inputs;
   they are not copied from Dev. Poll the accepted operation and verify the public result.

Return the project's working address, exact commit and verification result, plus any required
user action. Do not claim a plugin installation, finished OAuth page, saved commit or accepted
deployment proves that the app is live.

## Save a complete tree in native chat

Remote uploads use application file bytes, never a directory on this computer. Read the
complete intended files from the client's actual available file or repository context.
If that context or payload transfer is unavailable, state the concrete capability gap;
do not invent missing files or hashes. For a new app that starts from an uploaded tree,
choose an explicitly intended `empty` managed template, observe its initialization, then
commit the replacement tree. Use `initialize` only for a genuinely unbound project with
no pending initialization.

1. Read `source_get` with `include_binding: true`. Call `source_upload_prepare` once with
   `project_id`, `mode`, the original `expected_source_generation`,
   `expected_source_connection_id`, `expected_commit_sha`, a concise `message` and one
   saved `idempotency_key`. Initialize uses null connection/head and generation 0;
   commit uses the current managed connection/generation and reconciled parent SHA;
   switch uses the original GitHub connection/generation and a null parent. Retain the
   accepted `operation.id` as the upload's operation ID.
2. Call `source_blob_put` for each complete file with the same `project_id` and
   `operation_id`, its repository-relative `path`, `executable` flag, a saved per-file
   key and exactly one of `content_text` or `content_base64`. The server validates the
   actual bytes and computes SHA-256 and byte length. Keep its confirmed
   `{path, sha256, byte_length, executable}` receipt unchanged. Never supply or invent a
   hash or length. This is not a chunk-upload protocol for oversized individual files.
3. Finalize the complete intended `files` manifest, including unchanged files that should
   remain, from receipts of **this upload operation**. Every staged file must occur exactly;
   do not omit an already staged extra or replace a staged path's bytes/mode. An omitted
   previously saved path is absent from the replacement tree. Use `source_upload_commit`
   for initialize/commit with the upload's `operation_id`, original generation and one
   finalize key. Use `source_switch` only for switch mode, as described below.
4. Observe the same `operation_get` and `source_upload`. Require operation `succeeded`
   and receipt `state: "committed"` before treating the receipt's own `commit_sha` as saved.
   A sealed receipt can already name an unpushed candidate; it is not deployable proof.
   Current main can later advance, so keep this operation's own committed SHA for its build.

`source_upload` reports state, original generation/parent, expiry and commit; it is not a
file inventory. Recover a lost blob receipt by repeating identical `source_blob_put`
arguments and key. After an uncertain prepare/finalize, retain the original operation,
manifest and keys and observe it before another attempt. Staged paths are immutable.
An expired timestamp alone does not prove a completed upload failed. Diagnose a reported
failure or conflict, read and merge current state, then deliberately start new work.

The complete tree is at most 8 MiB decoded and 2,000 files; each complete file is at most
2 MiB. Use safe archive-compatible ASCII paths. Credentials, private `.env` contents,
dependency directories, caches and build output are not application source. These server
bounds do not establish the chosen native client's transfer capacity; report a real client
limit rather than claiming an unverified large upload. Saving the version starts no build
or publication; use the separate preview/deployment workflow for the confirmed exact SHA.

## Switch source on the existing project

Only switch on the user's explicit request. Read the current project and `source_get` with
`include_binding: true` for the source connection and generation first; explain which
source will be replaced. Upload the complete intended
replacement tree using the supported switch operation with those original guards. Finalize it
before updating the checkout binding. A conflict requires a fresh source read and review.

In native chat, use `source_upload_prepare` with `mode: "switch"`, the existing GitHub
`expected_source_connection_id` and generation, and `expected_commit_sha: null`. Stage all
intended files through `source_blob_put`, retain their receipts, then call `source_switch`
with `project_id`, the original `upload_operation_id`, original source connection/generation,
the complete `files` manifest and a saved key. Do not use `source_upload_commit` for switch.
The old binding stays active until successful completion. Observe that same operation and
upload receipt, then reread the full source binding; its generation increases once. The
project's GitHub auto-deploy is disabled by switching; the GitHub repository is not deleted.
GitHub history is not imported. The local equivalent remains `source publish --mode switch`.

Keep the same project ID, environment URLs, domain, runtime secrets and database/data-mode
identity. Do not create another project, delete the GitHub repository, alter its remotes or
copy customer data as a shortcut. A failed or uncertain switch is reconciled under its original
operation/idempotency key. Read `source_get` after completion before planning the new commit.

Rollback, deletion, data-mode changes and domain/mail changes retain their own reviewed plans
and scopes. Use the existing deployment, database and domains Skills as appropriate; switching
source alone authorizes none of them.

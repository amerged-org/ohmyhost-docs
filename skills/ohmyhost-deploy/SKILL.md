---
name: ohmyhost-deploy
description: Develop and version an application with ohmyho.st, open a private live preview, and deploy or publish on request from a local checkout or a connected native chat. Reuse the saved project and source; an unbound local checkout is published as it is, without GitHub, and GitHub is the later step for deployment on every push. Switch an existing project only on request. From a native chat, also set private application secrets with a one-hour link that needs no sign-in. Use troubleshooting for a stuck deployment.
---

# Develop and deploy an app

Read available MCP tool schemas or installed CLI help. Complete access with
**ohmyhost-get-started**, preserving the user's selected account, organization and project.
Keep explanations in the user's language; users need app versions, a preview and a working
address, not the storage provider's implementation details.
Use two short sentences, one link and at most one question.
Share IDs, commit hashes, state words, codes and tool names only on request.

## Show the app to the user

Free and Paid workspaces can open a private live preview without deploying. Use
`preview_open` after a save, when continuing an existing project even if no save is
needed, or when the user asks to see the app. Read the project's workspace plan with
`identity_get` or `organization_account_get` and its environments with `project_status`. Pass `environment: dev`
if the workspace is Paid and the project has Dev. Otherwise pass `environment: prod`.
If plan access is denied, ask the workspace Owner
to confirm the plan.

Follow the readiness checks in step 4 below. Give the returned preview `url` only when
`ready_to_show` is true. On the first handoff, ask whether the user wants to see the app.
On later handoffs, give the link without repeating the question. Apply these rules to
any link or question in `next_step` and `say_to_user`. Keep the link out of source, notes
and logs. A preview link works for at most 24 hours (`expires_at`); afterwards it stops working
and `preview_open` creates a new preview with a new link, so hand over only the newest link.

The Dev site is a deployed test site for Paid workspaces. Prod is the deployed live site. Give a Dev site link only when
the user asks for the deployed Dev site, and give only the `share_url` returned by
`project_dev_share_link_get`. If no share link is available, explain the limitation.

## Select the source once

The saved project binding and `source_get` determine how to continue an existing application.
When the source is pending, follow its polling guidance and keep the original initialization.
Reuse them before interpreting local Git remotes. Never silently replace a source because the
agent changed, a checkout was cloned, or a GitHub remote is missing on this computer.
For generation-aware inspection, initialization, commits or a source switch, request
`source_get` with `include_binding: true`. Its default preserves the existing GitHub view;
the opt-in returns the exact source connection and generation. Managed source already includes
those guards in either view. `ohmyhost source status` opts in for the local source workflow.

| Situation                                                | Continue with                                                |
| -------------------------------------------------------- | ------------------------------------------------------------ |
| Existing managed binding                                 | Managed source on that project                               |
| Existing GitHub binding                                  | **ohmyhost-deploy-github**                                   |
| Explicit request to use GitHub                           | **ohmyhost-deploy-github**, including GitHub setup if needed |
| Explicit request to store/deploy directly with ohmyho.st | Managed source                                               |
| New application developed entirely in native chat        | Managed source                                               |
| Unbound local checkout, nothing else said                | Publish the working directory as it is: the local section    |

An unbound checkout is published as it is whether or not it has a GitHub remote and whether or
not the workspace has a GitHub installation; a remote can be a local Git proxy or another host,
and a copied GitHub remote alone neither overrides a saved binding nor sends the checkout to
GitHub. GitHub is the later step, for deployment on every push. If the existing source conflicts
with an explicit new choice, use the source-switch flow after its concrete effects are reviewed.
The direct managed route requires neither GitHub signup nor a copied platform/device token.

## Local checkout: first deployment

Decide first whether this checkout is bound, before anything is created.
`ohmyhost source inspect` shows only the local Git state and unfinished publications; it does not
show a binding. The link is read by any project command that leaves out `--project`:

```
ohmyhost whoami --json
ohmyhost project status --json
ohmyhost project list --json
```

- `project status` answers with a project: the checkout is bound. Continue that project with the
  source its `source` field names; do not create one.
- It answers that several links match: ask the customer once which workspace is meant.
- It answers `invalid_command`: there is no usable local link, either none or one that cannot be
  read. A new container has none even for an app that exists. Read the whole project list,
  following `next_cursor` with `--cursor` until there is none.
  - The workspace has no project: this is a new app. Go on with the commands below.
  - The workspace has projects: nothing is created silently. If exactly one project carries the
    name the customer gave, or exactly one has this checkout's repository as its saved source
    (`ohmyhost source status --project PROJECT_ULID --json`), continue that project and say so.
    If several match, or none, ask once, with the handles and IDs, which project is meant or
    whether this is a new app, before anything is published or deployed.

Only for an unbound checkout, in this order:

```
ohmyhost project create --organization ORGANIZATION_ULID --name NAME --region eu --idempotency-key KEY --json
ohmyhost operation get OPERATION_ULID --json
ohmyhost init --dry-run --region eu --json
ohmyhost init --region eu --json
ohmyhost source publish --project PROJECT_ULID --mode initialize --expected-source-generation 0 --message "Initial version" --idempotency-key KEY --wait --json
ohmyhost deploy --project PROJECT_ULID --commit COMMIT_SHA --environment dev --idempotency-key KEY --yes --wait --json
ohmyhost project status --project PROJECT_ULID --json
ohmyhost project preview open --project PROJECT_ULID --environment dev --json
```

- `project create` answers `accepted`; read its operation until it succeeds.
- An existing `ohmyhost.yaml` is kept: only analyse it with `--dry-run`, and run the second `init` only when there is none.
- The region is the customer's one answer (`eu` or `us`) and goes to `project create` and `init`. Dev access (protected) and data mode (shared) take the platform defaults: report them with the commands that change them, do not ask. Public Dev is `ohmyhost project dev-access mode --project PROJECT_ULID --mode public --idempotency-key KEY --yes --json`; isolated data is the confirmed flow of **ohmyhost-deploy-github**, starting with `ohmyhost project data plan --project PROJECT_ULID --change isolate_prod_keeps_data --json`.
- Every `--idempotency-key` is 1 to 128 characters of letters, digits and `.`, `_`, `:`, `-`; any other key answers `invalid_command` without saying why.
- A first publication is generation 0 without a connection. Later ones take the generation and connection from `ohmyhost source status --project PROJECT_ULID --json`.
- A publication that is still pending is finished with `ohmyhost source publish complete`, below.
- The commit to deploy is `receipt.commit_sha` of the publication.
- Stop before the upload on `application_root_ambiguous` (ask once which root) and on a snapshot over 2 MiB a file, 8 MiB in total or 2,000 files, or with a symbolic link. Report the named error and what the limit is, and ask the customer how to go on; do not promise that the GitHub route takes the same checkout, because it has limits of its own.
- The `deploy` line is for a Paid workspace, the only one with a Dev site. On a Free workspace skip it and open the preview with `ohmyhost project preview open --project PROJECT_ULID --environment prod --json`; deploy to Prod only when the customer asks to go live.
- Show the app through the live preview with the last command and the handoff rules above. Read the protected Dev share link (`ohmyhost project dev-share link --project PROJECT_ULID --json`) and send the customer its `share_url` only when they ask for the deployed Dev site. Do not request a second one-time ticket while the first is unused, and do not report the deployment as unverified only because you have no browser.

An app that needs private values (the customer is at a terminal, because a local agent has no other way to take a value): one command per secret, with the value on standard input and never in the arguments, the chat or the logs:

```
printf '%s' "$SECRET_VALUE" | ohmyhost secret set NAME --project PROJECT_ULID --environment ENVIRONMENT_ULID --idempotency-key KEY --stdin --json
```

`ENVIRONMENT_ULID` is the Dev or Prod environment ID from `ohmyhost project status --project PROJECT_ULID --json`; Prod has its own secrets and none is copied from Dev. The protected one-hour form (`secret_input_request`) exists only in the remote connection.

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
A terminal `managed_source_dispatch_failed` ends that publication. Read `source_get` to check its
current commit. If the intended change is still missing, use fresh source guards and a new key.
Resume a pending upload from `source inspect`'s `pending_publications`; preserve its operation
and key.

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
dependency. Verify the connected account and workspace using the get-started Skill before project actions.

1. Reuse the chosen project via `project_list`/`project_get` and read `project_context_get`. For a new
   app, use `project_create` with its approved organization, name, region, data mode and, when
   Dev is included, its access mode, `source_provider: "managed"` and the intended `template`. Choose `vite-react`
   for a basic web app, or `empty` for a specifically chosen supported stack. Preserve an
   existing project's region and data; do not infer region from an
   agent's IP. Project creation defaults to Dev and Prod environment records. Deploying a Dev site
   requires a Paid workspace. Set `include_development_environment: false`
   only for an explicitly requested Prod-only project, and use `project_development_add` to add
   Dev later. Both shared and isolated data allow a direct Prod deployment. Shared data means
   database migrations and writes also affect Dev when it exists; isolated environments incur
   separate database usage.
2. Follow the accepted project operation, then read `source_get` with `include_binding: true` until its managed source is
   `ready` and has a persisted commit. Creation queues source initialization after the project
   is provisioned; a completed project operation can still have `source.status: "pending"`.
   Keep polling that source rather than starting a duplicate initialization. A `failed` source
   needs its recorded failure diagnosed. When `initialization_operation_id` is returned, follow
   that actual child operation with `operation_get`; otherwise use the returned
   `initialization_error_code`. An `authorization_changed` failure needs the current account, role and token access checked through **ohmyhost-get-started** before retrying the source action.
   If initialization ends with `managed_source_dispatch_failed`, read the current source and follow any
   returned child operation. If the source is still unbound and no initialization is pending, use
   `source_initialize` with the explicitly chosen template and a new key.
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
   to success, then read `source_get` for its persisted commit.
   Source generation changes when a binding is initialized or switched, not on every commit;
   concurrent edits are guarded by the expected commit. Copy both guards from current state.
   A change batch accepts at most 2 MiB of decoded content. For a complete atomic tree or
   related edits larger than that batch, use the remote upload flow below rather than
   splitting one intended version into several unrelated commits.
4. After the source save succeeds, call `preview_open` for the project using the workspace
   plan and environment above. While `ready_to_show` is false, read
   `preview_get` for the same project and environment about every 10 seconds for at most 2 minutes.
   Follow `next_step` and say `say_to_user` in the user's language when provided, applying the
   handoff rules above to any link or question. If the preview still needs time after polling,
   tell the user it is still getting ready.

   If a result carries `failure`, stop polling and follow its `next_step`: it names the file or
   action that fixes the start. When the `next_step` asks for a fix, call `preview_open` again only after the fix is saved,
   because the same saved version fails the same way. When it says to wait, open the preview
   again in a few seconds. The ohmyhost-troubleshoot-deployment Skill lists the codes.

   A preview of a database or sign-in app uses the database of the environment you chose for it (Dev or Prod) and loads data only once that environment has one.
   Tell the user about this limitation. Deploy only when the user requests a deployment.

   When `ready_to_show` is true, use the live preview handoff above.
   For example, “Deine Seite ist als private Vorschau fertig: `<Link>`. Möchtest du sie dir ansehen?”
   Later saves update the same preview without a deployment. Once a later save is ready to show,
   say what changed and repeat the link.

5. Use `source_versions` and `source_diff` to inspect saved work. `source_restore` creates a
   new version from the selected earlier commit under the same revision guards; it does not
   delete history or roll back database migrations. Observe its accepted operation before
   reading the resulting current commit.
6. Set credentials required for the authorized deployment with one `secret_input_request` for the
   chosen project and environment. Pass up to ten distinct secret names in `names` and give the
   single `url` to the person who sets the values. The page needs no sign-in and has Dice, Copy and Show/Hide buttons
   for each field. One valid Save consumes the link. It expires after one hour. Use
   `connection_status` for the result by name. Request a fresh link for failed names and confirm
   unconfirmed writes before retrying them. Keep the link private and values out of source, chat and
   tool arguments.
7. Deploy or publish when the user asks for that action; "deploy", "publish" and "go live" each ask for it.
   Call `deployment_plan` for the exact accepted commit and the requested environment (`dev` for
   the Paid-only Dev site or `prod` for the live site). For `auth.provider: omh-native`,
   `native_auth_launch_unavailable` means the project needs rollout approval from ohmyho.st.
   Preserve the current project and saved commit. Once approval is confirmed, plan the commit again. Review its
   real costs and effects, then `deployment_create` with
   the plan and one saved key. Follow the same `operation_get` until its terminal state; use
   `deployment_get` and `deployment_logs` for diagnosis. A running operation is not a reason
   to start another build. A workspace has at most four open builds: `build_capacity_reached` (429)
   means wait for one to finish, then start the deployment again with a new key.
8. After deployment, use `project_status` to find the deployed address for verification.
   For protected Dev, inspect the site with `project_dev_access_create` and its one-time
   `redeem_url`; an agent without a browser reports what it could not inspect and gives the
   private `share_url` only when the user asks for the deployed Dev site. Do not issue another
   ticket while the first is unused. A repeated request revokes the unused ticket, and a key
   does not replay it.
   Open a public Dev site or direct Prod deployment at its deployed address for verification.
   Keep these entry links out of notes, source and logs.
   Verify the app's meaningful
   interaction, expected content and any requested data flow before calling it ready. If the
   chat cannot inspect the site, say exactly what remains unverified and keep the same project.
9. If step 7 already deployed to Prod, verify that operation and do not create another deployment.
   Otherwise publish only when requested and authorized by the current role and token. Use
   `promotion_plan` then `deployment_promote` for the verified Dev deployment, including the
   exact ETag, confirmation and idempotency guards. Alternatively plan an exact commit into
   Prod when that is the requested route, including with shared data. Prod needs its own secret inputs;
   they are not copied from Dev. Poll the accepted operation and verify the public result.

Report the deployment verification result and any required user action. For a requested Prod
deployment or publication, give the verified public address. To show the app, use the live preview
handoff above. Do not claim a plugin installation, finished OAuth page, saved commit or accepted
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
   The service continues checking a sealed candidate even if the original chat disconnects.
   Follow its existing operation. If you repeat the source mutation to wake processing, keep its
   original arguments and key. For finalization, retain the same complete manifest, generation,
   operation ID and finalize key. Build from the committed SHA returned for that operation.

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

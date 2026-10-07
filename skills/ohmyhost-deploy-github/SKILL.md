---
name: ohmyhost-deploy-github
description: Deploy an explicitly selected or already bound GitHub application to ohmyho.st, verify Dev and publish the exact version to Prod. Also use for its requested rollback, deletion or Dev/Prod data changes. Use ohmyhost-deploy to choose a source for an unbound app; use troubleshooting for a stuck operation.
---

# Deploy a GitHub app

Read the installed CLI help or MCP tool schemas before supplying arguments. Use the customer's selected repository and branch.
Write concise customer-facing guidance in the customer's language and preserve their chosen scope.

Read the saved checkout binding and `source_get` before this workflow. A managed binding is
authoritative; use **ohmyhost-deploy** rather than adding a GitHub remote or replacing its source.
An existing Git repository is not proof that it is hosted on GitHub: inspect its remotes and
the selected project. If an unbound local app has no GitHub source and the customer has not
chosen one, ask once whether to keep its versions with ohmyho.st or set up GitHub. An explicit
choice already authorizes that route and needs no repeated routing question.

Converting a GitHub-backed project to managed source uses the same project, URLs and data.
Follow the explicit switch path in **ohmyhost-deploy**; do not create a replacement project or
invent a source generation. Before a generation-aware change, call `source_get` with
`include_binding: true`; the default keeps the released GitHub source view. Do not
unlink the existing source before its replacement is complete.
For a native switch, stage the intended complete tree with `source_upload_prepare`
(`mode: "switch"`) and `source_blob_put`, then finalize `source_switch` from the receipts
using the original GitHub connection/generation. The existing binding stays until completion;
project URLs and data remain, GitHub auto-deploy is disabled, and deployment is separate.
The remote hosting connection cannot read GitHub files by itself: use the client's actual
repository/file context or state the missing capability; never invent a replacement tree.

## Connected chat with a GitHub source

The source choice follows the selected repository and user preference, including when the agent
runs in a cloud environment. Use this flow when the authenticated remote tools are available;
the local CLI flow below remains available for a local checkout.

1. Complete the remote OAuth and project-grant flow in **ohmyhost-get-started**. Reuse the saved
   project through `project_list`, `project_get` and `project_context_get`. For a new GitHub app,
   send `source_provider: "github"` explicitly to `project_create`, together with the user's
   organization, name, region, data mode and Dev access choice. This avoids queuing a managed
   template over the selected GitHub source.
2. Develop and push the actual repository through the client's available repository tools.
   Inspect the repository-root `ohmyhost.yaml`, lockfile and selected application root through
   those tools. Use **ohmyhost-build-portable-app** to resolve framework/configuration blockers.
   If this client cannot read or write the selected repository, state the concrete missing
   capability; a connected hosting tool does not itself provide GitHub editing.
3. Read `github_status` for the approved organization. When a connection is needed, call
   `github_connect` with one saved key and present its private `url`. The existing signed-in
   portal leads the user through **Continue to GitHub** and the official GitHub authorization.
   Return to `github_status` to confirm the result. Do not request a provider token or construct
   a GitHub callback. Then call `source_link` with the same project and selected repository
   owner/name, observe its accepted operation, and confirm the binding with `source_get`.
4. Supply required credentials with `secret_input_request` for Dev or Prod and observe the
   private input through `connection_status`; never put secret values into chat or tool calls.
   Plan the exact pushed commit with `deployment_plan`, create the reviewed plan with
   `deployment_create`, and observe its original `operation_get`. Verify Dev with the returned
   URL and, when protected, `project_dev_share_link_get` for the user or a one-use
   `project_dev_access_create` ticket for the agent. Keep entry links out of source and logs.
5. When publication is requested and its separate project grant permits it, use `promotion_plan`
   and `deployment_promote` with the actual ETag, confirmation and idempotency guards. Shared
   data requires Dev followed by promotion; isolated data also permits an exact commit planned
   into Prod. Supply Prod's own credentials, observe completion and verify the public result.

## Local checkout with GitHub

1. Run `ohmyhost init --dry-run --json` in that repository. A blocked repository reports `status: "blocked"` and exits non-zero while still returning the full analysis; read `blockers` rather than the exit code alone. Resolve returned blockers and requirements; preserve existing auth, migrations and configuration. Without an `ohmyhost.yaml`, run `ohmyhost init --json` once no blockers remain: it writes the file at the repository root (`--root DIR` picks one of several apps, `--region eu` for an EU project). Commit and push it before planning. Init never overwrites an existing file: it answers `repository_configuration_exists`, while `--dry-run` still analyzes the repository. Use the portable-app Skill for source changes, or the Supabase Skill only for a requested migration.
2. Complete installation, login and organization selection with the ohmyhost-get-started Skill; use `identity_get` to confirm the selected organization and `projects_list` to reuse an existing project. When several ohmyho.st logins are saved, or the prompt names a user and organization, run every authenticated call as that one login (`--profile-name` / `profile_name`) and confirm it with `identity_get` first; `init` is offline and takes no login flag. For a new project, ask: "Should your Dev page be public or protected by a shareable link?" Protected is the default; public lets anyone with the Dev URL open it, including when Dev and Prod share data. Explain isolated Dev/Prod data versus shared data and the hosting region, then use `project_create` with the chosen `dev_access_mode`, data mode and `region`. Recommend isolated data; two databases consume credits separately. `data_mode` is optional and defaults to `shared`; send the customer's choice explicitly. A later change uses the confirmed data-change flow below and never copies data. An explicit region wins over a supplied browser-location hint; without either, ask once. Preserve an existing project's region and never use the agent IP. The API defaults to `us`; `eu` places the project's Postgres database, files, build sandbox and build objects in the EU, and the application runs next to its database. The region cannot change after creation and prices are identical in both regions; `storage.jurisdiction` in `ohmyhost.yaml` must equal the project's region, and `init` writes `us` unless it gets `--region eu`. Transactional mail is sent from the platform's mail region and is not a per-project choice. Hosting needs no mail domain: ask whether the app should send or receive email, and configure one only when the customer wants mail or the app declares `mail.enabled`; a Dev URL, a new project or a Better Auth package alone never calls for one. Mail requires Paid access: without it, `mail_setup` answers `paid_plan_required`. An app declaring `mail.enabled` also needs its configured mail domain before deployment (`mail_domain_required`); activate Paid and configure mail, or set `mail.enabled: false` when the app sends no mail.
3. Read `github_status` for the workspace. When needed, use `github_connect` once, open its single `authorization_url` and repeat the same key until connected; on `failed` or `expired`, resolve `last_failure` as the get-started Skill describes and connect with a new key. Then use `source_link` for the selected repository and observe its returned operation; it needs no second browser consent for a covered repository. Missing repository access is repaired through status's `connection.settings_url`, followed by the same link/key. Errors name the account the call ran as (`acting_as`): `resource_not_found` means that login cannot see the project, `github_connection_required` means this workspace has no GitHub connection yet, and `repository_not_installed` means the App installation does not cover the repository. Each workspace connects GitHub on its own, so the same repository can be linked in the workspaces of separate accounts. Read `source_get`, then `deployment_plan` for the exact pushed commit. Review the plan's costs, requirements and effects with the customer's existing authorization; quote `estimated_cost.credits` as the credits held for this build only. Measured build seconds are charged and the rest is released.
4. Read `project_status` for environment IDs. Supply required application secrets through the stdin command returned by `secret_set_command`. Use the chosen environment; Dev is not Prod.
5. Execute `deployment_create` with the returned plan and one saved idempotency key. Reuse that key if the response is uncertain. Poll `operation_get` for the accepted operation at its suggested interval; another build is not a status check. After success, some requests can still reach the previous version for up to 30 seconds; recheck before calling a change missing.
6. Read `dev_access_mode` and the resulting URL from project status. Public Dev opens at the clean URL. For protected Dev, call `project_dev_share_link_get`: its owner-only `share_url` can be reused by multiple visitors without automatic expiry. Open it to receive a browser session, then verify the clean URL, application login if present, and a real read/write flow. For declared `functions.crons`, confirm in `function_runs_list` that a due run succeeded; deployment logs do not show runs. Keep the link private outside intended recipients; `project_dev_share_link_rotate` or `project_dev_share_link_revoke` blocks old links and sessions on their next request. Opening the link signs that browser in for 12 hours and lands on the Dev root `/`; open it again after that. After rotation or revocation, that browser's page loads redirect to <https://ohmyho.st/>. `project_dev_access_mode_set` switches an existing project between public and protected Dev; switching back to protected creates a new link. Never put the link in notes, source or logs.
7. If production publication is requested, either promote the verified Dev deployment with `promotion_plan` and `promotion_execute`, or plan the commit straight into Prod with `deployment_plan` and `environment: "prod"`. Before either, set Prod's own secrets with `secret_set_command` and the Prod environment ID from `project_status`: secrets are never copied from Dev, and a missing one often fails Prod's health check (`runtime_candidate_failed`). A project whose Dev and Prod share one database must deploy to Dev and promote; a direct Prod plan returns `shared_data_requires_promotion`. Isolated promotion applies schema migrations without copying Dev records; test that existing Prod records survive. "Dev only" means leaving Prod undeployed; no separate project mode is needed.
8. After the first working Prod deployment, ask the customer once whether their site should show the small "Powered by ohmyho.st" flag on its right edge. While it shows, the project's custom domain uses no domain credits on any plan and also works on Free. Each Stripe Paid period adds 250 credits to the workspace, however many projects show the flag: 1,250 instead of 1,000 monthly credits, 25% more. Switch it only on their answer with `powered_by_flag_set` (`ohmyhost project flag set`); never enable it by default. It shows on Prod addresses within about 30 seconds and only in HTML pages a browser opens; check it in a browser, or send `Sec-Fetch-Dest: document` for an automated check.
9. To undo a release when the customer asks, read `deployments_list`: the live deployment has `status: active`, and an earlier one that was live has `status: rolled_back`. Use `rollback_plan` for that deployment, then `rollback_execute` with the plan's `resource_etag` as `if_match`, its `confirmation_token` and a saved idempotency key; poll the returned operation (CLI `ohmyhost rollback plan` and `ohmyhost rollback`). Rollback reactivates the artifact in its own environment without a rebuild and switches its crons, but never reverts migrations: the older code must work with the current schema. If its health check fails, `runtime_candidate_failed` and the `HEALTH_CHECK_FAILED` deployment diagnostic explain the failure, and the current version stays live. Promotion, rollback and deletion plans expire after ten minutes; on `confirmation_expired` or `etag_mismatch`, plan again.

Return the working URL, deployed commit and any remaining action. If an operation stalls, use the troubleshooting Skill. Read `project_context_get` when resuming; use `project_notes_set` with its current notes version to retain a short decision or unfinished task, never credentials or signed links.

## Change Dev/Prod data or reset Dev

Only a workspace Owner/Admin can change data assignments. Read `project_context_get` and
`project_status`, then use `project_data_plan` (CLI `ohmyhost project data plan --project ULID
--change CHANGE --json`) for the customer's chosen action:

| Change                    | Result                                                                                                                                                                  |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `isolate_prod_keeps_data` | Shared to isolated: Prod keeps the existing database and its files; Dev gets a fresh empty data area. Redeploy Dev.                                                     |
| `isolate_dev_keeps_data`  | Shared to isolated: Dev keeps the existing database and its files; Prod gets a fresh empty data area and is unavailable until redeployed.                               |
| `share_prod_keeps_data`   | Isolated to shared: requires an existing Prod database, keeps Prod's data and files, and deletes Dev's database, files and deployment. Redeploy Dev to use Prod's data. |
| `reset_dev`               | Isolated only: deletes Dev's database, files and deployment and gives Dev a fresh empty data area. Redeploy Dev; Prod stays.                                            |

Review the plan's effects and destructive effects with the customer before execution. After their
explicit confirmation, pass the exact `change`, `resource_etag` as `if_match`,
`confirmation_token`, one saved `idempotency_key` and `confirmed: true` to `project_data_change`.
The CLI equivalent is `ohmyhost project data change --project ULID --change CHANGE --if-match ETAG
--confirmation-token TOKEN --idempotency-key KEY --yes --wait --json`. The plan lives ten minutes;
an expired confirmation or changed ETag requires a fresh plan and review. Follow `operation_get`;
after an uncertain response reuse the same key, never start another reset to retry. Finish or
reconcile an operation already changing that project before requesting another change.

No action copies data, and ordinary usage prices apply. A new database is provisioned lazily
when a database-enabled app next deploys. Cloudflare R2 files follow the same data identity; shared
Dev/Prod see the same file keys, while a fresh isolated or reset data area can reuse keys from
the old area. A key remains create-once within one data area, including after deletion.
Customer secrets, access mode and region stay; sharing and reset renew a protected Dev link,
so retrieve its new `share_url` after the operation. Deleted Dev data and files cannot be restored
by switching back; a SQL export contains database records only, not files.

## Delete a project

Delete only on the customer's explicit request. `delete_plan` (CLI `ohmyhost delete plan`)
returns the effects, `resource_etag` and a `confirmation_token` valid for ten minutes. Review
those effects and obtain confirmation before `delete_execute` (CLI `ohmyhost delete --project
ULID --if-match ETAG --confirmation-token TOKEN --idempotency-key KEY --yes --json`); follow
the returned operation. Deletion removes Dev and Prod deployments, databases, files, function
schedules, stored SQL exports, and the domain, mail and DNS records ohmyho.st created. It cannot
be undone; when database records matter, create and download a SQL export first. Files need
their own application download before deletion. If the operation ends `failed`, follow its
suggested action and plan deletion again once no other project operation runs.

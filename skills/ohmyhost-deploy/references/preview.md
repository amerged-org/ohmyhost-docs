# Show the app in its preview

Use the private live preview on Free or Paid. It follows saved versions without a
deployment. Open it after a successful save, when continuing an app that needs no
new save, or when the customer asks to see it. Show the real app and its main action.

Read the workspace plan with `identity_get` or `organization_account_get` and the
environments with `project_status`. For `preview_open`, pass `environment: dev`
for a Paid workspace with Dev. Otherwise pass `environment: prod`. If the plan is
unavailable, get it from the workspace Owner.

When `ready_to_show` is false, read `preview_get` about every 10 seconds for up to
two minutes. Follow `next_step`. If there is a `failure`, end the polling loop. Save
the required fix before opening again, or wait and reopen if the result asks you to
wait. Use the [troubleshooting workflow](../../ohmyhost-troubleshoot-deployment/SKILL.md)
for the cause and recovery. A preview still getting ready can be described that way.

| Preview result | What to do                                                                  |
| -------------- | --------------------------------------------------------------------------- |
| `cold`         | If a start is pending, wait for it. Otherwise open the preview to start it. |
| `starting`     | Check again as directed. A start usually takes under a minute.              |
| `sleeping`     | Opening the preview or its link wakes it.                                   |
| `ready`        | Check `ready_to_show` before sharing the link.                              |

When `ready_to_show` is true, check that the app loads if you can open it. Share the
returned `url` exactly as returned, using the [customer voice](../../ohmyhost-get-started/references/customer-voice.md).
For GitHub source, the preview follows the bound branch. Compare
`applied_source.commit_sha` with the requested deployment commit before saying
which version is shown. If they differ or the applied commit is unavailable,
say that the preview follows the branch and the requested commit is unverified
there. Keep the user's exact commit as the deployment target.
If only the customer can open it, give them the link and state only what the service
confirmed. Keep the link private and out of source, notes and logs. Later saves
update the same URL while it is valid. A link works for at most 24 hours
(`expires_at`). Opening again after expiry creates a fresh preview and a new link.

For a data app, give the preview link first. Explain that the preview does not save data,
even after migrations run. Saving works on the published site once its tables are
set up. When building or preparing a data app whose preview reports `needs_database`
or `migrations_pending`, follow the [database setup workflow](database-setup.md)
to ask where to apply the saved changes. A request only to see the preview calls
for the link and the saving limitation. Skip any follow-up asking if the customer
wants to see the preview you just shared.

After the requested deployment, verify the main saving action on that published site
once its tables are ready. Submit a permitted test record and read it back after a
reload. If the host cannot do this or a real write needs the customer's permission,
give the customer the site link and ask them to try it. Report what was verified.

Use `preview_stop` or `preview_rotate` for the requested link change. Stop clears
preview backups and preserves the URL through its deadline. Rotation closes old
connections and replaces the URL while keeping the original deadline. Reuse the
same key after an uncertain change.

Dev is a deployed test site for Paid workspaces. Prod is the live site. For a customer
request for a protected Dev address, share the persistent `share_url` from
`project_dev_share_link_get`. Explain when
it is unavailable. Use the Dev site access workflow for private verification.

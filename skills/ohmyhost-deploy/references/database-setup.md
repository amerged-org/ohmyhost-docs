# Apply saved database changes

Use this workflow when the customer asks to set up data or is preparing a data app.
If a read-only request returns `database_not_set_up`, explain that the selected
environment has no database and stop the read. Wait for a separate request to set
up the database before saving source, applying migrations, changing data or deploying.
The same setup choice applies when an authorized write or table creation is blocked.

Read the environments with `project_status` and the data mode with `project_get`.
Use the exact saved commit with the database enabled in `ohmyhost.yaml` and its
migration files. When the preview
reports `data.state: needs_database` or `migrations_pending`, use `data.options`
to explain where the saved files can go. A Free workspace or a project without
Dev can apply them to Prod only. Name Prod and ask whether to apply there. With
a Paid Dev site, ask whether to apply to Dev only or to Dev and Prod. When
`data.shares_data_with` is `prod` or the project uses shared data and has both sites, say before
asking that Dev and Prod use one database and either choice changes both.

Wait for the customer's choice before calling `database_migrate`. Pass the selected
`environment`, the saved `commit_sha`, `confirm: true` and one new `idempotency_key`
per environment. Use `source.commit_sha` for the saved preview version if it matches
the version the customer chose. Apply to Dev first when both are selected. Follow
each `operation_get` until it succeeds before proceeding, then reread `preview_get`
if you started from a preview. The operation creates the database if it is absent
and skips previously applied files. If `migrations_pending` has no `data.pending_files`,
the same operation can verify the saved files. If `error.migration` names a refused
file, use the reason to fix a pending file or add a later migration. Keep applied
files unchanged.

Dev requires Paid. Prod and Dev that shares Prod's database require publication
permission. If the selected environment is refused, explain the prerequisite and
leave the customer's selection in place.

If the host lacks `database_migrate`, explain that a database-enabled deployment
can set up the chosen database. Plan or deploy only within a separate publishing
request. Applying migrations does not publish the app or enable saving in the
preview. A blocked database action may be retried in its original environment
once setup there is verified.

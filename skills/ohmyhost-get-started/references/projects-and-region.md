# Projects, region and repositories

Use `projects_list` to reuse a project and `project_context_get` when resuming one. Preserve an existing project's region. For a new project, an explicit customer region wins; otherwise use a browser-location hint supplied in the customer's onboarding prompt and send that region explicitly. Without either, ask once for US or EU. Never infer customer location from the agent/server IP. The API default remains US. New projects provision their PGCF database, new files and builds in the selected region; the customer API cannot change it later. `database_compute_get` reports actual database location. Existing projects migrated to US with their owner's authorization use US databases, while their existing R2 object locations remain recorded. Read `Storage jurisdiction` in `project_context_get` before changing established storage configuration.

For a repository containing several apps, run local `init` from its Git root and check that the
repository-root `ohmyhost.yaml` selects the intended `applicationRoot` before planning the pushed
commit. For example, `applicationRoot: apps/web` selects that app's sources and migrations;
an `ohmyhost.yaml` inside `apps/web` does not override the repository's selection. Compare the
local result with the plan's `application_root` and keep any admission diagnostic visible.

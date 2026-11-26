# How to talk to the customer

Use the customer's language and form of address. In German, use “du” unless they use “Sie”.
Lead with what they can open, what changed, or what they need to do. Prefer two short sentences,
one link and at most one question. A sign-in link can also need its matching code and validity.

Use the names the customer sees. In the portal, **Workspace** is the label above the workspace
name or selector. Use the name shown there when asking them to choose.

| Say                                   | Meaning                                                                            |
| ------------------------------------- | ---------------------------------------------------------------------------------- |
| preview                               | The private live preview that follows the app's saved versions. Every plan has it. |
| Dev or Dev site                       | The deployed test site for a Paid workspace.                                       |
| Prod or live site                     | The live site. Use “live site” in ordinary replies.                                |
| publish                               | Put a version on the live site.                                                    |
| version, address, sign-in, saved data | Use these when the detail matters to the customer.                                 |
| private link                          | Give the complete link to the intended person and say what they can do there.      |

Use recognizable app, account and workspace names. Keep IDs, hashes, tool names, raw states,
error codes and implementation details in tool calls and support reports. Share technical
details in a technical answer when specifically requested. Skip routine setup narration and
report the result you actually checked. If a preview is still getting ready, say so plainly.

Start with the preview. After the first real version is saved, open the preview, wait until it
can be shown, and check that it loads if you can open it. Give the link first.
After a later save, say what changed and give the link again.
Use [the preview workflow](../../ohmyhost-deploy/references/preview.md) for the technical steps.

Use the customer's requested outcome to choose what to do. A publishing request already says
what they want. For a request to build or edit, show the preview while the customer decides
whether to publish. Explain any real cost or consequence when it matters to their decision.

Fix routine setup you can handle and keep going. If a problem blocks the customer, say what
it means for the app and what can happen next. Use reviewed `say_to_user` text in the user's
language when it fits. Follow the operation's retry guidance before taking another action.

| Situation              | English                                                                 | Deutsch                                                                        |
| ---------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| First preview          | [Open the private preview] of your booking page.                        | [Private Vorschau] deiner Buchungsseite öffnen.                                |
| Updated preview        | I added the phone field. [Open the preview].                            | Ich habe das Feld für die Telefonnummer ergänzt. [Vorschau öffnen].            |
| Preview needs time     | Your preview is getting ready.                                          | Deine Vorschau wird gerade vorbereitet.                                        |
| Save still fails       | I couldn't save this change. I'll report the problem to ohmyho.st.      | Ich konnte diese Änderung nicht speichern. Ich melde das Problem an ohmyho.st. |
| Published and verified | Your page is live. [Open the site]. I sent a test order and it arrived. | Deine Seite ist online. [Seite öffnen]. Meine Testbestellung ist angekommen.   |

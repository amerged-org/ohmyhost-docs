# Build AI features

Use the ohmyho.st AI gateway for LLM chat and Responses, images, speech-to-text,
text-to-speech, classifiers and OCR. It serves the models orq.ai offers on the routes
below, with no separate platform model catalog. The customer needs a Paid workspace,
available prepaid credit and an explicit jurisdiction choice.

## Setup

1. Ask the customer which jurisdiction their data may use. `any` permits every model
   served by orq.ai. `eu` requires the exact model's current orq metadata to list
   exclusively EU locations. Mixed, global, non-EU and empty locations are refused;
   names and provider prefixes never prove location. If metadata cannot be verified,
   the call fails with `503 ai_unavailable` before a credit hold. The EU model list
   contains only enabled models that meet this rule.
2. Preserve the application's existing configuration and add:

   ```yaml
   ai:
     enabled: true
     jurisdiction: eu
   ```

   The jurisdiction has no default. Use `any` only when the customer chose it.

3. Deploy the configuration. The platform injects the secret `OHMYHOST_AI_KEY` and
   `OHMYHOST_AI_BASE_URL` (the gateway origin plus `/v1`). Never set these yourself.
   The gateway origin is allowed automatically; omit it from `runtime.egress.allow`.
4. Make a real call through a server route on the deployed app and inspect its spend
   with **ohmyhost-usage-and-budgets**. A health check must not make a paid AI call.

Read the injected values from the framework's actual request context. Keep the key
in server code: never send it to a browser, prompt or log. A static site cannot hold
it; use an edge runtime, a Vite companion or a plain functions Worker. Static `ai`
declarations are refused as `runtime_mode_unsupported`.

The active environment revision decides whether its key may be used and which
jurisdiction applies. Promoting or rolling back to source without `ai` stops calls.

## Choose a model and call it

Use `GET {baseURL}/models` for the current model ids allowed by the project's
jurisdiction. Choose a model that supports the desired route with the customer; the
list is not a promise that every model implements every modality. Read orq.ai's
[supported models](https://docs.orq.ai/ai-gateway/supported-models) and
[OpenAI-compatible API](https://docs.orq.ai/ai-gateway/features/openai-compatible-api) for the
model's request fields. Do not replace the customer's model with a fixed platform
list or ask them for an orq API key.

Install the official `openai` package using the application's package manager. This
server example takes the model id selected for chat from that list. Resolve `env`
from the hosted request; do not read it from a browser bundle.

```ts
import OpenAI from "openai";

export function createChat(
  env: { OHMYHOST_AI_BASE_URL: string; OHMYHOST_AI_KEY: string },
  chosenModel: string,
) {
  const ai = new OpenAI({
    baseURL: env.OHMYHOST_AI_BASE_URL,
    apiKey: env.OHMYHOST_AI_KEY,
    maxRetries: 0,
  });

  return {
    async answer(question: string): Promise<string> {
      const reply = await ai.chat.completions.create({
        model: chosenModel,
        messages: [{ role: "user", content: question }],
        max_tokens: 512,
      });
      return reply.choices[0]?.message.content ?? "";
    },
    async stream(question: string, onText: (text: string) => void): Promise<void> {
      const chunks = await ai.chat.completions.create({
        model: chosenModel,
        messages: [{ role: "user", content: question }],
        max_tokens: 512,
        stream: true,
      });
      for await (const chunk of chunks) onText(chunk.choices[0]?.delta.content ?? "");
    },
  };
}
```

Set output limits appropriate to the selected model. The example disables automatic
SDK retries so a failed response does not silently start another paid generation.
If the application retries, bound it and honor `Retry-After`. Handle
`OpenAI.APIError.code` in the server route and return a useful application error
without exposing the gateway key or private upstream details.

## Routes and limits

All paths below are relative to `OHMYHOST_AI_BASE_URL`. Use the OpenAI SDK where it
implements the route, or ordinary server-side `fetch` with `Authorization: Bearer
<injected key>` for orq's classifiers and OCR.

| Method | Path                    | Body                                            |
| ------ | ----------------------- | ----------------------------------------------- |
| POST   | `/chat/completions`     | JSON; `stream: true` returns Server-Sent Events |
| POST   | `/responses`            | JSON                                            |
| POST   | `/images/generations`   | JSON                                            |
| POST   | `/images/edits`         | JSON or multipart form data                     |
| POST   | `/audio/transcriptions` | JSON or multipart form data                     |
| POST   | `/audio/speech`         | JSON; the response can be audio bytes           |
| POST   | `/decisions`            | JSON                                            |
| POST   | `/ocr`                  | JSON                                            |
| GET    | `/models`               | No body                                         |
| GET    | `/realtime?model=<id>`  | Server-side WebSocket upgrade; see below        |

Every POST body requires a non-empty `model` id. JSON bodies are at most **16 MiB**;
multipart bodies are at most **26 MiB**, including form fields and boundaries. An
upload needs exactly one `model` field. Let the SDK or `FormData` set its multipart
boundary. Send `application/json` for JSON. Requests outside these routes, or query
parameters on POST routes and `/models`, answer `404 not_found`. Embeddings,
rerank, moderation, video generation and audio translation routes are not offered.

The gateway checks model identity and reserves routing control. These exact
top-level JSON keys or multipart field names are refused as `invalid_request` in
both jurisdictions: `orq`, `load_balancer`, `fallbacks`, `fallback_on_codes`, `retry`,
`cache`, `timeout`, `plugins`, `models`, `route` and `routing`. Other model-specific
fields follow orq's API. JSON request bytes are forwarded unchanged after checking;
duplicate top-level JSON keys are refused as `invalid_request`. Multipart forms are
rebuilt with a fresh boundary.

A request body must arrive within 30 seconds. The upstream response headers have a
120-second deadline; response streams end after 60 seconds without a chunk or ten
minutes overall. Address and project rate limits also apply. A workspace may have
at most eight unresolved AI calls; a ninth answers `429 ai_rate_limited` with
`Retry-After: 5`. Other rate limits carry their own `Retry-After`.

## Realtime voice

The `/realtime` WebSocket route is implemented and tested locally. Live acceptance
is still pending: authenticated upstream sessions closed with code `1011` before
messages or audio. Do not claim voice works until a real hosted session passes.

Connect from server code with the injected Bearer key. A browser WebSocket cannot
set that header; keep the upstream socket in an authenticated application server
route. Use exactly one `model` query parameter and `Upgrade: websocket`; extra or
repeated parameters answer `400 invalid_request`. A session ends after five
minutes, after one minute without messages in either direction, or when either
peer closes or fails. Verify actual voice input, audio output and closure through
the hosted application.

## Credit and failures

Calls need sufficient available credit for a temporary hold before forwarding.
They settle against the cost orq records using the active `ai.cost` rate card and
count toward the project's Stop budget. Recorded zero is charged zero. A call whose
cost cannot be read after bounded retries uses a **USD 0.01 cost fallback only for
`/chat/completions` and `/responses`**, then the active rate-card factor. This is
not a minimum: any reported cost, including zero or a smaller value, takes priority.
Other routes with unavailable cost settle at zero and are logged; no character or
duration tariff applies. No later automatic correction is posted. Read the current factor on
[the pricing page](https://ohmyho.st/pricing). Usage and credit balances come from
**ohmyhost-usage-and-budgets**. No active AI rate card means calls are unavailable.

Gateway failures use `{ "error": { "message", "type", "code" } }`. Branch on
`code`, not on the message; an invalid request can retain orq's rejection status.

| Code                                | HTTP                             | Action                                                                               |
| ----------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------ |
| `invalid_api_key`                   | 401                              | Redeploy the enabled capability; report a persistent failure with `feedback_submit`. |
| `paid_plan_required`                | 402                              | Start a Paid workspace.                                                              |
| `insufficient_organization_credits` | 402                              | Add enough credit for the call's hold.                                               |
| `model_outside_jurisdiction`        | 403                              | Choose an allowed model from `/models`.                                              |
| `model_not_found`                   | 404                              | Check the model id and its route.                                                    |
| `not_found`                         | 404                              | Use a route from the table.                                                          |
| `invalid_request`                   | 400 or upstream rejection status | Fix the body, fields or content type.                                                |
| `request_too_large`                 | 413                              | Reduce the body below the route's limit.                                             |
| `project_budget_exceeded`           | 429                              | Review the project's Stop budget.                                                    |
| `ai_rate_limited`                   | 429                              | Honor `Retry-After`.                                                                 |
| `ai_upstream_unavailable`           | 502                              | The provider failed; retry only within the application's policy.                     |
| `ai_unavailable`                    | 503                              | Retry later; report a persistent failure.                                            |

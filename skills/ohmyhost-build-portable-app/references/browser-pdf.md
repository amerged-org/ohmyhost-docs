# Browser PDF

Declare `browser.enabled: true` in `ohmyhost.yaml` for an edge or functions application. The platform injects `OHMYHOST_BROWSER_BASE_URL` and an environment-specific `OHMYHOST_BROWSER_KEY`. Call from authorized server code with global `fetch`; never expose the key to a browser or place the service in `runtime.egress.allow`. Both logical customer Dev and Prod use the managed service.

Each render requires active Paid coverage, sufficient available credits and room under any project Stop budget. Check the customer's existing coverage and budget with the [usage and budgets Skill](../../ohmyhost-usage-and-budgets/SKILL.md) before promising that rendering is available.

```ts
const response = await fetch(`${env.OHMYHOST_BROWSER_BASE_URL}/pdf`, {
  method: "POST",
  headers: {
    authorization: `Bearer ${env.OHMYHOST_BROWSER_KEY}`,
    "content-type": "application/json",
  },
  body: JSON.stringify({ html }),
});
if (!response.ok) {
  // Return an application error; never log document content or the gateway key.
  throw new Error("PDF rendering failed");
}
return new Response(await response.arrayBuffer(), {
  headers: { "content-type": "application/pdf", "cache-control": "no-store" },
});
```

Use HTML with inline CSS and embedded data images/fonts. CSS `@page` sizing takes priority when specified. Resource-hint and nested browsing-context tags (`link`, `base`, `iframe`, `frame`, `object`, `embed`, `portal`, `fencedframe`) are refused before rendering; this conservative v1 filter can also match literal tag examples in comments. Ordinary text and anchor links remain accepted. Scripts and external browser resource requests are disabled. Limits are 1 MiB HTML, 10 MiB PDF, 50 pages and a 30-second end-to-end request deadline. Excess pages are refused rather than truncated. Handle input/limit failures, unavailable service, rate limits and credit/budget refusals explicitly. The platform does not retain or log HTML/PDF.

**Processing is global.** The project region does not pin Cloudflare Browser processing to EU or US.

Calls cost twice the published variable provider price using its measured browser duration, with no additional general margin. Fractional durations are preserved and rounded once at the final microcredit. A call keeps its admission price. Already dispatched provider work may finish after a timeout or disconnect and settle once; a duration never observed before invocation termination is unmeasured, charged zero and absorbed by the platform. A content-free journal retries observed measurements after temporary accounting failure. Never infer success or absence of billing from a timeout, and never retry an expensive render merely to poll it.

Verify a real PDF from the hosted application, including Unicode, page breaks, embedded assets and the expected document. Also verify scripts and external CSS/image/SVG requests cannot reach a controlled observer. A local mocked Browser binding does not prove provider isolation.

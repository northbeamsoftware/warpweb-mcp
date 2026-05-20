# warpweb-mcp

Official MCP server for the [Warpweb API](https://warpweb.ai) — research, build, and deploy AI-generated websites from any MCP-compatible client (Claude Desktop, Claude Code, Cline, Cursor, etc.).

```
You:    "Build a website for Brookside Plumbing in Austin TX, contact owner@brooksideplumbing.com."

Claude: I'll use the warpweb create_site tool.
        [tool call → siteId returned, build started]
        Site queued. Real builds take 3-8 minutes. I'll poll status...
        [tool call → get_site]
        ...complete. Live at https://brookside-plumbing-a1b2c3.warpweb.app
```

One POST → research → build → deploy. Warpweb pulls Google Places data (hours, photos, reviews, service area), writes vertical-matched copy, generates a design, builds a multi-page site, adds SEO (meta tags, sitemap, Schema.org JSON-LD), and deploys to a free `*.warpweb.app` subdomain. Best for service-based local businesses (trades, clinics, salons, agencies, restaurants, real estate).

---

## Quickstart

### 1. Get an API key

Sign up at [warpweb.ai](https://warpweb.ai), then issue a key at [warpweb.ai/app](https://warpweb.ai/app). Keys look like `wwk_...`. You get 520 free credits on signup — enough for one solid build plus a few revisions, no card required.

### 2. Add to your MCP client

**Claude Desktop** — edit `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "warpweb": {
      "command": "npx",
      "args": ["-y", "warpweb-mcp"],
      "env": {
        "WARPWEB_API_KEY": "wwk_your_key_here"
      }
    }
  }
}
```

**Claude Code** — add via the MCP UI or `claude mcp add`:

```bash
claude mcp add warpweb npx -y warpweb-mcp --env WARPWEB_API_KEY=wwk_your_key_here
```

**Cline / Cursor / others** — same shape: command `npx`, args `["-y", "warpweb-mcp"]`, env `WARPWEB_API_KEY`. Any client that speaks MCP stdio works.

### 3. Restart your client and try a prompt

```
"Build a website for Acme Plumbing in Austin TX, contact owner@acmeplumbing.com.
Emphasize 24/7 emergency service."
```

The client picks `create_site` from the tool list, fires the build, and polls until the deploy URL is live.

---

## Tools exposed

Nine tools, mapping 1:1 onto the Warpweb V1 REST API. Full request/response shapes live in [docs.warpweb.ai](https://docs.warpweb.ai).

### Sites
- **`create_site`** — kick off an end-to-end build. Returns `siteId` immediately; real builds take 3–8 minutes. Poll `get_site` or subscribe to the `site.complete` lifecycle webhook.
- **`get_site`** — fetch one site's current status. Use this to poll a build (every 2–5 seconds) while `status` is `generating`.
- **`list_sites`** — list every site on the account.
- **`refresh_site`** — bump the inactivity timer on a free-subdomain site (auto-pauses after 7 days). Idempotent and free.

### Revisions
- **`create_revision`** — conversational edit of a deployed site. Send a plain-English prompt; Warpweb routes small surgical edits or full structural changes automatically. Async, returns `revisionId`.

### Domains
- **`check_domain`** — check availability + price for a candidate domain. Free, returns a few related suggestions.
- **`register_domain`** — buy a domain via Cloudflare Registrar and attach it to a site. Must call `check_domain` first; the `price` field must match the cents returned there.
- **`attach_domain`** — for customer-owned domains already registered elsewhere. Returns the CNAME target to set at their existing registrar.

### Webhooks
- **`configure_form_webhook`** — point form submissions on a site at your HTTP(S) endpoint. Each delivery is HMAC-SHA256 signed; the signing secret is returned **once** on first configure or rotate — capture it immediately.

The LLM gets the full input schema (required/optional fields, types, descriptions) at runtime via MCP — no need to memorize parameters.

---

## Example prompts

- *"Build a website for [Business Name] in [City, State], owner email [email]."*
- *"Check if `<domain>` is available and what it would cost."*
- *"On site `<siteId>`, change the headline to mention free estimates and add an FAQ about emergency service."*
- *"Attach the domain `acmeplumbing.com` to site `<siteId>` — the customer already owns it at GoDaddy."*
- *"Configure form submissions on site `<siteId>` to POST to `https://my-crm.example.com/leads`."*

---

## Pricing

- **520 credits free on signup** (with email verification).
- **Credit packs**, one-time Stripe Checkout:
  - Starter — $5 for 100 credits
  - Builder — $25 for 600 credits (16% bulk discount)
  - Pro — $100 for 2,800 credits (29% bulk discount)
- **Active Site subscription** — $10/site/month, only on sites with a custom domain attached. Free-subdomain sites have no monthly cost.

Per-call directional credit costs:

| Tool | Cost |
|---|---|
| `create_site` | ~200–500 credits (billed at end-of-build against actual AI usage) |
| `create_revision` | ~20–100 credits |
| `attach_domain` | 5 credits |
| `register_domain` | 50 credits + registrar pass-through |
| `check_domain`, `get_site`, `list_sites`, `refresh_site`, `configure_form_webhook` | Free |

---

## Troubleshooting

**`Check WARPWEB_API_KEY env var` (401)**
The key in your client config is missing, malformed, or revoked. Issue a fresh one at [warpweb.ai/app](https://warpweb.ai/app). Keys start with `wwk_`.

**`Add credits at warpweb.ai/app/credits` (402)**
Account balance is 0 and auto-refill is off. Add credits or enable auto-refill on the dashboard.

**`Daily quota exceeded` (429)**
Per-day site / revision / domain limits exist to protect against runaway loops. The error message includes the quota object with `used`, `limit`, and `resetDescription`.

**`queue_full: true` (429 on revisions)**
Each site has a revision queue depth of 3 (1 running + 2 waiting). Wait for the current revision to land before queueing more.

**Tool list is empty when client connects**
`WARPWEB_API_KEY` isn't set in the client config's `env` block. The server starts in NO-TOOL mode so the connection still completes — set the env var and restart your client.

**Want to test against staging?**
Set `WARPWEB_API_URL` to point at a different base URL (default is `https://api.warpweb.ai/v1`).

---

## When NOT to use Warpweb

- Your business doesn't have a Google Places listing. Warpweb works, but the result reads more generic — research falls back to your `businessDescription`. Calibrated for service-based local businesses (trades, clinics, salons, agencies, restaurants, real estate).
- You want hand-coded templates with pixel-perfect control. Warpweb generates layouts; it doesn't take a Figma spec as input. Use Next.js / Astro yourself for that.
- You need a drag-and-drop builder UI. Warpweb is API-only.
- Static personal sites that never change. Cloudflare Pages alone is cheaper.

---

## Links

- API reference: [docs.warpweb.ai](https://docs.warpweb.ai)
- Marketing + signup: [warpweb.ai](https://warpweb.ai)
- API key management: [warpweb.ai/app](https://warpweb.ai/app)
- Repo: [github.com/northbeamsoftware/warpweb-mcp](https://github.com/northbeamsoftware/warpweb-mcp)
- Machine-readable reference (for LLM agents): [warpweb.ai/llms-full.txt](https://warpweb.ai/llms-full.txt)

## License

MIT — see [LICENSE](./LICENSE).

## Contributing

Issues + PRs welcome at [github.com/northbeamsoftware/warpweb-mcp](https://github.com/northbeamsoftware/warpweb-mcp). New tools should map 1:1 onto public V1 endpoints; don't surface internal Warpweb concepts.

# context.dev — live probe results

Probed **2026-08-08 ~10:40 GST** against the actual hackathon key (`ctxt_secret_…`).
These supersede the docs. Re-verify credit balance after the sponsor applies hackathon credits.

## Auth

- Base URL: `https://api.context.dev/v1`
- Header: `Authorization: Bearer $CONTEXT_DEV_API_KEY` (standard bearer, **not** `x-api-key`)
- Every response carries `key_metadata: { credits_consumed, credits_remaining }` — read it, don't trust pricing pages.

## Verified endpoint map

| Endpoint | Method | Status | Latency (observed) | Credits | Voice-safe inline? |
|---|---|---|---|---|---|
| `/web/scrape/markdown` | GET | 200 | 1.0s / 1.8s repeat | 1 | **Yes** |
| `/brand/retrieve` | GET | 200 | 0.48s (warm cache) | 10 | Yes if prefetched; 7s p50 cold |
| `/monitors` | GET | 200 | 0.57s | **0** | Yes |
| `/webdbs/collections` | GET | 200 | 0.42s | **0** | Yes |
| `/web/search` | POST | 200 | 3.95s cold / 2.16s repeat | 1 per 10 results | **No — background it** |
| `/news/search` | POST | **403** | — | — | **Not available on this key** |

## Decisive findings

1. **`/web/search` is 2–4s.** Too slow to sit inside a voice turn. Any design of the form
   *user asks → search → answer* will produce audible dead air. Search must be backgrounded,
   pre-warmed, or covered by a filler phrase.
2. **`/web/scrape/markdown` at ~1–1.8s is voice-safe.** Pattern: resolve the URL set ahead of
   time (background search / static seed list), then scrape on demand inside the turn.
3. **Repeat calls are still charged.** The 24h `maxAgeMs` cache reduces *latency*, not credits.
4. **Search credit formula confirmed: 1 credit per 10 results**, not 1 per result.
   (API reference was right; pricing page was wrong.)
5. **Monitors and WebDBs cost 0 credits to list/operate** and are open on this key. This is both
   the most differentiated surface vs Exa/Tavily/Firecrawl (they are pull-only) and the cheapest.
6. **`/news/search` returns 403** — tier-gated. Do not build on it.

## Credit budget reality

- Key started at **250 credits**. Hackathon credits applied ~11:10 GST → **50,225 confirmed**.
- Credits are now effectively unlimited for this build. **The binding constraint is requests/min, not credits.**

## Rate limits (measured from response headers, 11:10 GST)

| Bucket | `x-ratelimit-limit` | Notes |
|---|---|---|
| `/monitors/*` | **1000 / min** | Separate per-org pool; never contends with data traffic |
| `/web/*`, `/brand/*` (data plane) | **60 / min** | The real ceiling. Hobby-tier rate despite Scale-tier credits |

Design implication: fan-out is capped at 60 data-plane calls per minute. An 8-way parallel
search is fine; a broad crawl or a per-row extract sweep is not. Monitors have 16× the request
budget *and* cost 0 credits.

## Entitlement-gated endpoints (403, NOT fixable with credits)

Confirmed 403 after the credit top-up, so this is an entitlement group rather than a tier:

- `/news/search` — entity-verified news w/ `sourceCountry` + `articleLanguage`
- `/web/competitors`
- `/people/enrich`

All three are marked private-alpha in the OpenAPI spec. Ask the context.dev rep whether the
entitlement can be flipped; do not plan around them.

## WebDBs — fully probed 11:20 GST. This is the headline finding.

`/webdbs/*` is `x-hidden` in the OpenAPI spec and absent from `llms.txt`. It is open on this key
and it solves the voice-latency problem outright.

**Create:** `POST /webdbs/collections` → **201, 0 credits, 3.8s**

```json
{
  "name": "llm-pricing-probe",
  "schema": { "type": "object", "properties": { "model": {"type":"string","description":"..."}, ... } },
  "targets": [ { "type": "url_list", "seeds": ["https://...", "https://..."] } ]
}
```

Target discriminator is required: `type` ∈ `url | url_list | sitemap | crawl`.
`url_list` takes `seeds[]` (NOT `urls[]`).

**Server-applied defaults on creation:**

```json
"sync": { "every": "1d" },
"change_tracking": { "enabled": true, "retention": "90d" },
"on_disappear": "soft_delete", "stale_after": 3, "status": "active"
```

**Sync:** auto-starts on creation. `POST /webdbs/collections/{id}/sync` forces one
(returns `{run_id, already_running}`). **3 URLs → 3 rows in under 60 seconds.** 1 credit per row.

**Query:** `POST /webdbs/collections/{id}/query` → **0.52s / 1.55s / 0.52s, 0 CREDITS.**
Returns `{data, has_more, next_cursor, total, key_metadata}`.

**Every row carries rich metadata for free:**

```json
"_meta": {
  "first_seen_at", "last_checked_at", "last_changed_at",
  "change_count", "version",
  "extraction_confidence": 0.92,
  "fields": { "<field>": { "status": "extracted", "confidence": 0.9 } },
  "content_hash", "credits_used", "snapshot": { "captured_at" },
  "source": { "target_id", "entry_urls": [...] }
}
```

**Verified query language** (`POST /webdbs/collections/{id}/query`, 0 credits, 0.4–1.7s):

```jsonc
{
  "where":    { "model": { "contains": "gemini" } },   // also: eq
  "where":    { "_meta.change_count": { "gt": 0 } },    // _meta IS queryable → "what moved" is native
  "order_by": [ { "field": "model", "dir": "asc" } ],   // key is `dir` — NOT `direction` or `order`
  "limit":    5
}
```

Gotchas found the hard way: `order_by` entries need `{field, dir}`; `direction` and `order` both 400.
`url_list` targets take `seeds[]`, not `urls[]`. Targets require an explicit `type` discriminator.

**Row change history** — `GET /webdbs/rows/{row_id}/history` → **200, 0.65s, 0 credits**, returning
**field-level from→to diffs**:

```json
{"at":"2026-08-08T06:47:21Z","version":1,"event":"row.created",
 "fields":{"input_price_per_mtok":{"from":null,"to":"1.50"}}}
```

This is strictly better than prose diffing for a "what changed" product: the diffs are structured,
typed, and per-field, so there is no noise to tune away and nothing to mis-summarise.

**Rejections** — `GET /webdbs/collections/{id}/rejections` → 200, 0 credits. Pages that failed
eligibility, so the agent can say *why* it refused to trust a source.

### Why this matters

| Problem | How WebDBs solve it |
|---|---|
| Voice turns can't afford 2–15s fetches | Query is **0.5s** — comfortably inside a turn |
| 60 req/min data-plane cap | Queries appear to sit outside the paid data plane; syncs are background |
| Credit burn | Queries cost **0**; only syncs cost (1/row) |
| "What changed?" needs building | `change_count` / `last_changed_at` / `version` are **built in**, 90d retention |
| Agent overclaiming | Per-field `extraction_confidence` lets it hedge *honestly* |
| Differentiation | `x-hidden`, absent from `llms.txt` — no competing team will find it |

**Live test collection:** `col_71949d9f160b4d56ae0eed1d3c6a0e76` (`llm-pricing-probe`, 3 rows, active).

## Response shapes (confirmed)

`POST /web/search` → `{ results: [{ url, title, description, relevance, markdown }], query, key_metadata }`

`GET /web/scrape/markdown` → `{ success, markdown, contentLength, url, metadata, key_metadata }`

`GET /brand/retrieve?domain=` → `{ status, brand: { domain, title, description, slogan, colors,
logos, backdrops, address, socials, employees, is_nsfw, industries, links, primary_language }, code, key_metadata }`

## Latency mitigations available

- `POST /utility/prefetch` — **0 credits, rate-limit exempt.** Fire while the user is still
  speaking so the real lookup lands warm.
- `timeoutMS` (1000–300000) on essentially every endpoint, returns a clean 408 → fall back to speech.
- Scrape `maxAgeMs` defaults to 24h (max 30d, `0` forces fresh). Pre-warm demo URLs before presenting.

## Tooling installed

- Agent skill: `~/.agents/skills/context-dev/SKILL.md`, symlinked into `~/.claude/skills/context-dev`
- MCP server: `context` → `https://mcp.context.dev/mcp` (user scope). **Status: needs OAuth — run `/mcp` to authenticate.**
- Reference repos worth reading: `context-dot-dev/webdog` (monitors + webhooks),
  `context-dot-dev/crib-shortlist` (extraction API reference implementation).

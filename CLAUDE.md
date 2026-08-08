# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

**Built and shipped.** All six implementation units (U1–U6) are complete: listings on screen, voice
answering from memory, the uncertain voice, duplicate detection with a comparison panel, agent
conduct evals, and demo verification. A marketing landing page with email capture was added on top
of that, then U7–U9 (captions rail, rows scrolling into view, panel staleness), then U10–U11 (the
listing detail sheet, and pausing a conversation instead of ending it). 102 tests green,
production build passes.

`docs/plans/2026-08-08-001-feat-second-opinion-plan.md` records the requirements (R1–R21), key
technical decisions (KTD1–KTD7), and units — read it for *why* something is the way it is.
`docs/plans/2026-08-08-002-feat-conversation-recovery-plan.md` continues the numbering (R22–R24,
KTD8–KTD11) and covers everything that makes a conversation recoverable. Both are pre-build
artifacts, so where they and the code disagree, **the code is authoritative**. `README.md` and
`TECH-SPEC.md` at the root describe what actually shipped.

## The product in one paragraph

**Second Opinion** is a voice agent over Dubai rental listings. It answers questions about listings
in ~1s, tells you when the same physical apartment is advertised by two agencies at different
prices, and switches to an audibly different, less certain voice — naming the missing fact — when a
listing's data is too thin to trust. It is a hackathon submission (Dubai AI Hub Builder Lab #3),
judged on **codebase health and tool steering**, not just the demo.

## Stack and commands

Next.js App Router + TypeScript + **npm**. Vitest for the pure functions. No auth. The only
database is a single Supabase table holding the early-access list; nothing the product does depends
on it.

```
npm run dev          # :3000 is the landing page, :3000/app is the demo
npm test             # 102 pure-function tests, no network (committed fixtures)
npm run eval         # agent conduct via scripted conversations — no microphone needed
npm run sync-agent   # idempotent ElevenLabs agent provisioning from committed JSON
npm run check-hero   # is a demo-worthy duplicate group live right now? run before recording
npm run fixture      # recapture the test fixture from live data
npm run detail-fixture  # recapture the stored-page fixture the HTML parser tests
```

## Two surfaces

`/` is the marketing page, `/app` is the product. They share a root layout and nothing else:
stylesheets are scoped to `.marketing` and `.product` so neither theme leaks, `base.css` keys the
page background off `html:has(.product)`, and the 145 kB ElevenLabs SDK is imported only under
`/app`. Keep it that way — the front door's whole job is to load instantly.

- **Every figure on the landing page is computed, never typed.** `lib/listings/stats.ts` reads the
  same live collection the demo answers from. If the read fails the proof strip is dropped rather
  than filled with dashes. Do not hardcode a number into that copy.
- **The email gate is soft and must stay soft.** `/app` does not redirect. The address is asked for
  once and remembered in `localStorage`. A form between a judge and a working demo costs more than
  an uncollected address.
- **The waitlist cannot leak.** `public.second_opinion_waitlist` has RLS on and *no policies*; the
  only way in is the `security definer` function `join_second_opinion_waitlist`, which returns a
  position and nothing else. The key in `SUPABASE_PUBLISHABLE_KEY` can add a row and cannot read
  one. If you ever need to read the list, do it from the Supabase dashboard, not by adding a policy.
- **A broken waitlist never breaks the page.** Missing env or a Supabase outage still returns 200
  with `stored: false`, and the visitor still gets in.

## Architecture: the one property everything protects

**No network call happens during a voice turn.** The listings are read once from context.dev via a
server route on mount, normalised, and held in React state. ElevenLabs **client tools** (not server
tools) execute synchronously in the page against that in-memory array, and the same call sets the
React state that drives the screen — so speech and UI move together with zero latency.

```
context.dev WebDB ──(server-only, on mount + explicit re-read)──> /api/listings ──> React state
                                                                                      │
ElevenLabs agent ──(client tools: searchListings, findDuplicates, openListing)────────┘
                                                                                      │
                                          listings table + comparison panel + captions + detail sheet
                                                                                      │
                     stored page snapshot ──> /api/listings/[id]/detail ──> photos, off the voice path
```

Consequences that constrain how you write code here:

- The context.dev API key **never reaches the browser** — one server route proxies it (KTD6).
- All judged logic lives in **pure functions** — `lib/listings/` (`normalize`, `trust`,
  `duplicates`, `stats`, `comparables`, `snapshot`) plus `lib/transcript.ts`. No I/O below the route layer. These are the only
  things with tests (KTD5) — the voice agent and UI have no unit tests; agent *conduct* is covered
  by `npm run eval`, and delivery is verified by speaking to it.
- **Agent config is committed, not clicked.** Prompt, tool schemas, and voice labels live in
  `agent/second-opinion.json`, applied by a re-runnable script, so behaviour is reviewable as a
  diff (KTD4). This is the primary evidence of deliberate tool steering the rubric scores.

## Domain rules that are easy to get wrong

- **Duplicate tolerance is an absolute 3 sqft, never a percentage** (KTD3). Derived from measured
  data: 1–3 sqft gaps are rounding artifacts regardless of unit size, but 3% of a 1,723 sqft unit is
  a different layout. Exact size match → stated as fact; within 3 sqft → stated as *probable*.
- **Hedging keys on named data defects, not on the extraction confidence score.** The observed
  confidence band (0.71–0.95) clusters too tightly to threshold defensibly, and a threshold is
  unverifiable by a listener. Untrust reasons are a closed union: `no_agency`, `no_date`,
  `unreadable_date`, `no_size` (R8). Current hedge rate: 17%.
- **Bedroom formatting variance is never a defect** (R11). `"2 Beds"` vs `"2"` is normalised, not
  hedged on — treating it as a defect pushes the hedge rate from 17% to 52%. There is a test whose
  job is to stop a future contributor re-adding it.
- **Sale listings are dropped before anything else runs.** The crawl follows links into for-sale
  pages, which arrive with a purchase price in the annual-rent field. Anything at or above AED 1M/yr
  is a sale price — see `looksLikeSalePrice`. Unfiltered, the top "price gap" was 700,000 between
  two sale listings.
- **A missing size normalises to `null`, not `0`** — `0` would corrupt duplicate matching.
- **The agent says what to check, never what to do.** It does not recommend a listing, judge whether
  a price is good, or attribute motive to any agency (R13). The word "bait" is out of scope.
- **Nothing on screen may outlive the question that put it there** (R24). The comparison panel, the
  detail sheet, and the row highlights belong to the turn that produced them; `retireStalePanels` in
  `VoiceWidget` closes both panels as soon as their listings leave the current result set. A stale
  panel is worse than an empty one — it reads as an answer to the question just asked.
- **A duplicate is never a comparable.** `comparablesFor` puts the same physical flat advertised
  elsewhere in its own band and excludes it from "similar flats". One is a price you could hold an
  agent to; the other is a price you could argue from. Merged into one list, the product's actual
  finding disappears among near-misses.
- **`MATERIAL_SPREAD_AED` applies wherever a price gap is shown, not just in the duplicate panel.**
  The detail sheet renders a gap in green only when it clears that bar — an early build announced a
  one-dirham difference as a saving, which is the fastest way to stop a renter believing the
  numbers that matter. The `openListing` tool result carries `significance` for the same reason.
- **Comparable sizing is a percentage; duplicate matching is an absolute 3 sqft.** They answer
  different questions. "Same floor plan, rounded differently" is measured in feet at any unit size;
  "comparable flat" scales, because 100 sqft is a different flat at 600 and a rounding error at
  2,000. See the header of `comparables.ts` — do not unify them.
- **The agent has photos now, and has not seen them.** It may say they are on screen (only after
  `openListing` returns `opened: true`) and must never describe one. `npm run eval` has a scenario
  and a banned-phrase list whose only job is to catch it doing so.

## context.dev API facts (probed live — these supersede the docs)

Full results in `docs/ideation/context-dev-probe-results.md`. The load-bearing ones:

- Base `https://api.context.dev/v1`, header `Authorization: Bearer $CONTEXT_DEV_API_KEY` — standard
  bearer, **not** `x-api-key`.
- The rentals collection is `col_07cb99b4beec4713bc3145e77c6bfd68`. (`col_71949d9f…` is an unrelated
  LLM-pricing probe collection.)
- `POST /webdbs/collections/{id}/query` — **0.5s, 0 credits**. This is what makes the whole design
  work. `limit` maxes at 200.
- Query syntax gotchas, each found by getting a 400: `order_by` entries are `{field, dir}` —
  `direction` and `order` both fail. `url_list` targets take `seeds[]`, not `urls[]`. Targets need
  an explicit `type` discriminator.
- Every row carries `_meta` with `extraction_confidence`, per-field confidence, `change_count`, and
  `last_changed_at`. `_meta` is queryable.
- **`GET /webdbs/rows/{id}/snapshot?format=html` returns the original page, ~2s, 0 credits.** This is
  where the listing photos come from. It matters because **Bayut captchas live scraping**:
  `/web/scrape/markdown` on a detail URL returns "Captcha | Bayut" after ~9s. The snapshot is the
  copy context.dev's crawler already took, so nobody is being visited and nothing can block it.
  `?format=markdown` (the default) strips images — you need `html`. Parsed by `lib/listings/snapshot.ts`.
- The stored page carries fields the WebDB schema never extracted: bathrooms, the amenity list, the
  agent's prose description, and Bayut's own listing reference. Bayut's CSS class names are hashed
  and change per deploy, so the parser keys on semantics (`<h1>`, `aria-label="Baths"`) only.
- Bayut images (`images.bayut.com/thumbnails/{id}-800x600.jpeg`) hotlink fine — no referer check,
  `cache-control: max-age=31536000`.
- **`GET /webdbs/rows/{id}/history` is not usable as a "what changed" feature.** It looked promising
  — 51 of 200 rows have changes — but the tally is `listed_relative` 41, `bedrooms` 38, `community`
  26, `price` 7, and all 7 price moves are empty↔value flapping on sale listings. Zero genuine rent
  changes. `community: "Dubai Marina" → "5242 Towers, Dubai Marina, Dubai" → "Dubai Marina"` is the
  extractor being non-deterministic. That endpoint measures the crawler, not the market. Do not
  build a price-history feature on it without re-checking this.
- `/web/search` is 2–4s — **not voice-safe inline**. `/news/search`, `/web/competitors`, and
  `/people/enrich` all return **403** on this key (entitlement-gated, not fixable with credits).
- Binding constraint is **60 req/min on the data plane**, not credits (50k+ available). Monitors get
  a separate 1000/min pool and cost 0.

## ElevenLabs facts worth knowing before you wire it

- The uncertain voice is a **second labelled voice on one agent**, addressed by inline markup — one
  agent, one socket, no transfer latency (KTD2). Up to 10 voices per agent.
- `<elevenlabs-convai>` is the widget tag; `@elevenlabs/convai-widget-embed` has **no React
  wrapper** — use `@elevenlabs/react`.
- Overrides are disabled by default and must be enabled per-field in the agent's Security tab;
  sending an override for a disabled field **throws**. Wire key is `conversation_config_override`,
  JS SDK key is `overrides`. Prefer dynamic variables.
- The MCP `simulate_conversation` tool returns 500, but the underlying REST endpoint
  `POST /v1/convai/agents/{id}/simulate-conversation` works — that is what `npm run eval` drives.
  Client tools do not execute there (no browser), so evals assert *conduct*, not numeric accuracy.
- **`onMessage` delivers the `<sure>` / `<unsure>` markup verbatim** — the platform does not strip
  it before the transcript event. Verified against a stored conversation, not assumed. That is what
  lets the captions rail colour the hedge. `lib/transcript.ts` still treats untagged text as
  certain, so this staying true is not load-bearing.
- **A turn spent calling a tool arrives as a message with no text.** Filter those out before
  rendering, or you get blank caption lines between every question and its answer.
- `npm run eval` reads `ELEVENLABS_API_KEY` / `ELEVENLABS_AGENT_ID` from the environment, and `tsx`
  does not load `.env.local` the way `next dev` does. If it reports the keys are unset:
  `set -a; . ./.env.local; set +a; npm run eval`.

## Docs convention

`docs/` is partitioned into `ideation/`, `brainstorms/`, `plans/`, and `solutions/`. Write
exploratory notes, implementation plans, and post-hoc writeups into the matching directory rather
than the repo root.

`docs/ideation/demo-script.md` was corrected in U6 and now matches the build. It carries the spoken
demo script plus a failure protocol. Re-run `npm run check-hero` before recording — the listing
figures in it drift as the collection re-syncs.

## Credentials

`.env.local` (already gitignored) holds the keys; `.env.example` documents them. The app needs
`CONTEXT_DEV_API_KEY` and `ELEVENLABS_API_KEY`; `ELEVENLABS_AGENT_ID` is written by
`npm run sync-agent` on first run. `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` point at the
early-access table (Supabase project `a47-predict`, `kyszzgoorhocalezxtmp`) and are optional —
without them the sign-up form still lets people through, it just does not record them. Also present:
`ELEVENLABS_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`,
`HEYGEN_API_KEY`, `TAVILY_API_KEY`, `APIFY_TOKEN`, and BytePlus/ModelArk keys.

MCP servers are configured for ElevenLabs, HeyGen, Supabase, Vapi, Context7 and others — prefer
those tools over hand-rolled HTTP calls where they cover the task.

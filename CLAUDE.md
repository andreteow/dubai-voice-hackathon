# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

**No source code exists yet.** The repo holds documentation only: ideation, API probe results, and
an implementation-ready plan. The next commit is expected to scaffold the app.

The authoritative spec is **`docs/plans/2026-08-08-001-feat-second-opinion-plan.md`** — read it
before writing any code. It carries numbered requirements (R1–R21), key technical decisions
(KTD1–KTD7), and six implementation units (U1–U6) with their file lists, test scenarios, and a
sequencing table with an explicit cut line. Do not re-derive scope from the ideation docs; they
record superseded thinking.

## The product in one paragraph

**Second Opinion** is a voice agent over Dubai rental listings. It answers questions about listings
in ~1s, tells you when the same physical apartment is advertised by two agencies at different
prices, and switches to an audibly different, less certain voice — naming the missing fact — when a
listing's data is too thin to trust. It is a hackathon submission (Dubai AI Hub Builder Lab #3),
judged on **codebase health and tool steering**, not just the demo.

## Planned stack and commands

Next.js App Router + TypeScript + pnpm, deployed to Vercel. Nothing is installed yet, so these are
the commands the plan assumes rather than verified ones — replace this section with real commands
once the scaffold lands.

```
pnpm dev      # local dev server
pnpm test     # pure-function tests in lib/listings/ (Definition of Done requires green)
pnpm tsx agent/sync-agent.ts      # idempotent ElevenLabs agent provisioning
pnpm tsx scripts/check-hero.ts    # verify a demo-worthy duplicate group exists — run before recording
```

## Architecture: the one property everything protects

**No network call happens during a voice turn.** The listings are read once from context.dev via a
server route on mount, normalised, and held in React state. ElevenLabs **client tools** (not server
tools) execute synchronously in the page against that in-memory array, and the same call sets the
React state that drives the screen — so speech and UI move together with zero latency.

```
context.dev WebDB ──(server-only, on mount + explicit re-read)──> /api/listings ──> React state
                                                                                      │
ElevenLabs agent ──(client tools: searchListings, findDuplicates, explainTrust)───────┘
                                                                                      │
                                                                          listings table + comparison panel
```

Consequences that constrain how you write code here:

- The context.dev API key **never reaches the browser** — one server route proxies it (KTD6).
- All judged logic lives in **pure functions under `lib/listings/`** (`normalize`, `trust`,
  `duplicates`). No I/O below the route layer. These are the only things with tests (KTD5) — the
  voice agent and UI are verified by speaking to them.
- **Agent config is committed, not clicked.** Prompt, tool schemas, and voice labels live in
  `agent/second-opinion.json`, applied by a re-runnable script, so behaviour is reviewable as a
  diff (KTD4). This is the primary evidence of deliberate tool steering the rubric scores.

## Domain rules that are easy to get wrong

- **Duplicate tolerance is an absolute 3 sqft, never a percentage** (KTD3). Derived from measured
  data: 1–3 sqft gaps are rounding artifacts regardless of unit size, but 3% of a 1,723 sqft unit is
  a different layout. Exact size match → stated as fact; within 3 sqft → stated as *probable*.
- **Hedging keys on named data defects, not on the extraction confidence score.** The observed
  confidence band (0.77–0.93) is too narrow to threshold defensibly. Untrust reasons are a closed
  union: `no_agency`, `no_date`, `unreadable_date`, `no_size` (R8).
- **Bedroom formatting variance is never a defect** (R11). `"2 Beds"` vs `"2"` is normalised, not
  hedged on — treating it as a defect pushes the hedge rate from 16% to 52%. There is a test whose
  job is to stop a future contributor re-adding it.
- **A missing size normalises to `null`, not `0`** — `0` would corrupt duplicate matching.
- **The agent says what to check, never what to do.** It does not recommend a listing, judge whether
  a price is good, or attribute motive to any agency (R13). The word "bait" is out of scope.

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
- `simulate_conversation` is deprecated — the eval story is the Tests API, and it is explicitly
  deferred as out of scope for the deadline.

## Docs convention

`docs/` is partitioned into `ideation/`, `brainstorms/`, `plans/`, and `solutions/`. Write
exploratory notes, implementation plans, and post-hoc writeups into the matching directory rather
than the repo root.

**`docs/ideation/demo-script.md` currently contradicts the plan** and is scheduled for rewrite in
U6. Its hedge beat cites bedroom-count formatting (excluded by R11), it claims per-field confidence
drives the voice (superseded — defects do), and it includes a change-feed beat that was dropped.
Treat the plan as authority; do not build toward the demo script until U6 corrects it.

## Credentials

`.env.local` (already gitignored) holds the keys; `.env.example` documents them. This build needs
only `CONTEXT_DEV_API_KEY` and the ElevenLabs agent id — the app must run from a clean clone with
just those. Also present: `ELEVENLABS_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`,
`HEYGEN_API_KEY`, `TAVILY_API_KEY`, `APIFY_TOKEN`, and BytePlus/ModelArk keys.

MCP servers are configured for ElevenLabs, HeyGen, Supabase, Vapi, Context7 and others — prefer
those tools over hand-rolled HTTP calls where they cover the task.

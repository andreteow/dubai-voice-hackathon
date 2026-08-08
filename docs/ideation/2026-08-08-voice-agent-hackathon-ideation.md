# Ideation — Dubai Voice Agents Hackathon

> **FINAL VERDICT (11:50 GST, after re-ideation on the post-credit constraint set).**
> Build **a WebDB-backed voice agent whose vocal register tracks its own extraction confidence**,
> with a typed change feed as the second act. Everything below this box is the record of how that
> was reached; the ranking in the body reflects the *pre-credit* constraints and is superseded.
>
> **Core (must ship):** WebDB substrate → `…/query` (0 credits, 0.5–1.7s) drives every voice turn.
> Per-field `_meta.fields[].confidence` maps to voice register, switching mid-sentence.
> `…/changes` (0 credits, **0.42s**) supplies "what moved since this morning" as typed `from`→`to`
> scalars. `…/rejections` lets the agent say which sources it refused to trust.
> **Zero network calls in the voice path** — the core demo cannot fail live.
>
> **Stretch (only if core is done by 13:15):** one monitor + HMAC webhook → the agent interrupts
> itself unprompted. Biggest ElevenLabs beat available; also the likeliest thing to strand the
> build (needs a public deploy, HMAC, SSE, and server-initiated speech into a live session).
> Put it behind a flag and cut it without regret.
>
> **Killed on re-evaluation: CREDIT CHECK.** Its premise was honest scarcity. Beyond the obvious
> ("what's your balance?" → 50,219), the deeper problem is that the *interesting half of
> context.dev is free* — monitors, queries, changes and prefetch all cost 0 — so a credit governor
> would guard an empty room while the genuine constraint (60 req/min) went unmentioned. Keep the
> ledger as an instrumented `ContextClient` module (~20 min; banks the codebase-health point with
> zero demo risk); drop the refusal beat.
>
> **Also demoted:** THE NUMBER (free credits removed the scarcity that made its narrowness a
> virtue; its path is 8× `/web/search` at 2.2–3.9s — wrong latency profile). FIRST LIGHT (no
> deterministic beat; fold in as a free extra sitemap monitor). CUT ME OFF holds on merit as the
> best pure-ElevenLabs play and the safest second build, but barely touches context.dev.
>
> **Still dead, unmoved by credits:** RASHOMON and ON THE RECORD (403 entitlement),
> CHANNEL CHECK (sub-turn latency), SPLICE (prose-mush — highest regret, but regret isn't a plan),
> and the rest of the taste/complexity rejects.


**Generated** 2026-08-08 ~11:00 GST · **Submission deadline** 14:30 GST · **Build time remaining at writing: ~3h 30m**

---

## Grounding context

**Event.** Dubai AI Hub Builder Lab #3 — Voice Agents Hackathon, hosted at BUID. Brief: *"build a voice-first AI agent that knows something real about the world"* using context.dev (live web data), Cognition's Devin (AI coding), ElevenLabs (voice).

**Judging criterion, verbatim:** judges evaluate *"the codebase, not just the demo,"* emphasising *"codebase health and how well you steer the tools."* This is unusual and it is the single most important input to idea selection. Most teams will optimise the demo. The rubric says the repo is scored.

**Prizes.** Overall (3mo ElevenLabs Pro) · Best ElevenLabs (6mo Scale — largest) · Best Devin Use · Best context.dev (200k credits).

**Builder.** Solo · Next.js + Vercel + TypeScript · empty repo · bulletproof over flashy · no DB/auth preferred · targeting context.dev + ElevenLabs + Overall · Devin lightly · demo = scripted screen recording (~30 min budget).

**Explicit dealbreaker.** Anything that reads as "another RAG chatbot."

### Verified constraints (live probes, not docs — see `context-dev-probe-results.md`)

| Surface | Latency | Credits | Verdict |
|---|---|---|---|
| `/monitors/*` | **0.5s** | **0** | Voice-safe. The differentiated surface. |
| `/webdbs/collections` (list) | 0.4s | **0** | Open on your key |
| `/brand/retrieve` | 0.5s warm / ~7s cold | 10 | Voice-safe **only** if prefetched |
| `/web/scrape/markdown` | 1.0–1.8s | 1 | Voice-safe |
| `/web/search` | **2.2–3.9s** | 1 / 10 results | **Not** voice-safe inline |
| `/webdbs/preview` | **8.7s** | 1 | Background only |
| `/web/extract` | **15.0s** | 10 | Background only |
| `/news/search` | — | — | **403 — unavailable on your key** |

**Credit balance: 225.** Not the advertised 50,000. Redeem at the sponsor desk before building anything credit-hungry.

**ElevenLabs account:** Creator tier · 316k characters · **9/30 voice slots used (21 free)** · instant voice cloning enabled. Multi-voice ideas are all affordable.

**Backup scrapers available:** Tavily + Apify. These de-risk the *scrape* path only — nothing else provides baselined change detection, so monitors remain single-sourced on context.dev. Deliberately keep Tavily/Apify as a **fallback behind the same interface**, never as the primary path: for "Best context.dev Implementation" the sponsor's API must stay load-bearing. A `SourceAdapter` interface with `ContextDevAdapter` (primary) and `TavilyAdapter` (fallback) is both the safety story and a genuine codebase-health signal.

### ElevenLabs platform facts (verified against docs + live spec)

- **Widget**: `<elevenlabs-convai>` tag is unchanged despite the platform rename. `@elevenlabs/convai-widget-embed` is a script bundle with **no React wrapper** — for React use `@elevenlabs/react`.
- **Overrides are disabled by default** and must be enabled per-field in the agent's Security tab. Sending an override for a field that isn't enabled **throws** (except `asr.keywords`, which soft-fails silently). Wire key is `conversation_config_override`; the **JS SDK key is `overrides`**. Docs now recommend dynamic variables over overrides.
- **`simulate_conversation` is deprecated.** Build the eval story on the Tests API (`POST /v1/convai/agent-testing/create` + `POST /v1/convai/agents/{id}/run-tests`), not the MCP tool.
- **CI caveat**: `elevenlabs agents test <id>` exists and is pitched for pipelines, but there is **no documented exit-code contract**. Verify the exit code yourself (~10 min) before claiming a red build on regression in your README.
- **RAG** adds ~250ms; Creator tier gives 20MB total RAG storage.
- If you ever wire multi-agent transfer: the field is `params.transfers[]`, and **`enable_transferred_agent_first_message` defaults to `false`** — the agent you transfer *to* stays silent on arrival unless you set it `true`. A demo-killer.

### The structural insight that drives the ranking

The latency problem and the differentiation problem have **the same solution**.

`/web/search` at 2–4s makes *user asks → search → answer* produce audible dead air. But the architecture that avoids it — **background monitor detects a change → agent speaks unprompted** — is also:

- the one thing Exa / Tavily / Firecrawl **structurally cannot do** (all are pull-only), and
- the one thing a **chat** product cannot do (it can't interrupt you), and
- **free** (monitors cost 0 credits, which matters enormously at 225), and
- **deterministically demoable** (you can force a change by editing a page you own).

Four independent constraints converge on one architecture. That is rare, and it should dominate the decision.

### Topic axes used for generation

1. Live-data mechanics (freshness, multi-source divergence, velocity, monitoring)
2. Voice mechanics (barge-in, latency-as-UX, multi-voice, prosody, sound design, unprompted speech)
3. Interaction inversion (who talks first, who is being questioned, refusal, stakes)
4. Codebase legibility (what a judge sees on opening the repo)

**21 candidates generated across 3 frames · 6 survive · 15 rejected below.**

---

## Recommended: merge #1 and #2 into one build

The top two ideas arrived from different frames but are **the same architecture** with different framings. One is "read me what quietly changed"; the other is "create a watcher by voice." They share the monitor registry, the webhook handler, the diff renderer, and the unprompted-speech path. Building both costs roughly 30 minutes more than building either, and together they form a complete product loop: **you create a watcher by speaking, and it calls you back when the web changes.**

---

## 1. REDLINE — *the strongest single candidate*

> A voice agent that reports only the sentences someone quietly **deleted** — it watches pages nobody is supposed to notice changing, and reads you the old line and the new line in two different voices.

**Dialogue**

> **U:** "Anything move overnight?"
> **A:** "Three quiet edits. Loudest one — *[flat, dead 'ghost' voice]* 'We do not train on your data.' That was on their trust page at 09:40. As of eleven minutes ago it reads *[normal voice]* 'We may use your data to improve our services.' No blog post. No changelog entry."

**Demo, beat by beat**

1. A wall of ~12 watched URLs, each with monitor ID, last-run time, and a green/red CHANGED pill — all timestamps from the last three hours.
2. "Anything move overnight?" → agent returns a **real** diff accumulated since you seeded monitors at 11:00. A client tool auto-scrolls the diff panel to the changed line as it speaks.
3. **The multi-voice moment**: deleted sentence in a flat ghost voice, replacement in the agent's own voice. Captions read OLD / NEW.
4. **The proof beat** (deterministic): "watch — I'll do it myself." Edit one line of your own README in the GitHub web UI, say *"run monitor seven now"*, agent fires `POST /monitors/{id}/run`, narrates "queued… polling…", and ~8s later reads back the sentence you just deleted.
5. Agent volunteers a judgment from run history: "that's the fourth edit to that page today, none announced."

**Why context.dev is load-bearing.** Monitors *is* the product — baseline capture, whitespace-normalised visible-text diffing, semantic instruction-guided detection to suppress nav/timestamp noise, run history, changes API. Without it there is no "before": you'd hand-build a crawler, snapshot store, and differ, and still have zero history predating your deploy. No other key you hold provides baselined change detection.

**Why ElevenLabs is load-bearing.** A diff is a fundamentally *visual* object and reading one aloud is normally excruciating. Multi-voice markup assigning a distinct voice to deleted text makes a diff **audible** — old-self vs new-self as two characters. That is a voice invention, not voice decoration.

**Why it's not a RAG chatbot.** No corpus, no retrieval. The unit of knowledge is a *delta between two observations of the same URL* — information that exists nowhere on the web. The system manufactures it.

**Feasibility 5/5.** Schedule risk: monitor noise tuning (nav bars, rotating ads, timestamps causing false positives). Budget 30 min at 11:00 picking low-noise targets and writing semantic instructions, then leave them running while you build.

**Bulletproofing.** (a) Nothing changed → seed 12+ high-churn targets (status pages, pricing pages, policy pages, changelogs) at 11:00; the README self-edit beat is deterministic regardless. (b) Async run polling stalls → server tool returns "queued" immediately, agent narrates while a client tool polls, falls back to the stored changes list after 12s. (c) Total network loss → `FIXTURES=1` replays a captured `change.detected` payload at the HTTP boundary so the agent path is byte-identical.

**Codebase-health story.** `lib/monitors/registry.ts` is a **declarative list of watched targets** reconciled against the live monitor list on boot — a legible reconcile loop, not imperative setup. Typed context.dev client with zod-validated response schemas. Webhook handler verifies HMAC-SHA256 over `{t}.{rawBody}` — which requires preserving the **raw body** in a Next.js route handler, a real trap most people get wrong — with `timingSafeEqual`, timestamp-skew rejection, and replay protection keyed on change ID. Ship a test that posts a forged signature and asserts 401, and one that replays a valid delivery twice and asserts single processing. Every external call routes through one `fetchWithFixtures` primitive, so the whole app runs offline from recorded fixtures — one abstraction that is simultaneously the test story and the demo-safety story.

---

## 2. STANDING ORDER — *merge into #1*

> You tell it in one sentence what to watch, it provisions a real ten-minute web monitor on the spot, and it calls **you** back the moment the page starts meaning something different.

**Dialogue**

> **U:** "Watch OpenAI's pricing page and tell me if anything gets cheaper. Ignore copy changes."
> **A:** "Standing order created, `mon_8f3a`. Every ten minutes, semantic detection, instruction: 'a price decreases or a cheaper tier appears.' You'll hear from me."
> **A** *(unprompted, four minutes later)*: "Standing order two fired. Confidence 0.91, importance high. The o-series row moved from two dollars to a dollar fifty per million input tokens. Nothing else on the page changed — I diffed it."

**Why it's not a RAG chatbot.** The user is **provisioning live infrastructure with their voice**. Nothing is retrieved; something is *created*, and it outlives the conversation. This is the single sharpest one-sentence answer to the dealbreaker of any idea generated.

**Why ElevenLabs is load-bearing.** The agent **initiates speech** — a server-side event pushes into a live session and it talks without being asked. That is the inverse of every other demo in the room.

**Feasibility 4/5.** The one thing that could blow the schedule is server-initiated speech into a live session. **Pre-plan the fallback**: the webhook writes to an in-memory store, a visible toast fires, and the agent's next turn opens with the alert. Demo reads nearly identically.

**Bulletproofing.** Three layers: monitor a page **you own** and deploy an edit live (guaranteed change); `/monitors/{id}/run` forces an off-schedule run; keep one already-fired change pre-seeded.

---

## 3. CREDIT CHECK — *best codebase story of all 21*

> An OSINT agent with a hard credit budget and no way to earn more — you hear it decide which sources are worth paying for, and you hear it **refuse to answer** when it can't afford to be sure.

**Dialogue**

> **A:** "I have 92 credits. A search costs 1 and tells me who's saying it. Pulling their careers page and diffing headcount costs 10 and tells me if it's true. Spending 11." *(beat)* "Search: one anonymous post, three accounts repeating it, zero primary sources. Careers page: 14 UAE roles yesterday, 14 today. I'm at 81 and I'm stopping."
> **U:** "Spend everything, I need an answer."
> **A:** "That's not how this works — more spend buys me more of the same source. Here's what would change my mind: a filing, or a headcount drop. Neither exists. Confidence: twelve percent."

**Why it's strong.** The credit meter is *real* — every context.dev response returns `key_metadata.credits_consumed` / `credits_remaining`, so the ledger is not simulated. And your genuinely low balance (225) makes the constraint honest rather than theatrical. **Latency becomes a feature**: the agent narrating "that source timed out; I'm not paying for a retry" converts the 2–4s search into character.

**Codebase-health story — the best available.** Three pure, network-free modules: `Planner` (question + budget + price table → ordered plan), `Ledger` (append-only, immutable), `Policy` (refusal thresholds). All property-testable with zero mocking. You can point a judge at a test literally named `refuses_when_no_primary_source_within_budget` — a passing test that proves an *epistemic* property of the agent. That is the most direct possible answer to a rubric that says it judges the codebase over the demo.

**Feasibility 4/5.** Risk: it can read as conceptual/gimmicky if the underlying investigation is thin. Needs a genuinely live rumour picked at ~13:45, not 10:00.

---

## 4. CUT ME OFF — *most novel voice mechanic*

> A live briefing where the **only** input is interrupting it — the agent measures the exact word you cut it off on and rebuilds the briefing around your barge-ins.

**The mechanic.** Subtract the `agent_response_correction` event (truncated, emitted after barge-in) from the `agent_response` event (full intended utterance) and you get the exact unspoken remainder, and therefore the exact word the user interrupted on — a signal that exists nowhere else in the stack.

**Why it's not a RAG chatbot.** There is no question-answering turn structure at all. The user never asks anything; the entire input channel is *when you decide to stop listening*. A text version has no input.

**Codebase-health story.** `lib/interruption/index.ts` as a pure `(intended, corrected, alignment) => InterruptionPoint` with zero I/O, tested against a `fixtures/` directory of real recorded ElevenLabs event streams. A voice agent with deterministic, replayable tests of a *voice* behaviour is a rare artifact.

**Feasibility 4/5** — but **unverified dependency**: rests on exact ElevenLabs client-event semantics I have not confirmed against your account. Costs ~20 min to de-risk before committing. The briefing content itself is also the most generic part of any top-5 idea.

---

## 5. THE NUMBER — *safest build, weakest context.dev story*

> Ask about any contested figure in a breaking story and it fetches that number from eight named outlets **separately**, then reports the spread, the outlier, and who simply hasn't updated.

**Why it's good.** Feasibility 5/5, the simplest to build and hardest to break. The topic is a runtime input so nothing is hardcoded. Deliberately refuses to merge sources — output is a distribution plus a staleness ranking, never a single answer. Excellent typed-failure codebase story (`SourceResult` discriminated union: `ok | timeout | no_figure | blocked`, with graceful partial results).

**Why it's ranked 5th.** It uses `/web/search` with `includeDomains` — which Exa, Tavily and Firecrawl all do equally well. It is the **weakest "Best context.dev Implementation" story** in the survivor set, and eight parallel 2–4s searches sit right on the latency ceiling.

---

## 6. FIRST LIGHT — *best hook, damaged by the 403*

> It watches corporate sitemaps every ten minutes and tells you a press release exists **slightly before the press release exists**.

Sitemap monitors with `exact` detection return added/removed URLs — "URLs that did not exist ten minutes ago" is something nothing else in the stack can tell you. Mechanically the simplest of the monitor ideas (no semantic judgment needed).

**Damage:** the payoff beat — *"and zero news coverage exists yet"* — was designed on `/news/search`, which 403s. Substitutable with `/web/search` + `freshness: last_24_hours`, but that costs the crispness of entity-verified proof.

**Dominant risk:** sitemaps may simply be static all afternoon. Needs 20–25 high-churn targets plus one sitemap you control.

---

## Rejected — and why

**Killed by the `/news/search` 403 (verified unavailable on your key):**

- **RASHOMON** — three continents' press on one company, one voice per region, divergence named aloud. Excellent idea; entirely dependent on `sourceCountry` + `articleLanguage` entity-verified news. **Retest if the sponsor's credits lift your tier — this is the best idea in the dead pile.**
- **ON THE RECORD** — quote-vs-history contradiction timeline. Needs ISIN/ticker entity resolution and stable story IDs to avoid syndication triple-counting.

**Killed by latency (measured, not assumed):**

- **PRICE OF THOUGHT** — WebDB-backed live pricing table queried by voice. The hidden `x-hidden` WebDB surface *is* open on your key (confirmed), but `/webdbs/preview` took **8.7s** and first-sync wall-clock is unknown. Too much unmeasured risk for a 3.5h solo build. Genuinely the most impressive *"I read the actual OpenAPI spec"* signal available — revisit with more time.
- **CHANNEL CHECK** — hostile analyst interviews *you* and fact-checks your answers mid-turn. Superb inversion, but the whole design requires sub-turn checking; at 2–4s the pushback lands a turn late and the magic dies. Agent's own rating: highest variance of its set.

**Killed by the bulletproof constraint:**

- **THE ROOM IS WRONG** — the whole room answers from their phones, agent announces how wrong everyone is. Highest memorability of all 21. Also: needs shared room state across serverless instances (violates no-DB), depends on hackathon wifi, and its own generating agent rated it 2.5/5 and recommended against it as a core build. **Consider only as a bolt-on bonus round if you finish early.**
- **THE SPREAD** — prediction-market odds vs press certainty, with lead/lag. Polymarket is genuinely free and unauthenticated, but the lead/lag story is the hard part and layout-shift risk is real.

**Killed by mush-risk (demos beautifully in the plan, produces slop in practice):**

- **SPLICE** — one sentence, four voices, voice switches at the clause where sources stop agreeing. The single most striking 4 seconds available to any team that day. But contradiction detection across prose is the classic hackathon trap. Only viable with field-level diffs over a fixed schema, and that's an extra hour you don't have. **Highest regret of the rejected set.**
- **PITCH ME** — skeptic/quant/reporter panel attacks your investment thesis. Transfer-chain risk; the multi-voice fallback demos identically and is far safer, which means the transfer version's better architecture story isn't worth the risk.
- **README VS. REALITY** — two voices argue about whether a repo's README matches its code. Clever and self-referential, but it is the idea most at risk of reading as rubric-flattery, and it's socially risky if run on anyone's repo without consent.
- **CONVICTION** — agent holds a thesis with a confidence number and loses the argument out loud. Lovely, but confidence math is either honest-and-slow or fast-and-theatrical, and judges punish fake rigor hard.

**Killed as insufficiently differentiated:**

- **SQUAWK** — trading-floor squawk box that speaks unprompted. Good, but it is REDLINE/STANDING ORDER with a weaker "why is this surprising" hook; the monitor ideas dominate it on the same architecture.
- **WORKING THEORY** — agent narrates its own investigation while it runs, redirectable mid-fetch. The latency-as-UX craft here is excellent and **should be harvested into whatever you build** (see below), but as a standalone product it's a research assistant, which is close to the banned field.
- **BAROMETER** — wordless generated ambient soundscape whose texture tells you the state of a story. The most artistically interesting of all 21 and the only one whose primary output contains no language. Highest taste risk; reads as an art piece rather than a tool, and laptop speakers may kill it entirely.
- **WAS IT EVER** — was that "was AED 899" price ever real. Strong consumer hook, but archive.org coverage for GCC retailers is thin and it drifts toward the banned shopping-assistant field.

---

## Steal these regardless of what you build

Four mechanics from rejected ideas that cost <20 minutes and materially raise the ceiling:

1. **The `withTelemetry` tool wrapper** (from WORKING THEORY). Every context.dev call goes through one wrapper with a hard 4s timeout, an AbortSignal, structured logging, and a typed degraded result (`{status: 'timeout', source}`) that the agent is **prompted to narrate honestly** — "that one timed out, moving on." A timeout becomes a feature on camera instead of a hang. Given your measured latencies, this is close to mandatory.

2. **Agents-as-code** (from PITCH ME). Keep agent config in `agents/*.json` provisioned by an idempotent `scripts/sync-agents.ts`, not clicked into a dashboard. This single fact answers *"how well you steer the tools"* better than anything else available.

3. **`simulateConversation` evals** (from several). Automated conversation tests are almost unheard-of in a hackathon repo and land directly on "codebase health."

4. **`fetchWithFixtures`** (from REDLINE). One HTTP-boundary primitive that makes the app runnable offline. It is the test story and the demo-safety story in the same abstraction.

---

## Recommendation

**Build REDLINE + STANDING ORDER as one product.** It is the only candidate that satisfies every hard constraint simultaneously:

| Constraint | How it's satisfied |
|---|---|
| Latency ceiling | Push architecture — no inline search at all |
| 225 credits | Monitors cost **0** |
| Bulletproof | Deterministic trigger: edit a page you own + force-run the monitor |
| Not a RAG chatbot | Voice **creates infrastructure**; the knowledge is a delta that exists nowhere on the web |
| Best context.dev | Monitors is the surface competitors structurally lack |
| Best ElevenLabs | Unprompted speech + multi-voice diff reading + barge-in |
| Codebase health | HMAC raw-body verification, declarative registry, fixture replay, forged-signature test |

**Immediate next actions, in order:**

1. **Get the 50k credits redeemed at the sponsor desk.** Blocking.
2. **Seed 12+ monitors now, before writing any code.** They need runtime to accumulate real diffs. Every minute of delay costs demo material. This is the only irreversible time cost in the whole build.
3. Authenticate the context.dev MCP (`/mcp`).
4. Re-probe `/news/search` once credits land — it unlocks RASHOMON if the tier lifts.
5. Scaffold, then build the webhook handler first (it's the judged artifact).

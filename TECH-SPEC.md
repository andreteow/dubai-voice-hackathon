# Second Opinion — Technical Specification

Dubai AI Hub Builder Lab #3 · 8 August 2026. Shipped and deployed; `npm run check-hero` prints live
figures.

## Problem

The same apartment is advertised on Bayut more than once, by different agencies at different rents,
with nothing connecting them. Around one in five names no agency or posting date.

**Why voice.** The core output is a confidence signal, and a voice that changes speaker mid-clause
carries it before the sentence ends.

## Architecture

**No network call occurs inside a voice turn.** `/web/search` measures 2–4s; ask-search-answer is
dead air. Listings are read once on mount through a server route holding the key and kept in React
state. The agent's tools are **client** tools over that array — zero HTTP requests per turn, and the
call that answers also drives the screen.

The trade is bounded staleness: it answers from the page-load snapshot, with a re-read button.
Photos come from context.dev's stored page — Bayut captchas live scraping.

## Measured decisions

**Duplicate tolerance is an absolute 3 sqft, never a percentage.** Across 43 same-building,
same-bedroom pairs, 1–3 sqft gaps were rounding at every size; 3% of 1,723 sqft is a different
layout.

**Hedging keys on named absences, not the extraction score.** Confidence spans 0.71–0.95 — too
clustered to threshold, and unverifiable by a listener; "it doesn't say when it was posted" is
checkable.

**Sale listings are dropped above AED 1M/yr.** The crawl follows links into for-sale pages, whose
purchase price lands in the rent field; unfiltered, the top "gap" was 700,000 between two sales.

## Tools

**context.dev WebDBs**, not `/web/search`: the collection query is 0.5–1.7s at 0 credits, which
makes reading on mount free. `/news/search`, `/web/competitors`, `/people/enrich` all 403 here.

**ElevenLabs multi-voice**: two labelled voices on one agent, switched by inline markup mid-sentence
— not a transfer (a round trip; the target arrives silent), not prosody (inaudible on laptop
speakers). The markup survives to the transcript, so captions show the hedge.

**Devin: not used.** Git authorship shows it.

## Verification and next

102 tests over the pure functions, off committed fixtures. `npm run eval` asserts conduct via the
simulation API — it caught the agent quoting example prices from its own prompt without calling a
tool.

A second portal would make this "listed on two portals"; `groupDuplicates` ignores provenance. RERA
permit numbers would prove identity, but reach 16 of 200 rows.

# Second Opinion

**A voice agent that tells you when the same Dubai apartment is listed twice, at two prices.**

Dubai rental portals list the same physical flat more than once. Different agencies advertise the
same unit, sometimes seventy thousand dirhams apart, and nothing on the site indicates they are the
same property. You end up negotiating against a number someone else already beat.

Ask it about an area and it answers in under a second. Ask whether any of them are the same
apartment and it shows you, side by side, with links back to the live listings.

And when a listing is missing something a renter would want — no posting date, no agency named —
**its voice changes to a different speaker and it says which fact is missing.**

Built for the Dubai AI Hub Voice Agents Hackathon, 8 August 2026.
[context.dev](https://context.dev) for the live web data, [ElevenLabs](https://elevenlabs.io) for
the voice.

---

## The one idea worth knowing

**A voice turn makes no network calls.**

The listings are read once when the page loads. After that the agent's tools are *client* tools —
they run in the browser, synchronously, against an array already in memory. A question becomes
arithmetic over a few hundred objects, not a round trip.

That is why it answers in under a second with no filler noises, and why it does not care whether
the venue wifi is working. It is also why the same call that answers you updates the screen: one
mechanism, not two.

```
  browser                                   server            context.dev
  ┌──────────────────────────┐
  │ listings in React state  │ ◀── once, on load ──┤ /api/listings ├──▶ WebDB query
  │        ▲                 │
  │   client tools  (0 ms)   │
  │        ▲                 │
  │ ElevenLabs agent         │   ← no arrow crosses this box during a conversation
  │ two voices, one socket   │
  └──────────────────────────┘
```

## Where the thinking is

Three pure functions carry every judgement the product makes. They are the only things worth
reading closely, and they are where the tests are.

| File | Decides |
|---|---|
| `lib/listings/normalize.ts` | What a listing *is*, once the strings are gone |
| `lib/listings/trust.ts` | Whether a listing is complete enough to state plainly |
| `lib/listings/duplicates.ts` | Whether two listings are the same apartment |

### Three decisions the data made, not me

**The duplicate tolerance is 3 square feet, absolute — not a percentage.**
Measured across 43 same-building, same-bedroom pairs: 16 matched exactly, 10 differed by 1–3 sqft
(1625→1626, 851→852 — agents rounding the same floor plan), the rest by materially more. Every
rounding artifact was within 3 feet *regardless of unit size*, so a percentage is the wrong shape:
1% of a 1,723 sqft flat is 17 feet, which is a different layout. Exact sizes are stated as fact;
near matches are called *probable*, in the uncertain voice.

**Hedging keys on named absences, not on a confidence score.**
context.dev returns an extraction confidence per row, but the observed band is 0.77–0.93 — too
narrow for a threshold to feel like anything, and hard to defend when someone asks what it means.
"This one doesn't say when it was posted" is checkable in one click, and it is a fact a renter
actually wants.

Bayut writes bedroom counts as `1`, `1 Bed`, and `2 Beds`. That is formatting, not a defect —
treating it as one takes the hedge rate from 16% to 52%, at which point the uncertain voice fires
on half the table and means nothing. `TrustReason` is a closed union for that reason, and
`trust.test.ts` fails if anyone widens it.

**Sale listings are dropped.**
Bayut's detail URLs don't distinguish rent from sale, and the crawl follows links into sale
listings, which arrive with a purchase price in the annual-rent field. Unfiltered, the top result
was a 700,000 "price gap" between two sale listings. The data separates cleanly — 119 listings
between 50k and 150k, 43 between 150k and 500k, **nothing between 500k and 1M**, then the sales.
The empty band is what makes a million-dirham floor a boundary rather than a guess.

## The agent is code, not a dashboard

`agent/second-opinion.json` holds the prompt, the tool schemas, and both voices.
`npm run sync-agent` applies it, idempotently. The agent's behaviour is reviewable as a diff and
reproducible from a clean clone.

`npm run eval` talks to it without a microphone and asserts on what it says — that it still
refuses to value a price, stays inside the five areas it knows, and switches to the uncertain
voice. It found three real defects on its first run, including the agent quoting building names
and prices out of its own system prompt instead of calling a tool.

## Running it

```bash
npm install
cp .env.example .env.local     # add CONTEXT_DEV_API_KEY and ELEVENLABS_API_KEY
npm run sync-agent             # creates the agent, writes its id to .env.local
npm run dev
```

| | |
|---|---|
| `npm test` | The pure functions. No network — runs off a committed fixture. |
| `npm run eval` | Agent conduct, via scripted conversations. |
| `npm run check-hero` | Is there still a duplicate worth demoing? Run before recording. |
| `npm run fixture` | Recapture the test fixture from live data. |

## What it will not do

It states facts and says what you could check. It will not tell you which listing to call, will not
say whether a price is good, and will not suggest why an agency did anything. You cannot prove
intent from this data.

The claim it does make is narrower and holds up: **the same apartment appears at different prices,
and nothing on the site tells you.**

## Not built

Change tracking over time (the substrate supports it), areas beyond the five covered, a second
portal, and phone access. Scope and reasoning in
[`docs/plans/2026-08-08-001-feat-second-opinion-plan.md`](docs/plans/2026-08-08-001-feat-second-opinion-plan.md).

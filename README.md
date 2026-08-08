# Second Opinion

**A voice agent that tells you when the same Dubai apartment is listed twice, at two prices.**

Dubai rental portals list the same physical flat more than once. Different agencies advertise the
same unit — sometimes seventy thousand dirhams apart — and nothing on the page says they are the
same property. You end up negotiating against a number someone else already beat.

Ask it about an area and it answers in under a second. Ask whether any of them are the same
apartment and it puts them side by side, with links back to the live listings so you can check it
yourself.

And when a listing is missing something a renter would want — no posting date, no agency named —
**its voice changes to a different speaker and it tells you which fact is missing.** That is the
part worth hearing rather than reading: a screen can print a confidence badge, but you have to stop
and decode it. A voice that audibly softens tells you *don't lean on this one* before you have
finished hearing the sentence.

Built for the Dubai AI Hub Voice Agents Hackathon, 8 August 2026, with
[context.dev](https://context.dev) for the live listing data and
[ElevenLabs](https://elevenlabs.io) for the voice.

Engineering reasoning is in [`TECH-SPEC.md`](TECH-SPEC.md).

---

## Setup

Assumes a clean machine with Node 20+. Nothing else — no database, no auth, no Docker.

```bash
git clone https://github.com/andreteow/dubai-voice-hackathon.git
cd dubai-voice-hackathon
npm install
```

**Environment.** Copy the template and fill in two keys:

```bash
cp .env.example .env.local
```

| Variable | Required | Where it comes from |
|---|---|---|
| `CONTEXT_DEV_API_KEY` | yes | [context.dev](https://context.dev) dashboard. Starts `ctxt_secret_`. Server-side only — it is never sent to the browser. |
| `ELEVENLABS_API_KEY` | yes | [elevenlabs.io](https://elevenlabs.io) → Profile → API key. Starts `sk_`. |
| `ELEVENLABS_AGENT_ID` | written for you | Created by `npm run sync-agent` on first run. Do not hand-edit. |
| `CONTEXT_COLLECTION_ID` | no | Defaults to the public Dubai rentals collection this was built against. |

**Create the voice agent.** Its prompt, tools and both voices live in
`agent/second-opinion.json`; this applies them and writes the new agent id into `.env.local`:

```bash
npm run sync-agent
```

**Run it:**

```bash
npm run dev          # http://localhost:3000
```

Open the page, allow microphone access, press **Talk to it**, and ask
*"what's a two-bed in Marina going for?"*

### Other commands

| | |
|---|---|
| `npm test` | The pure functions — 39 tests. No network; runs off a committed fixture. |
| `npm run eval` | Agent conduct, via scripted conversations. No microphone needed. |
| `npm run check-hero` | Is there currently a duplicate worth demoing? Run before recording. |
| `npm run fixture` | Recapture the test fixture from live data. |
| `npm run build` | Production build. |

---

## Architecture

**One property governs the whole design: no network call happens inside a voice turn.**

The listings are read **once**, when the page mounts, through a server route that holds the API
key. They are normalised into typed records and kept in React state for the session. After that
the agent's tools are **client** tools — they run in the browser, synchronously, against that
in-memory array. A question becomes arithmetic over a couple of hundred objects rather than a
round trip.

That is why it answers in about a second with no filler noises, and why the same call that answers
you also updates the screen: one mechanism, not two.

```
   BROWSER                                      SERVER              context.dev
  ┌────────────────────────────────┐
  │  listings in React state       │ ◀── once, on mount ──  /api/listings  ──▶  WebDB query
  │            ▲                   │                        (holds the key)
  │      client tools              │
  │   searchListings ·             │
  │   findDuplicates               │
  │            ▲                   │
  │  ElevenLabs agent              │
  │  two voices, one socket        │
  └────────────────────────────────┘
        no arrow crosses this boundary during a conversation
```

The only other server call mints a short-lived signed URL when you press talk, so the ElevenLabs
key never reaches the browser either.

### Where the thinking is

Three pure functions carry every judgement the product makes, and they are where the tests are:

| File | Decides |
|---|---|
| `lib/listings/normalize.ts` | What a listing *is*, once the strings are gone |
| `lib/listings/trust.ts` | Whether a listing is complete enough to state plainly |
| `lib/listings/duplicates.ts` | Whether two listings are the same apartment |

```
raw row (every field a string)
  → normalize()        "1 Bed"→1, "Studio"→0, "AED 76,000"→76000, missing size→null (never 0)
  → classifyTrust()    → { trusted, reasons: no_agency | no_date | unreadable_date | no_size }
  → groupDuplicates()  → identical size → stated as fact
                       → within 3 sqft  → stated as probable, in the uncertain voice
```

### The agent is code, not a dashboard

`agent/second-opinion.json` holds the system prompt, both tool schemas and both voice labels.
`npm run sync-agent` applies it idempotently, so the agent's behaviour is reviewable as a diff and
reproducible from a clean clone.

`npm run eval` drives scripted conversations through the simulation API and asserts on what it
says — that it still refuses to value a price, stays inside the five areas it knows, and switches
to the uncertain voice. It found three real defects on its first run, the worst being the agent
quoting building names and prices out of its own system prompt instead of calling a tool.

---

## What it will not do

It states facts and says what you could check. It will not tell you which listing to call, will not
say whether a price is good, and will not suggest why an agency did anything — you cannot prove
intent from this data.

The claim it does make is narrower and holds up: **the same apartment appears at different prices,
and nothing on the site tells you.**

## Known limits

- It reads **200 listings per page load** (the collection holds more; the query API caps at 200).
- The data is a snapshot taken at page load. It does **not** update mid-conversation — see
  §02 of [`TECH-SPEC.md`](TECH-SPEC.md) for why that is deliberate. Press **Read again** for a
  fresh snapshot.
- Five Dubai communities only: Marina, JLT, JBR, Business Bay, Downtown.
- One portal (Bayut), so "duplicate" means *listed twice on the same portal*.
- Nothing persists between sessions. No database, no accounts.

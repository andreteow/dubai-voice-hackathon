# Second Opinion

**A voice agent that tells you when the same Dubai apartment is listed twice, at two prices.**

Different agencies advertise the same flat at different rents, and nothing on the portal says so.
Ask about an area and it answers in about a second, from memory. Ask whether any are the same
apartment and it puts them side by side, linked to the live listings.

When a listing is missing something a renter would want — no posting date, no agency named — **its
voice changes to a different speaker and names the missing fact.** A confidence badge must be
decoded; a voice that audibly softens says *don't lean on this one* before the sentence ends.

Dubai AI Hub Voice Agents Hackathon, 8 August 2026. [context.dev](https://context.dev) for the
listings, [ElevenLabs](https://elevenlabs.io) for the voice, [`TECH-SPEC.md`](TECH-SPEC.md) for the
reasoning.

## Status

Shipped and deployed to Vercel: voice answers from memory, the uncertain voice, duplicate detection,
the detail sheet, captions, pausing, conduct evals. 102 tests green, build passes.

## Setup

Node 20+. No database, no auth, no Docker.

```bash
npm install
cp .env.example .env.local   # add CONTEXT_DEV_API_KEY and ELEVENLABS_API_KEY
npm run sync-agent           # creates the agent, writes its id back
npm run dev
```

`:3000` is the landing page, `:3000/app` the demo — reachable directly; the email gate is soft on
purpose. Allow the microphone, press **Talk to it**, ask *"what's a two-bed in Marina?"*

Rows behind each answer are outlined, captions render the hedge in amber, and duplicates lift a
comparison panel. "Open the third one" adds photos, the same flat advertised elsewhere, and
comparable rents. Change the subject and it all retires.

## Commands

- `npm test` — 102 pure-function tests, no network
- `npm run typecheck` — strict `tsc --noEmit`
- `npm run eval` — agent conduct, no microphone
- `npm run check-hero` — a duplicate worth demoing now?
- `npm run build` — production build

`tsx` scripts need the environment first: `set -a; . ./.env.local; set +a; npm run eval`.

## Limits

200 listings per page load (API cap). The snapshot is fixed mid-conversation — press **Read again**.
Five communities: Marina, JLT, JBR, Business Bay, Downtown. One portal, so "duplicate" means
*listed twice on Bayut*. Nothing persists.

It states facts and says what you could check — never which listing to call, whether a price is
good, or why an agency did anything.

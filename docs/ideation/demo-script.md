# Demo video — spoken script

**Second Opinion.** Target **3:28**. Hard ceiling 3:35.

> Their six prompts sum to 4:15. This answers all six in 3:28 by cutting explanation, never
> evidence: every claim still lands on something visible. Lines marked ✂ are the next thing to go
> if you run long; lines marked ✚ are what to restore first if you find yourself with room.

> **Run `npm run check-hero` immediately before recording.** The collection re-syncs and the
> duplicate groups change — the hero building has moved twice already. It prints exactly which
> buildings to name and flags which are only *probable*.
> **Never say a number it did not just print.**
>
> Also run `npm run eval` once — it checks the agent still refuses to value prices, still switches
> to the uncertain voice, says nothing while a tool runs, and won't describe a photo it hasn't seen.

> **Pause the agent at 1:34, the moment the demo ends.** You then talk for 114 seconds straight.
> `turn_timeout` is 8 seconds and a muted mic looks exactly like someone who stopped talking — left
> connected, it will answer into your explanation, repeatedly. **Pause** mutes the mic, drops volume
> to zero, holds the socket open.

**Numbers below were true at 14:17 and drift.** Replace every one from `check-hero`.

## Where each judging question is answered

Woven, not chaptered — but each is landed in a sentence a judge scanning for it will catch.

| # | Their question | Where | Runtime |
|---|---|---|---|
| 1 | Problem, who it's for, why it matters | 0:00 | 17s |
| 2 | Live demo + live context.dev fetch, said out loud | 0:17 | 77s |
| 3 | "Would break without live web data because…" + mid-conversation change | 1:34 | 21s |
| 4 | What it does autonomously, ElevenLabs features, personality and voice | 1:55 | 30s |
| 5 | What's novel | 2:25 | 18s |
| 6 | Hardest problem | 2:43 | 24s |
| — | Repo (codebase health is separately scored) | 3:07 | 12s |
| — | Close | 3:19 | 9s |

Legend — **[SAY]** = you, out loud · **[AGENT]** = roughly what it comes back with ·
**(screen)** = what's visible · *(italics)* = delivery note.

**Shooting:** screen recording throughout, face inset. The app never leaves frame except for the
repo beat. No cut to a black talking-head — when you're explaining, the thing you're explaining is
still behind you.

**Keep the caption dock in frame.** Captions build above the voice button and the rows being
discussed scroll themselves into view, hedge colour-coded. You never narrate it — but it means the
video still reads muted, and some judges will watch it that way.

---

## 0:00 – 0:17 · Cold open — *question 1*

**(screen)** `/app` loaded, quiet table. Don't touch it yet.

*(Flat and unhurried. Stating a fact, not selling.)*

**[SAY]**
> "If you've rented in Dubai you've had this call. You ring about a flat, it's gone — but there's a
> similar one, slightly more expensive.
>
> Sometimes that's true. Sometimes it's the same apartment at a different price. And here you pay
> the year up front, so you find out twelve months late.
>
> We built something that reads the listings and just tells you."

---

## 0:17 – 1:34 · The demo — *question 2*

### 0:17 – 0:27 · The fetch, out loud

**(screen)** hard-refresh `/app` on camera. The table fills.

**[SAY]** *(this is the sentence question 2 is asking for — source, volume, timing)*
> "That's live, just now. A context.dev WebDB holding Bayut rental pages — eleven fifty rows. It
> takes two hundred, drops the for-sale listings that leak into the crawl, keeps the hundred and
> sixty-five that are actually rentals."

### 0:27 – 0:42 · It answers instantly

**[SAY]** *(to the agent, conversational — not to camera)*
> "What's a two-bed in the Marina going for?"

**[AGENT]** — a count and a typical rent. It volunteers a duplicate without being asked.

**[SAY]**
> "Under a second. It isn't searching while I talk — it read everything once on load. That's the
> whole latency budget. Voice dies at two seconds."

### 0:42 – 1:14 · Live re-read, then the reveal

*(One beat, not two — this merge is where most of the runtime came from. The re-read happens first
so the reveal demonstrably lands on new rows, which pays for questions 2 and 3 at once.)*

**[SAY]**
> "Watch this."

**(screen)** click **Read again**. The timestamp changes. Don't explain it yet.

**[SAY]** *(the word "anywhere" matters — it stops the agent scoping to the Marina two-beds you were
just discussing, which returns a smaller group than `check-hero` printed)*
> "Is the same apartment listed twice anywhere?"

**[AGENT]** — names the widest group and the gap. Whatever `check-hero` printed **first**.

**(screen)** the comparison panel lifts in: building, bedrooms and size across the top, each price
its own card, cheapest outlined.

**[SAY]** *(your best line — land it, then stop talking)*
> "I re-read the whole collection from context.dev five seconds ago, mid-conversation, socket still
> open — and that answer came off the new rows.
>
> Three agencies, one flat. Same building, same three bedrooms, same seventeen hundred and
> twenty-three square feet. Two of them are one dirham apart. The third is twenty thousand more."

*(pause — two full seconds. Do not fill it.)*

> **The shape, for when the data has moved.** Today: Forte 1 — 249,999, 250,000, 270,000. It works
> because two of the three agree almost exactly, which makes the third an outlier rather than a
> spread. Rebuild it the same way from whatever `check-hero` prints: **identity first** (same
> building, same bedrooms, same *exact* square footage), **then the gap**. No near-tie in today's
> numbers? Use a percentage — "ten thousand on a seventy-five thousand dirham flat, thirteen
> percent, for picking up a different phone." Never lead with the price. The finding is that it's
> *the same flat*.

### 1:14 – 1:34 · It tells you when it isn't sure

*(The prize beat. Set it up plainly and get out of the way.)*

**[SAY]**
> "Which of these are you not sure about?"

**[AGENT]** — *the voice changes to a different speaker* and it names the specific gap: a probable
match whose sizes differ by a few feet, or a listing with no agency and no posting date.

**[SAY]**
> "Different speaker. Thirty-three of these hundred and sixty-five don't say who's advertising them,
> or when they went up. You hear that before you've finished reading the row."

---

## 1:34 – 1:55 · Why live data — *question 3*

**(screen)** **Click Pause first** — one beat, no commentary. The state line reads *"paused — it
can't hear you, and it won't speak."* Leave it visible; it's a quiet second answer to question 4.

Then stay on the app. The timestamp is still visible; that's the evidence.

**[SAY]** *(complete their sentence deliberately — say the words)*
> "Our project would fundamentally break without live web data because the finding *is* a
> contradiction between two adverts that are live at the same moment. There's no cached version of
> 'these two disagree right now.'
>
> Mid-conversation: you saw it. The bulk read happens once, on load — that's what buys the
> sub-second answer. But it re-runs on demand, and the next tool call uses the new rows. What it
> doesn't do is watch for changes by itself. ✚ I checked whether the crawler's own change history
> would give me that for free. It records the crawler settling, not the market. So that's next."

---

## 1:55 – 2:25 · What it does on its own — *question 4*

**(screen)** `agent/second-opinion.json`, scrolled to the `voices` block and the tool schemas.
Scroll slowly — evidence, not a code tour.

**[SAY]**
> "On its own it picks a tool and calls it, carries the thread across turns, volunteers a duplicate
> you didn't ask about, and refuses to tell you whether a price is good — without ever refusing and
> stopping. ✂ It says nothing at all while a tool runs. No 'one moment'.
>
> The ElevenLabs part: two labelled voices on one agent, switched by inline markup. One socket, no
> handoff, so the shift can land mid-sentence. Client tools rather than server tools, so nothing
> goes over the network mid-turn.
>
> Personality is one decision — it's on the renter's side. And the unsure voice is a different
> person, not a softer version of the same one. That would read as tone. A different speaker reads
> as doubt."

---

## 2:25 – 2:43 · What's novel — *question 5*

**(screen)** back to the app, comparison panel visible.

**[SAY]**
> "The novel part isn't a voice agent over property listings — it's the question.
>
> Everything else answers 'find me a two-bed'. This answers 'which of these are the same flat at two
> prices' — a fact no single listing can contain and no listing site has any reason to surface.
>
> Search finds you listings. This finds you the contradiction between them."

---

## 2:43 – 3:07 · Hardest problem — *question 6*

**(screen)** `lib/listings/trust.ts` — the closed union of untrust reasons. Don't read it aloud.

**[SAY]**
> "Hardest thing: making it say 'I'm not sure' for a reason you could actually check.
>
> The obvious move is thresholding the extraction confidence score. I measured it — the whole
> collection sits between point seven one and point nine five. Too tight to draw a defensible line,
> and nobody listening can verify a number they can't see.
>
> So it doesn't use a score at all. It hedges on named missing facts: no agency, no posting date, an
> unreadable date, no size. Four reasons, and you can check every one.
>
> ✚ An earlier version also counted bedroom formatting as a defect. The hedge rate went from one in
> five to more than half — and an agent that's unsure about half of everything is one you stop
> listening to."

---

## 3:07 – 3:19 · The repo *(separately scored — do not skip)*

**(screen)** three fast cuts: the committed JSON, `npm run eval` running, `npm test` green.

**[SAY]**
> "Prompt, tool schemas and voice labels are one committed JSON file applied by a script — so
> behaviour is a diff, not a click. This asserts conduct with no microphone; it caught the agent
> quoting placeholder numbers out of its own prompt as if they were listings. And a hundred and two
> tests on the pure functions, no network."

---

## 3:19 – 3:28 · Close

**(screen)** back to the app.

**[SAY]** *(level)*
> "A hundred and sixty-five listings, read live and re-read mid-conversation. It finds the same flat
> listed twice, and it tells you when it isn't sure.
>
> Those are today's prices."

**(END)**

---

## What got cut to make 3:28, and what it would cost to restore

| Cut | Was | Why it's safe to lose |
|---|---|---|
| "What about JLT?" — the thread-carrying beat | 12s | The claim survives in question 4. Demoing it costs four times what saying it does. |
| The listing detail sheet (`openListing`) | 28s | Shipped in `e9c66c8`, 43 tests, its own eval scenario — and it's a *second* live context.dev fetch with photos arriving on camera, plus the agent admitting it hasn't seen them. **The best thing not in this cut.** Restore only if you're allowed past 4:00. |
| "Every link goes back to the live listing" | 6s | The links are visible on screen anyway. |
| The price-history negative result | 10s | Kept as a ✚ half-sentence in question 3. |
| The bedroom-formatting anecdote | 10s | Kept as a ✚ in question 6. |

## Delivery notes

- **Underplay it.** The material is damning on its own; selling it makes it sound fabricated. Read
  the gap line like a train time.
- **The two-second pause after the reveal is the most valuable silence in the video.** Don't fill it.
- **The gap between your question and its answer is silent by design.** The agent says nothing while
  a tool runs. Don't read that half-second as a failure and talk over it — it's what makes the
  answer feel instant when it lands.
- **Hit Pause at 1:34.** The single most likely way to lose an otherwise good take.
- **Question 3 is fill-in-the-blank.** Say their words — "would fundamentally break without live web
  data because" — so the answer is unmissable.
- **Never say "AI-powered", "leveraging", or "seamlessly".** Say what it did.
- **Wear headphones.** Laptop mic plus laptop speakers will make it interrupt itself.
- At this length the demo should be **one take, 0:00–1:34**. Sections 3–6 can be separate takes;
  nobody minds a cut between answers.
- Say a real number in the first 20 seconds and again in the last 10.

## If something breaks

| | |
|---|---|
| It mishears you | Keep rolling, rephrase once. Recovering on camera reads as confident. |
| A query returns nothing | "Nothing there — try Marina." Then ask the working one. |
| **Read again** returns the same count | Don't mention the count. The claim is that it re-read, not that the data moved — the timestamp on screen proves the fetch. |
| It names a *smaller* group than `check-hero` did | It scoped to what you were just discussing. Read the numbers off the panel — the line works with any figures. Or: "across all of them, not just the Marina." |
| No material duplicate group | `check-hero` tells you *before* you record. Open on the uncertain-voice beat instead. |
| It talks over your explanation | You didn't pause. Hit **Pause**, say "one second — let me mute it", keep going. That recovers on camera; restarting doesn't. |
| Voice drops entirely | The table and comparison panel are still on screen — narrate them. |
| Everything fails | Ship 0:42–1:34 alone: re-read, reveal, uncertain voice. Questions 2, 3 and 4 in fifty seconds. |

## What you are deliberately not claiming

Do not say it detects fraud, that agents are lying, or that anyone is baiting anyone. You can't
prove intent from this data and a judge may know this market better than you.

Do not claim it notices changes on its own. It doesn't. The re-read is triggered, and question 3
says so out loud — that sentence is worth more than the overclaim would be.

Do not say it read eleven hundred and fifty listings. It reads two hundred rows and keeps a hundred
and sixty-five rentals.

The honest claim is stronger anyway: **the same apartment appears at different prices, and nothing
on the site tells you.** Stay there.

# Demo video — spoken script

**Second Opinion.** Target 2:00, hard ceiling 2:15.

> **Run `npm run check-hero` immediately before recording.** The listings re-sync every ten
> minutes and the duplicate groups change. It prints exactly which buildings to name, flags which
> ones are only *probable* matches, and tells you if there is no material gap right now.
> **Never say a number it did not just print.**
>
> Also run `npm run eval` once — it checks the agent still refuses to value prices, stays inside
> the areas it knows, and switches to the uncertain voice. Takes about a minute.

Legend — **[SAY]** = you, out loud · **[AGENT]** = roughly what it should come back with ·
**(screen)** = what's visible · *(italics)* = delivery note.

Numbers below were true at 12:20. **Replace them with whatever `check-hero` prints.**

---

## 0:00 – 0:14 · Cold open

*(No app on screen. Just you. Flat and unhurried — you're stating a fact, not selling.)*

**[SAY]**
> "If you've rented in Dubai, you've had this happen. You call about a flat, and the agent tells
> you it's gone — but there's a similar one, slightly more expensive.
>
> Sometimes that's true. Sometimes it's the same apartment, and someone else is being quoted
> a different number for it."

*(beat)*

> "So I built something that reads the listings and just… tells you."

**(screen)** cut to the app at `localhost:3000/app`. Quiet table. Voice button bottom-left.

*(From the first answer onward, captions build above the button and the rows being talked about
scroll themselves into view. You do not need to narrate either — but it does mean the recording
still reads if a judge watches it muted, so keep the dock in frame.)*

*(Have `/app` already open in its own tab before you start. The landing page at `/` is worth two
seconds at the very end if there's time, not here — it costs you the opening beat.)*

---

## 0:14 – 0:32 · It answers instantly

**[SAY]** *(to the agent, conversational — not to camera)*
> "What's a two-bed in Marina going for?"

**[AGENT]** — a count and a typical rent, then it volunteers a duplicate without being asked.

**[SAY]**
> "How current is that?"

**[AGENT]** — names when it read the listings.

*(Then to camera, briefly:)*

**[SAY]**
> "That came back in under a second, because it isn't searching the web while I'm talking.
> It read everything once when the page loaded, and it's been answering from memory since."

---

## 0:32 – 1:06 · The reveal — this is the demo

**[SAY]**
> "Are any of these the same apartment?"

**[AGENT]** — names the widest group and the gap.

**(screen)** the comparison panel lifts in: shared building, bedrooms and size across the top,
each price as its own card underneath, cheapest outlined.

**[SAY]** *(your best line — land it, then stop talking)*
> "Seventy thousand dirhams. Same building, same number of bedrooms, same square footage —
> and depending on who picks up the phone, that's what it costs you."

*(pause — two full seconds. Do not fill it.)*

**[SAY]**
> "Anything worse than that?"

**[AGENT]** — Forte 2, three agencies, three prices, one flat.

**[SAY]** *(dry, no editorialising)*
> "Three agents. Three prices. One apartment."

**(screen)** point at the "Check it yourself →" links.

**[SAY]**
> "Every one of those links goes back to the live listing. You don't have to believe me."

---

## 1:06 – 1:30 · It tells you when it isn't sure

*(The prize beat. Set it up plainly.)*

**[SAY]**
> "Which of these are you not sure about?"

**[AGENT]** — *the voice changes to a different speaker* and it names the specific gap: a listing
with no posting date, or no agency named.

**[SAY]** *(to camera — the one moment you explain rather than show)*
> "That's a different voice, and it isn't decoration. Thirty of these listings don't say when they
> were posted or who's advertising them. When it's working from one of those, you hear it before
> you've finished reading the row.
>
> An old listing at a low price is exactly the thing you'd want to know about — and the site
> doesn't tell you either."

> **Optional, if `check-hero` flagged a PROBABLE group:** ask *"are those definitely the same
> flat?"* — it should hedge and say the sizes differ by a couple of feet. Strong, but cut it if
> you're near time.

---

## 1:30 – 1:50 · The repo *(judges said they score this — do not skip)*

**(screen)** cut to the editor. Three things, fast.

**[SAY]**
> "Three things in the code worth thirty seconds.
>
> One — the duplicate tolerance is three square feet, not a percentage. I measured it: forty-three
> pairs in the same building, and every rounding difference was within three feet no matter how big
> the flat. A percentage would call a seventeen-foot difference the same apartment. There's a test
> that fails if anyone changes it.
>
> Two — the crawler picked up for-sale listings with purchase prices in the rent field. Unfiltered,
> the top result was a seven-hundred-thousand 'gap' between two sale listings. That's caught and
> dropped.
>
> Three — this." *(show `npm run eval`)* "It talks to the agent without a microphone and checks it
> still refuses to value prices and still switches voices. It caught the agent quoting numbers out
> of its own prompt instead of the data."

**(screen)** `npm test` — 59 green.

---

## 1:50 – 2:05 · Close

**[SAY]** *(back to camera, level)*
> "A hundred and eighty listings, read live. It finds the same flat listed twice, and it tells you
> when it isn't sure.
>
> Nothing here is a mock-up. Those are today's prices."

**(END)**

---

## Delivery notes

- **Underplay it.** The material is damning on its own; selling it makes it sound fabricated.
  Read the seventy-thousand line like a train time.
- **The two-second pause is the most valuable silence in the video.** Do not fill it.
- **Never say "AI-powered", "leveraging", or "seamlessly".** Say what it did.
- **Wear headphones.** Laptop mic plus laptop speakers will make it interrupt itself.
- Record in **one take** if you can. Small stumbles read as live; polish reads as canned.
- Say a real number in the first 20 seconds and again in the last 10.

## If something breaks

| | |
|---|---|
| It mishears you | Keep rolling, rephrase once. Recovering on camera reads as confident. |
| A query returns nothing | "Nothing there — try Marina." Then ask the working one. |
| No material duplicate group | `check-hero` tells you *before* you record. Open on the uncertain-voice beat instead. |
| Voice drops entirely | The table and comparison panel are still on screen — narrate them. |
| Everything fails | Ship the 0:32–1:06 duplicate reveal alone. That beat carries the submission. |

## What you are deliberately not claiming

Do not say it detects fraud, that agents are lying, or that anyone is baiting anyone. You cannot
prove intent from this data and a judge may know this market better than you.

The honest claim is stronger anyway: **the same apartment appears at different prices, and nothing
on the site tells you.** Stay there.

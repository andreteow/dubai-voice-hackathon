# Demo video — spoken script

**Target: 2:00. Hard ceiling 2:15.** Record ~13:50, submit by 14:30.

Legend — **[SAY]** = you, out loud into the mic · **[AGENT]** = target reply, tune the system
prompt until it lands close to this · **(screen)** = what's visible · *(italics)* = delivery note.

> **Re-pull your hero numbers immediately before recording** — the collection re-syncs every
> 10 minutes and prices move:
> ```
> curl -s -X POST https://api.context.dev/v1/webdbs/collections/col_07cb99b4beec4713bc3145e77c6bfd68/query \
>   -H "Authorization: Bearer $CONTEXT_DEV_API_KEY" -H "Content-Type: application/json" \
>   -d '{"limit":200}'
> ```
> Swap the figures below for whatever is true at 13:50. Never say a number you haven't just seen.

---

## 0:00 – 0:14 · Cold open

*(No app on screen yet. Just you. Flat, unhurried — you're stating a fact, not selling.)*

**[SAY]**
> "If you've rented in Dubai, you've had this happen. You call about a flat, and the agent tells
> you it's gone — but there's a similar one, slightly more expensive.
>
> Sometimes that's true. Sometimes it's the same apartment, and someone else is being quoted
> a different number for it."

*(beat)*

> "I built something that reads the listings and just… tells you."

**(screen)** cut to the app. A quiet table of listings. Nothing flashy. Voice widget bottom-right.

---

## 0:14 – 0:34 · It answers instantly

**[SAY]** *(conversational, to the agent, not to camera)*
> "What's a two-bed in Marina going for?"

**[AGENT]** *(crisp, certain)*
> "One hundred and thirty-eight listings. Median is a hundred and ten thousand."

**[SAY]**
> "How current is that?"

**[AGENT]**
> "I last read these pages nine minutes ago."

**(screen)** the table filters as it speaks.

*(Point out — briefly, don't labour it:)*

**[SAY]**
> "That came back in under a second, because it isn't searching the web while I'm talking.
> It already read all of it."

---

## 0:34 – 1:08 · The reveal — this is the whole demo

**[SAY]**
> "Are any of these the same apartment?"

**[AGENT]** *(matter-of-fact — do NOT let it sound triumphant)*
> "Eleven of them are. Twenty-two listings, eleven actual flats.
>
> The widest is West Avenue — one bedroom, seven hundred square feet, Dubai Marina.
> One agent has it at seventy-six thousand. Another has it at a hundred thousand.
> Same building, same size, same layout. Twenty-four thousand dirhams apart."

**(screen)** the two rows lift out of the table and sit side by side. Identical sqft highlighted.

**[SAY]** *(this is your best line — land it, then stop talking)*
> "Twenty-four thousand. That's three months' rent, on the same flat, depending on who picks
> up the phone."

*(pause — two full seconds of silence)*

**[SAY]**
> "Anything worse?"

**[AGENT]**
> "Blakely Tower is listed twice by the same agency. Engel and Völkers, both posted on the
> seventh of August, five thousand apart."

**[SAY]** *(dry, no editorialising — let it sit)*
> "Same agency. Same day."

---

## 1:08 – 1:32 · It tells you when it isn't sure

*(This beat wins the ElevenLabs prize. Set it up plainly.)*

**[SAY]**
> "How confident are you in all this?"

**[AGENT]** *(starts crisp, then audibly softens and slows on the second half)*
> "On most of it, high — building names and prices are stated plainly.
>
> But DAMAC Heights I'd treat carefully. *(softer)* That page writes the bedroom count three
> different ways, and I only pulled it at seventy-eight percent. I'd check that one yourself
> before you rely on it."

**(screen)** that row's confidence chip dims to amber exactly as the voice drops.

**[SAY]** *(to camera, briefly — the one moment you explain rather than show)*
> "That number isn't decoration. It's the extractor's own confidence score, per field.
> When it's unsure, you hear it before you read it."

---

## 1:32 – 1:50 · It notices quiet changes

**[SAY]**
> "Has anything changed since this morning?"

**[AGENT]**
> "Yes — [N] listings have moved since I started watching at eleven-forty.
> One went up four thousand dirhams. Same photos, same unit, new number, no note on the page."

**(screen)** a before/after row: old price struck through, new price beside it, with timestamps.

> **If the change feed is empty at record time:** cut this beat entirely rather than faking it.
> The demo is strong without it. Alternatively, force a re-read on camera —
> `POST /webdbs/collections/{id}/sync` returns in 0.5s — and say *"read them again now."*

---

## 1:50 – 2:05 · The repo *(judges said they score this — do not skip it)*

**(screen)** cut to the editor. Two files, nothing more.

**[SAY]** *(brisk — you're pointing, not explaining)*
> "Two things in the code worth thirty seconds.
>
> One schema defines the data, and both the extraction contract and the TypeScript types come
> out of it — so the database and the app can't disagree.
>
> And the confidence-to-voice mapping is a pure function with tests. The agent sounding unsure
> is a tested behaviour, not a prompt I hoped would work."

**(screen)** the test file, green.

---

## 2:05 – 2:15 · Close

**[SAY]** *(back to camera, level)*
> "A hundred and thirty-eight listings, read live, no search while you're talking.
> It finds the same flat listed twice, and it tells you when it isn't sure.
>
> Nothing here is a mock-up. Those are today's prices."

**(END)**

---

## Delivery notes

- **Underplay everything.** The material is inherently damning; selling it makes it sound fake.
  Read the 24,000 line like you're reading a train time.
- **The two-second pause after "who picks up the phone" is the most valuable silence in the
  video.** Do not fill it.
- **Never say "AI-powered", "leveraging", or "seamlessly".** Say what it did.
- **Say a real number in the first 20 seconds** and again in the last 10.
- Record in **one take if you can**. Small stumbles read as live; polish reads as canned.
- **Wear headphones.** Laptop mic + laptop speakers will cause the agent to interrupt itself.

## Failure protocol

| If this breaks | Do this |
|---|---|
| Agent mishears a question | Keep rolling, rephrase once. Recovering on camera looks confident. |
| A query returns nothing | "Nothing in that community — try Marina." Then ask the working one. |
| Change feed is empty | Cut the 1:32 beat. Don't fake it. |
| Voice cuts out entirely | You still have the table on screen — narrate it and re-ask. |
| Everything fails | Ship the 0:34–1:08 duplicate reveal alone. That single beat carries the submission. |

## What you're deliberately NOT claiming

Do not say it detects fraud, that agents are lying, or that permits are being misused. You cannot
prove intent from this data and a judge may know the market better than you. The honest, stronger
claim is: **the same apartment appears at different prices, and nothing on the site tells you.**
Stay there.

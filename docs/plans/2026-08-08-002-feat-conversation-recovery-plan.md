---
title: Conversation Recovery - Plan
type: feat
date: 2026-08-08
topic: transcript-scroll-panel-staleness
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
---

# Conversation Recovery - Plan

Follow-up to `2026-08-08-001-feat-second-opinion-plan.md`. That plan shipped the product. This one
closes three gaps found by walking the screen as a non-technical renter would. Requirement and
decision numbering continues from it (R21, KTD7 were the last).

**Revised against the tree at `3c3f726`**, after the marketing landing page landed. What that moved:
the product page is `app/app/page.tsx`, not `app/page.tsx`; `app/globals.css` split into
`app/base.css`, `app/product.css` and `app/marketing.css`, and the palette tokens now hang off
`.product` rather than `:root`; the test baseline is 46, not 39; the demo lives at `/app`, since `/`
is now the front door. `components/VoiceWidget.tsx` and `components/ListingsTable.tsx` were not
touched by that commit, so every approach below still applies as written. `lib/waitlist.ts` also
established that a tested pure module may sit at the `lib/` root, which settles where
`lib/transcript.ts` belongs.

## Goal Capsule

**Objective.** Make the screen recoverable. Today a renter who mishears a number, looks away, or
changes the subject has no way back: there is no record of what was said, the rows the agent is
talking about may be scrolled out of sight, and the duplicate panel keeps showing an apartment from
a question two turns ago.

**Product authority.** This plan owns the voice surface and the listings screen. It does not touch
normalisation, trust classification, the duplicate algorithm, the agent prompt, or the context.dev
integration.

**Non-goals.** No transcript export, no search over the transcript, no persistence across reloads,
no editing or replay of audio. No change to what the agent says.

---

## Requirements

**R22 — The conversation leaves a readable record.** Every finalised turn, the renter's and the
agent's, appears as text on screen while the session is live and stays there after it ends. The
agent's uncertain passages are visually distinct from its certain ones, using the amber already
established for untrusted data.

**R23 — The listings the agent is talking about are visible without scrolling.** When a tool call
highlights rows, the first highlighted row is brought into view inside the listings box. The page
itself does not scroll — the duplicate comparison panel must never be pushed off screen by this.

**R24 — The duplicate panel never outlives its subject.** The comparison panel is shown only while
the apartment it describes is part of the results currently on screen. Asking about a different
area, price ceiling, or bedroom count clears it.

## Key Technical Decisions

**KTD8 — The transcript is a captions rail in a fixed bottom dock, and `page.tsx` owns its state.**

The rail sits directly above the Talk button, capped in height, auto-scrolled to the newest line.
Rejected: a side column (narrows the table to ~700px, the biggest layout change of the three for
the least demo value) and an in-flow panel below the table (below the fold during the demo, so it
does nothing for a screen recording). The captions rail doubles as subtitles, which makes the
submission video watchable with the sound off.

State lives in `page.tsx` alongside `highlightIds` and `group`, and `VoiceWidget` pushes into it
through callbacks — the same shape as `onHighlight` and `onShowGroup`. That keeps the one existing
pattern intact and lets the page adjust its own bottom padding when the rail appears, rather than
having a child component reach up into the layout.

Both surfaces become one fixed `.dock` element containing the rail and the button row, so the rail
cannot drift out of alignment with the bar if either changes height.

**KTD9 — The certainty tags are parsed defensively, and their absence degrades to plain text.**

The prompt requires every word the agent says to be wrapped in `<sure>` or `<unsure>`
(`agent/second-opinion.json`, "SPEAKING WITH TWO VOICES"). Whether those tags survive to the client
in the `agent_response` event, or are stripped server-side before the transcript is emitted, is
**not established** — the ElevenLabs types say only `{ message: string; source: "user" | "ai" }`
(`@elevenlabs/types/dist/src/types.d.ts:36`). Step 1 of U7 is to look, and the parser is written so
that text with no tags yields a single certain segment. If the tags are stripped, the transcript
still works and only loses its amber styling; nothing has to be rewritten.

**KTD10 — Row scrolling is computed against the listings container, never `scrollIntoView`.**

`Element.scrollIntoView` walks every scrollable ancestor, including the document. On a short viewport
that would scroll the duplicate comparison panel — the hero shot — off the top of the screen at the
exact moment the agent starts describing it. Instead the offset is computed from bounding rects and
applied to the `.scroll` container alone, with the sticky table header's height subtracted so the
target row does not land underneath it.

**KTD11 — Staleness is decided by whether the group is still in the result set, not by a timer or a
blanket clear on every search.**

`searchListings` clearing the panel unconditionally is the simpler rule, but it fights the agent's
own behaviour: `searchListings` already returns `duplicateGroupsInTheseResults` and the prompt has
the agent volunteer them, so a panel that vanishes as the agent says "and one of these is listed
twice" is worse than a stale one. The rule that matches the renter's mental model is: the panel
shows a group only while that group's listings are among the results on screen. That is one pure
predicate, testable, and it makes "different area" and "tighter price ceiling" both clear the panel
for the same reason.

---

## Implementation Units

### U7. Transcript

- **Requirements.** R22. KTD8, KTD9.
- **Dependencies.** None.
- **Files.** `lib/transcript.ts` (new), `lib/transcript.test.ts` (new),
  `components/Transcript.tsx` (new), `components/VoiceWidget.tsx`, `app/app/page.tsx`,
  `app/product.css`. *(Paths corrected after the marketing page landed: the product moved from
  `app/page.tsx` to `app/app/page.tsx`, and `app/globals.css` split into `app/base.css`,
  `app/product.css` and `app/marketing.css`.)*
- **Approach.**
  1. **Look before building.** Add a temporary `onMessage` that logs the raw payload, run
     `npm run dev`, speak one question, and record in the commit message whether `<sure>` /
     `<unsure>` reach the client. Everything below works either way; this only determines whether
     the amber styling has anything to key on.
  2. `lib/transcript.ts` exports `TranscriptSegment { text: string; certain: boolean }`,
     `TranscriptEntry { id: number; source: "user" | "ai"; segments: TranscriptSegment[] }`, and a
     pure `parseSegments(text: string): TranscriptSegment[]`. Text outside any tag is certain.
     Whitespace-only segments are dropped. Nothing throws on malformed input.
  3. `components/Transcript.tsx` renders the entries: a `You` / `Second Opinion` label per entry,
     uncertain segments in `var(--warn)`. A `useEffect` on the entry count scrolls the rail to the
     bottom. Returns `null` when there are no entries, so the dock is just the button row before a
     session starts.
  4. `VoiceWidget` gains `onTranscript(entry)` and `onResetTranscript()`. Its `onMessage` handler
     builds an entry with `parseSegments`; `start()` calls `onResetTranscript()` so each session
     begins clean. `stop()` deliberately does **not** clear it — reading back what was said after
     hanging up is the point.
  5. `page.tsx` holds `transcript: TranscriptEntry[]`, wraps `<Transcript>` and `<VoiceWidget>` in a
     single `<div className="dock">`, and adds `with-transcript` to `.shell` when the transcript is
     non-empty.
  6. CSS: `.dock` fixed to the bottom, full width, same 1180px inner column as the rest.
     `.transcript` capped at `min(30vh, 220px)` with `overflow-y: auto`. `.shell.with-transcript`
     gets enough bottom padding to clear the taller dock, and `.scroll` caps at
     `min(60vh, calc(100vh - 460px))` so the last table rows are never hidden under the rail.
- **Test scenarios** (`lib/transcript.test.ts`, pure, no network):
  - Untagged text yields one certain segment — the fallback path if the tags are stripped.
  - `<sure>A</sure><unsure>B</unsure>` yields two segments with the right certainty.
  - Text before the first tag is certain.
  - A tag left unclosed runs to the end of the string rather than being dropped.
  - A stray closing tag with no opener is ignored, not rendered as text.
  - Whitespace-only segments are dropped, so no empty lines appear in the rail.
  - Tags are matched case-insensitively.
  - The empty string yields no segments.
- **Verification.** Speak two questions. Both appear, the agent's hedged clause is amber, the rail
  scrolls itself, the table's last row is still reachable, and the text survives clicking
  "End conversation".

### U8. Highlighted rows scroll into view

- **Requirements.** R23. KTD10.
- **Dependencies.** None. Can land before or after U7.
- **Files.** `components/ListingsTable.tsx`.
- **Approach.**
  1. Add a `useRef` on the `.scroll` div.
  2. `useEffect` keyed on `highlightIds.join(",")` — the array identity changes on every tool call,
     so the joined ids are what actually says whether the target moved.
  3. No-op when the list is empty, so ending a session does not jerk the table back to the top.
  4. Find `tr.highlight` in the container, compute
     `row.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop`,
     subtract the sticky header height plus a few pixels of breathing room, clamp at 0, and call
     `container.scrollTo({ top, behavior })`.
  5. `behavior` is `"auto"` when `matchMedia("(prefers-reduced-motion: reduce)")` matches, else
     `"smooth"`.
- **Test scenarios.** None — this is DOM behaviour in an untested layer, consistent with the
  existing convention that components carry no unit tests. Verified by hand below.
- **Verification.** Ask about a community whose first match sits well down the table. The row
  scrolls under the header and the duplicate panel stays put at the top of the page.

### U9. The duplicate panel clears on a change of subject

- **Requirements.** R24. KTD11.
- **Dependencies.** None.
- **Files.** `lib/listings/duplicates.ts`, `lib/listings/duplicates.test.ts`,
  `components/VoiceWidget.tsx`, `app/app/page.tsx`.
- **Approach.**
  1. Add `groupIsInResults(group: DuplicateGroup, results: Listing[]): boolean` to `duplicates.ts` —
     true when every listing in the group is present by id in `results`. Every, not some: if a price
     ceiling has excluded the dearer of the two, the comparison the panel is making no longer holds.
  2. In `VoiceWidget`'s `searchListings` client tool, after computing `matches`, clear the panel
     unless the group on screen is still in them. This needs the current group, so `VoiceWidget`
     takes a `group: DuplicateGroup | null` prop, held in a ref alongside `listingsRef` for the same
     reason — the tool closure must see the current value, not the one captured at session start.
  3. `findDuplicates` is unchanged; it already sets `null` when it finds nothing.
- **Test scenarios** (added to `duplicates.test.ts`):
  - A group whose listings are all present returns true.
  - A group with one listing missing from the results returns false.
  - A group against an empty result set returns false.
  - Matching is by id, so two listings with identical fields but different ids do not count.
- **Verification.** Ask for duplicates in Marina, then ask what is in JLT. The panel goes. Ask for
  duplicates in Marina, then ask about Marina again with no filter — the panel stays.

---

## Sequencing

U8 and U9 are independent and small; U7 is the bulk of the work. Land U8 and U9 first so the screen
is correct before the layout changes underneath it, then U7.

## Verification Contract

- `npm test` — the existing 46 tests plus the new transcript and `groupIsInResults` tests, all green.
- `npm run build` — production build passes.
- `npm run eval` — unchanged and still passing. Agent conduct is untouched by this plan; client
  tools do not execute in simulation, so none of this is exercised there either way.
- The landing page at `/` must be unaffected: nothing in this plan may add weight to `/`, and the
  `.marketing` / `.product` stylesheet split stays intact.
- By hand at `localhost:3000/app`, in one session: ask about an area, watch the rows scroll and the
  transcript fill; ask for duplicates, watch the panel appear; ask about a different area, watch it
  go; end the conversation and confirm the transcript is still readable.

## Definition of Done

- All three verifications above pass.
- `README.md` and `TECH-SPEC.md` describe the screen as it now is, including the transcript.
- `docs/ideation/demo-script.md` reflects the new surface — the transcript is worth a sentence in
  the spoken demo, since it is what makes the recording legible without audio.
- `CLAUDE.md` notes `lib/transcript.ts` as a tested pure module and carries the new test count. The
  current wording says all judged logic lives under `lib/listings/`; that is no longer the whole
  picture.

## Open Questions

- ~~**Do `<sure>` / `<unsure>` reach the client?**~~ **Resolved: yes, verbatim.** Checked against the
  stored conversation record rather than by guessing — `conv_7501kzg9tr7ne699j4xj2tp3j2jk` carries
  `<sure>There are three one-bedroom apartments in Downtown…</sure><unsure>One of them, in 29
  Boulevard 1, doesn't say when it was posted…</unsure>`. The amber styling has something to key on.
  The same record turned up something the plan had not anticipated: a turn spent calling a tool
  arrives as an agent message with no text. Those are dropped rather than rendered as an empty
  caption line.
- **Should the rail be collapsible?** Deferred. If it proves to crowd a 13" laptop during the demo,
  a collapse toggle is a small addition; adding it before the layout has been seen on the demo
  machine is guesswork.

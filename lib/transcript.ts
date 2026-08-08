/**
 * Turning what the agent said into something readable on screen.
 *
 * The agent speaks in two voices. Its prompt requires every word to sit inside
 * either `<sure>` or `<unsure>` (see `agent/second-opinion.json`), and the
 * hedge is the product's whole argument: a listing missing a fact gets said in
 * a different voice by a different speaker.
 *
 * That distinction is audible, which is enough in a quiet room and nothing at
 * all in a loud one, on muted speakers, or in a screen recording. Parsing the
 * tags out lets the transcript carry the same signal in the amber already used
 * for untrusted rows.
 *
 * ## Why this is written to survive the tags not being there
 *
 * Whether the markup reaches the browser or is stripped server-side before the
 * transcript event is emitted is a property of ElevenLabs, not of this repo —
 * the SDK types promise only `{ message: string; source }`. So untagged text is
 * not an error case: it yields one certain segment, and the transcript still
 * works, just without the colour. Nothing here throws on malformed input, for
 * the same reason — a mangled tag should cost the renter a shade of amber, not
 * the sentence.
 */

export interface TranscriptSegment {
  text: string;
  /** False for anything the agent said in its uncertain voice. */
  certain: boolean;
}

export interface TranscriptEntry {
  id: number;
  source: "user" | "ai";
  segments: TranscriptSegment[];
}

/** `<sure>`, `</unsure>`, and anything else in that family. */
const TAG = /<\s*(\/?)\s*(sure|unsure)\s*>/gi;

/**
 * Split one utterance into its certain and uncertain runs.
 *
 * Text outside any tag counts as certain — that covers both the agent slipping
 * a word in before its first tag and the case where the markup never arrives.
 * An unclosed tag runs to the end rather than swallowing the sentence, and a
 * closing tag with no opener is dropped rather than rendered as literal text.
 */
export function parseSegments(text: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  let certain = true;
  let cursor = 0;

  const push = (raw: string) => {
    const trimmed = raw.trim();
    // Whitespace between two tags is not a line of transcript.
    if (trimmed) segments.push({ text: trimmed, certain });
  };

  TAG.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TAG.exec(text)) !== null) {
    push(text.slice(cursor, match.index));
    cursor = match.index + match[0].length;
    const closing = match[1] === "/";
    certain = closing ? true : match[2].toLowerCase() === "sure";
  }
  push(text.slice(cursor));

  return segments;
}

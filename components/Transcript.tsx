"use client";

import { useEffect, useRef } from "react";

import type { TranscriptEntry } from "@/lib/transcript";

/**
 * What was said, as captions above the Talk button.
 *
 * Voice has no scrollback. A renter who mishears a rent figure, looks away, or
 * has the volume down has no way back to it — and the agent's most careful
 * work, naming the fact a listing is missing, is exactly the part that a noisy
 * room eats. This is that record (plan R22).
 *
 * It reads as subtitles on purpose: the demo is watched as a recording more
 * often than it is spoken to, and captions are what make a recording legible
 * with the sound off.
 */
export function Transcript({ entries }: { entries: TranscriptEntry[] }) {
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    // Pinned to the newest line. The rail is short, so anything else means the
    // renter watches the reply arrive off-screen.
    rail.scrollTop = rail.scrollHeight;
  }, [entries.length]);

  // Before a session starts there is nothing to say, and the dock is just the
  // button row it has always been.
  if (entries.length === 0) return null;

  return (
    <div
      className="transcript"
      ref={railRef}
      aria-live="polite"
      aria-label="What has been said"
    >
      {entries.map((entry) => (
        <p key={entry.id} className={`line ${entry.source}`}>
          <span className="who">
            {entry.source === "user" ? "You" : "Second Opinion"}
          </span>
          <span className="said">
            {entry.segments.map((segment, i) => (
              // The uncertain voice, in the amber that already means "this data
              // is thin" on the rows above (R10).
              <span key={i} className={segment.certain ? undefined : "hedge"}>
                {segment.text}{" "}
              </span>
            ))}
          </span>
        </p>
      ))}
    </div>
  );
}

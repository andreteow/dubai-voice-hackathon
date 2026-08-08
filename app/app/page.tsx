"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { DuplicateComparison } from "@/components/DuplicateComparison";
import { ListingsTable } from "@/components/ListingsTable";
import { Transcript } from "@/components/Transcript";
import { VoiceWidget } from "@/components/VoiceWidget";
import type { DuplicateGroup, ListingsPayload } from "@/lib/listings/types";
import type { TranscriptEntry } from "@/lib/transcript";

/**
 * The single screen.
 *
 * Listings are read once on mount and held here (plan R1). Everything the agent
 * answers comes from this array, so a voice turn never touches the network.
 */
export default function Home() {
  const [payload, setPayload] = useState<ListingsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [highlightIds, setHighlightIds] = useState<string[]>([]);
  const [group, setGroup] = useState<DuplicateGroup | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

  // Stable across renders, so the conversation SDK cannot end up holding the
  // version of these that existed when the socket opened.
  const appendTranscript = useCallback(
    (entry: TranscriptEntry) => setTranscript((prev) => [...prev, entry]),
    [],
  );
  const resetTranscript = useCallback(() => setTranscript([]), []);

  const read = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/listings");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setPayload(body as ListingsPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read listings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void read();
  }, [read]);

  const listings = payload?.listings ?? [];
  const readAtLabel = payload
    ? new Date(payload.readAt).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <main className={transcript.length > 0 ? "shell with-transcript" : "shell"}>
      <Link href="/" className="backlink">
        ← Back to Second Opinion
      </Link>
      <div className="masthead">
        <h1>Second Opinion</h1>
      </div>
      <p className="tagline">
        The same apartment, listed twice, at two prices — and nothing on the site
        tells you.
      </p>

      {error && (
        <div className="error">
          <strong>Could not read listings.</strong> {error}
        </div>
      )}

      <div className="statbar">
        <div>
          <span className="stat-label">Listings</span>
          <span className="stat-value">
            {loading ? "…" : listings.length.toLocaleString()}
          </span>
        </div>
        <div>
          <span className="stat-label">Read at</span>
          <span className="stat-value">{readAtLabel}</span>
        </div>
        <div>
          <span className="stat-label">Communities</span>
          <span className="stat-value">
            {loading
              ? "…"
              : new Set(listings.map((l) => l.community).filter(Boolean)).size}
          </span>
        </div>
        <button className="reread" onClick={() => void read()} disabled={loading}>
          {loading ? "Reading…" : "Read again"}
        </button>
      </div>

      <DuplicateComparison group={group} />

      <ListingsTable listings={listings} highlightIds={highlightIds} />

      {/* One fixed element, so the captions cannot drift out of alignment with
          the button row if either changes height. */}
      <div className="dock">
        <Transcript entries={transcript} />
        <VoiceWidget
          listings={listings}
          group={group}
          onHighlight={setHighlightIds}
          onShowGroup={setGroup}
          onTranscript={appendTranscript}
          onResetTranscript={resetTranscript}
        />
      </div>
    </main>
  );
}

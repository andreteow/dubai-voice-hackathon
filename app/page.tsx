"use client";

import { useCallback, useEffect, useState } from "react";

import { ListingsTable } from "@/components/ListingsTable";
import type { ListingsPayload } from "@/lib/listings/types";

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
    <main className="shell">
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

      <ListingsTable listings={listings} />
    </main>
  );
}

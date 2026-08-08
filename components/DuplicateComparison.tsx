"use client";

import { classifyTrust, trustPhrases } from "@/lib/listings/trust";
import type { DuplicateGroup } from "@/lib/listings/types";

/**
 * The hero shot: one apartment, several listings, side by side.
 *
 * The shared attributes sit once at the top — that is the argument that these
 * are the same flat. The prices sit in a row underneath, which is what makes
 * the gap land without anyone having to explain it.
 */
export function DuplicateComparison({ group }: { group: DuplicateGroup | null }) {
  if (!group) return null;

  return (
    <section className="dupe">
      <header className="dupe-head">
        <div>
          <span className="dupe-eyebrow">
            {group.confidence === "exact"
              ? "The same apartment"
              : "Probably the same apartment"}
            {group.sameAgency && " · listed twice by one agency"}
          </span>
          <h2>{group.building}</h2>
          <p className="dupe-attrs">
            {group.bedrooms === 0 ? "Studio" : `${group.bedrooms} bedroom`} ·{" "}
            {group.sizeSqft.toLocaleString()} sqft ·{" "}
            {group.listings[0].community ?? "Dubai"}
          </p>
        </div>
        <div className="dupe-spread">
          <span className="stat-label">Difference</span>
          <span className="dupe-spread-value">
            AED {group.spreadAed.toLocaleString()}
          </span>
          <span className="dupe-sig">
            {group.significance === "material"
              ? "worth knowing about"
              : "a small difference"}
          </span>
        </div>
      </header>

      <div className="dupe-cards">
        {group.listings.map((listing) => {
          const verdict = classifyTrust(listing);
          const cheapest = listing.priceAed === group.cheapestAed;
          return (
            <article
              key={listing.id}
              className={`dupe-card${cheapest ? " cheapest" : ""}`}
            >
              <div className="dupe-price">
                AED {(listing.priceAed ?? 0).toLocaleString()}
              </div>
              <div className="dupe-agency">{listing.agency ?? "No agency named"}</div>
              <div className="dupe-meta">
                {listing.sizeSqft?.toLocaleString()} sqft
                {listing.listedRelative ? ` · ${listing.listedRelative}` : ""}
              </div>
              {!verdict.trusted && (
                <div className="dupe-warn">
                  This listing {trustPhrases(verdict).join(", and ")}.
                </div>
              )}
              {listing.sourceUrl && (
                <a
                  className="dupe-link"
                  href={listing.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Check it yourself →
                </a>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

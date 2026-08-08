"use client";

import { classifyTrust, trustPhrases } from "@/lib/listings/trust";
import type { Listing } from "@/lib/listings/types";

export function ListingsTable({
  listings,
  highlightIds = [],
}: {
  listings: Listing[];
  /** Listing ids the agent is currently talking about (plan R19). */
  highlightIds?: string[];
}) {
  const highlighted = new Set(highlightIds);

  return (
    <div className="scroll">
      <table className="listings">
        <thead>
          <tr>
            <th>Building</th>
            <th>Community</th>
            <th>Beds</th>
            <th>Size</th>
            <th>Rent / year</th>
            <th>Agency</th>
            <th>Listed</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          {listings.map((listing) => {
            // Marked on screen as well as spoken, so the signal survives muted
            // playback (R10).
            const verdict = classifyTrust(listing);
            const rowClasses = [
              highlighted.has(listing.id) ? "highlight" : "",
              verdict.trusted ? "" : "untrusted",
            ]
              .filter(Boolean)
              .join(" ");

            return (
            <tr
              key={listing.id}
              className={rowClasses || undefined}
              title={
                verdict.trusted
                  ? undefined
                  : `This listing ${trustPhrases(verdict).join(", and ")}.`
              }
            >
              <td>{listing.building ?? "—"}</td>
              <td>{listing.community ?? "—"}</td>
              <td className="num">
                {listing.bedrooms === null
                  ? "—"
                  : listing.bedrooms === 0
                    ? "Studio"
                    : listing.bedrooms}
              </td>
              <td className="num">
                {listing.sizeSqft === null
                  ? "—"
                  : `${listing.sizeSqft.toLocaleString()} sqft`}
              </td>
              <td className="num">
                {listing.priceAed === null
                  ? "—"
                  : `AED ${listing.priceAed.toLocaleString()}`}
              </td>
              <td>
                {listing.agency ?? <span className="flag">no agency</span>}
              </td>
              <td>
                {listing.listedRelative ?? <span className="flag">no date</span>}
              </td>
              <td>
                {listing.sourceUrl ? (
                  <a href={listing.sourceUrl} target="_blank" rel="noreferrer">
                    view
                  </a>
                ) : (
                  "—"
                )}
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

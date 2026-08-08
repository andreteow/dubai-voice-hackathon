"use client";

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
          {listings.map((listing) => (
            <tr
              key={listing.id}
              className={highlighted.has(listing.id) ? "highlight" : undefined}
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
              <td>{listing.agency ?? "—"}</td>
              <td>{listing.listedRelative ?? "—"}</td>
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
          ))}
        </tbody>
      </table>
    </div>
  );
}

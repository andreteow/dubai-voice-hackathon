"use client";

import { useEffect, useRef } from "react";

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
  const scrollRef = useRef<HTMLDivElement>(null);

  // The array is rebuilt on every tool call, so its identity says nothing about
  // whether the target moved. The ids do.
  const highlightKey = highlightIds.join(",");

  useEffect(() => {
    // Empty means the session just ended. Leave the table where the renter left
    // it rather than yanking it back to the top.
    if (!highlightKey) return;

    const container = scrollRef.current;
    const row = container?.querySelector<HTMLTableRowElement>("tr.highlight");
    if (!container || !row) return;

    // Deliberately not scrollIntoView: that walks every scrollable ancestor
    // including the document, which on a short viewport would push the
    // duplicate comparison panel off the top of the screen at the exact moment
    // the agent starts describing it (plan KTD10). Scroll this box only.
    const headerHeight =
      container.querySelector("thead")?.getBoundingClientRect().height ?? 0;
    const top =
      row.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop -
      headerHeight -
      8;

    container.scrollTo({
      top: Math.max(0, top),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, [highlightKey]);

  return (
    <div className="scroll" ref={scrollRef}>
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

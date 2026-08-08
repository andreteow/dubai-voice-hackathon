"use client";

import { useEffect, useRef, useState } from "react";

import { comparablesFor } from "@/lib/listings/comparables";
import { classifySpread } from "@/lib/listings/duplicates";
import { classifyTrust, trustPhrases } from "@/lib/listings/trust";
import type { Listing, ListingDetailPayload } from "@/lib/listings/types";

/**
 * A price difference is only worth colouring in when it is worth acting on.
 *
 * The same rule the comparison panel uses (`MATERIAL_SPREAD_AED`): below it, a
 * gap is negotiating noise. Without this the panel renders a one-dirham
 * difference as a green saving, which is both absurd and the fastest way to
 * make a renter stop believing the numbers that matter.
 */
function isWorthNoting(deltaAed: number): boolean {
  return classifySpread(Math.abs(deltaAed)) === "material";
}

function deltaClass(deltaAed: number): string {
  if (deltaAed === 0 || !isWorthNoting(deltaAed)) return "sheet-delta";
  return deltaAed < 0 ? "sheet-delta cheaper" : "sheet-delta dearer";
}

/**
 * One listing, opened.
 *
 * ## It opens instantly and finishes filling later
 *
 * Everything load-bearing — the specs, what the listing does not say, the same
 * flat somewhere cheaper, what similar flats are asking — is computed here from
 * the array already in memory, so the panel is complete the moment it appears.
 * The photos and the agent's prose come from a stored page over the network and
 * arrive a second or two later, into a skeleton. Nothing waits on them, least
 * of all a voice turn (plan KTD1).
 *
 * ## The order of the panel is an argument
 *
 * A rental portal leads with the pictures, because pictures sell. This leads
 * with the price against other prices, and puts the same flat advertised
 * elsewhere above the similar ones — because if that band has anything in it,
 * it is the most useful thing on the screen. The gallery sits below the numbers
 * it cannot change.
 */
export function ListingDetail({
  listing,
  listings,
  onClose,
}: {
  /** The listing to open, or null when nothing is open. */
  listing: Listing | null;
  /** Everything on screen, for the comparison. */
  listings: Listing[];
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<ListingDetailPayload | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const id = listing?.id ?? null;

  useEffect(() => {
    if (!id) {
      setDetail(null);
      return;
    }

    // A slow snapshot for a listing the renter has already closed must not
    // paint itself over the one they opened next.
    let current = true;
    setDetail(null);
    setLoadingDetail(true);

    void (async () => {
      try {
        const res = await fetch(`/api/listings/${encodeURIComponent(id)}/detail`);
        const body = (await res.json()) as ListingDetailPayload;
        if (current) setDetail(body);
      } catch {
        // The route already degrades to an empty payload; this catches the
        // network dropping under it. Either way the panel just loses its
        // gallery.
        if (current) setDetail(null);
      } finally {
        if (current) setLoadingDetail(false);
      }
    })();

    return () => {
      current = false;
    };
  }, [id]);

  // Escape closes it, and focus starts on the close button — this opens by
  // voice as often as by click, and a panel you cannot dismiss from the
  // keyboard is a panel you have to reach for the mouse to escape mid-sentence.
  useEffect(() => {
    if (!id) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [id, onClose]);

  if (!listing) return null;

  const verdict = classifyTrust(listing);
  const report = comparablesFor(listing, listings);

  // Only the cheapest one, and only if the gap is big enough to be a reason to
  // pick up the phone.
  const cheapestElsewhere = report.sameApartment[0];
  const savingAed =
    cheapestElsewhere && cheapestElsewhere.priceAed !== null && listing.priceAed !== null
      ? listing.priceAed - cheapestElsewhere.priceAed
      : 0;

  return (
    <div
      className="sheet-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`${listing.building ?? "Listing"} — full detail`}
      >
        <header className="sheet-head">
          <div>
            <span className="sheet-eyebrow">
              {listing.community ?? "Dubai"}
              {detail?.reference ? ` · ${detail.reference}` : ""}
            </span>
            <h2>{listing.building ?? "Unnamed building"}</h2>
            <p className="sheet-attrs">
              {listing.bedrooms === null
                ? "Bedrooms not stated"
                : listing.bedrooms === 0
                  ? "Studio"
                  : `${listing.bedrooms} bedroom`}
              {detail?.bathrooms ? ` · ${detail.bathrooms} bath` : ""}
              {listing.sizeSqft
                ? ` · ${listing.sizeSqft.toLocaleString()} sqft`
                : ""}
              {listing.furnishing ? ` · ${listing.furnishing}` : ""}
            </p>
          </div>
          <div className="sheet-price-block">
            <span className="stat-label">Asking</span>
            <span className="sheet-price">
              {listing.priceAed === null
                ? "Not stated"
                : `AED ${listing.priceAed.toLocaleString()}`}
            </span>
            <span className="sheet-price-note">
              {listing.agency ?? "No agency named"}
            </span>
          </div>
          <button
            className="sheet-close"
            onClick={onClose}
            ref={closeRef}
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        {/* What the listing does not say, in the amber it means everywhere else. */}
        {!verdict.trusted && (
          <p className="sheet-warn">
            This listing {trustPhrases(verdict).join(", and ")}.
          </p>
        )}

        {/*
          The headline finding, when there is one. Above the gallery on purpose:
          a renter who scrolls no further has still been told the thing that
          could save them money.
        */}
        {report.sameApartment.length > 0 && (
          <section className="sheet-band same">
            <h3>
              {report.sameApartment.length === 1
                ? "This same apartment is advertised somewhere else"
                : `This same apartment is advertised ${report.sameApartment.length} more times`}
            </h3>
            <div className="sheet-rows">
              {report.sameApartment.map((other) => {
                const delta = (other.priceAed ?? 0) - (listing.priceAed ?? 0);
                return (
                  <article key={other.id} className="sheet-row">
                    <span className="sheet-row-price">
                      AED {(other.priceAed ?? 0).toLocaleString()}
                    </span>
                    <span className="sheet-row-who">
                      {other.agency ?? "No agency named"}
                    </span>
                    <span className={deltaClass(delta)}>
                      {delta === 0
                        ? "same price"
                        : `${delta < 0 ? "−" : "+"}${Math.abs(delta).toLocaleString()}`}
                    </span>
                    <span className="sheet-row-meta">
                      {other.sizeSqft?.toLocaleString()} sqft
                      {other.sizeSqft !== listing.sizeSqft
                        ? " · probably the same flat, sizes differ slightly"
                        : ""}
                    </span>
                    {other.sourceUrl && (
                      <a href={other.sourceUrl} target="_blank" rel="noreferrer">
                        Check it →
                      </a>
                    )}
                  </article>
                );
              })}
            </div>
            {savingAed > 0 && isWorthNoting(savingAed) && (
              <p className="sheet-band-note">
                The cheapest advert for this apartment is AED{" "}
                {savingAed.toLocaleString()} below the one you are looking at.
              </p>
            )}
            {/*
              Said out loud rather than left as a green number the renter has to
              interpret. Two adverts a few hundred dirhams apart is still the
              finding — the flat is listed twice — but the gap is not the part
              worth acting on, and colouring it as a saving would say it was.
            */}
            {savingAed !== 0 && !isWorthNoting(savingAed) && (
              <p className="sheet-band-note ordinary">
                The prices are within AED {Math.abs(savingAed).toLocaleString()} of
                each other — a small difference. That it is listed twice is the
                part worth knowing.
              </p>
            )}
          </section>
        )}

        <section className="sheet-band">
          <h3>
            Similar flats nearby
            {report.priceRank !== null && (
              <span className="sheet-rank">
                {" "}
                · this one is {ordinal(report.priceRank)} cheapest of{" "}
                {report.rankedOf}
                {report.medianAed !== null &&
                  `, median AED ${report.medianAed.toLocaleString()}`}
              </span>
            )}
          </h3>

          {report.comparables.length === 0 ? (
            <p className="sheet-empty">
              Nothing else in {listing.community ?? "this area"} matches this
              closely enough to price it against — same bedrooms, within a tenth
              of the size.
            </p>
          ) : (
            <div className="sheet-rows">
              {report.comparables.map(({ listing: other, deltaAed }) => {
                const otherVerdict = classifyTrust(other);
                return (
                  <article key={other.id} className="sheet-row">
                    <span className="sheet-row-price">
                      AED {(other.priceAed ?? 0).toLocaleString()}
                    </span>
                    <span className="sheet-row-who">
                      {other.building ?? "Unnamed"} ·{" "}
                      {other.agency ?? "no agency"}
                    </span>
                    <span className={deltaClass(deltaAed)}>
                      {deltaAed === 0
                        ? "same price"
                        : `${deltaAed < 0 ? "−" : "+"}${Math.abs(deltaAed).toLocaleString()}`}
                    </span>
                    <span className="sheet-row-meta">
                      {other.sizeSqft?.toLocaleString()} sqft
                      {!otherVerdict.trusted &&
                        ` · ${trustPhrases(otherVerdict).join(", ")}`}
                    </span>
                    {other.sourceUrl && (
                      <a href={other.sourceUrl} target="_blank" rel="noreferrer">
                        Check it →
                      </a>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="sheet-band">
          <h3>
            Photos
            {detail && !detail.unavailable && detail.photos.length > 0 && (
              <span className="sheet-rank"> · {detail.photos.length} from the advert</span>
            )}
          </h3>

          {loadingDetail && (
            <div className="sheet-gallery" aria-busy="true">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="sheet-shot skeleton" />
              ))}
            </div>
          )}

          {!loadingDetail && detail && detail.photos.length > 0 && (
            <>
              <div className="sheet-gallery">
                {detail.photos.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={src}
                    className="sheet-shot"
                    src={src}
                    alt={`Photo ${i + 1} of ${listing.building ?? "the apartment"}, supplied by the advertiser`}
                    loading={i < 4 ? "eager" : "lazy"}
                  />
                ))}
              </div>
              {/*
                The one thing a photo cannot tell you. These are the agency's
                own pictures, taken from the page as it was last read — not
                evidence that the flat looks like this, or that they are even of
                this unit. Saying so is the same discipline as hedging out loud
                (R8): name the limit, do not imply a motive (R13).
              */}
              <p className="sheet-photo-note">
                Supplied by the advertiser, from the page as it was last read.
                Nothing here confirms they are photographs of this unit.
              </p>
            </>
          )}

          {!loadingDetail && (!detail || detail.unavailable || detail.photos.length === 0) && (
            <p className="sheet-empty">
              No photos could be read from this advert.
            </p>
          )}
        </section>

        {detail?.description && (
          <section className="sheet-band">
            <h3>What the agent wrote</h3>
            {detail.headline && <p className="sheet-headline">{detail.headline}</p>}
            <p className="sheet-description">{detail.description}</p>
            {detail.amenities.length > 0 && (
              <ul className="sheet-amenities">
                {detail.amenities.map((amenity) => (
                  <li key={amenity}>{amenity}</li>
                ))}
              </ul>
            )}
          </section>
        )}

        <footer className="sheet-foot">
          <span>
            {listing.agent ? `Listed by ${listing.agent}` : "No agent named"}
            {listing.listedRelative ? ` · ${listing.listedRelative}` : ""}
          </span>
          {listing.sourceUrl && (
            <a href={listing.sourceUrl} target="_blank" rel="noreferrer">
              Open the original listing →
            </a>
          )}
        </footer>
      </section>
    </div>
  );
}

function ordinal(n: number): string {
  const suffix =
    n % 100 >= 11 && n % 100 <= 13
      ? "th"
      : ["th", "st", "nd", "rd"][n % 10] ?? "th";
  return `${n}${suffix}`;
}

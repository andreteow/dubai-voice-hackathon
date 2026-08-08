import { communityLabel, medianPrice } from "./answer";
import { isSameApartment } from "./duplicates";
import type { Listing } from "./types";

/**
 * What else the renter could have, for the price.
 *
 * A listing page shows you one number with nothing to judge it against, which
 * is why "is 165,000 a lot?" is unanswerable on Bayut. This puts the number in
 * a set: the same size, the same bedrooms, the same area, and what those are
 * asking.
 *
 * ## Two bands, never one list
 *
 * The panel separates *the same apartment advertised elsewhere* from *a similar
 * apartment*. They look alike in a table and mean completely different things:
 * one is a price you could hold an agent to, the other is a price you could
 * argue from. Merging them would take the product's whole finding — this flat
 * is listed twice — and bury it among near-misses.
 *
 * ## Why a percentage here and an absolute 3 sqft in `duplicates.ts`
 *
 * They answer different questions. Duplicate matching asks "is this the same
 * floor plan, rounded differently", and the answer is measured in feet: every
 * observed rounding artifact was within 3 sqft whatever the unit's size. This
 * asks "is this flat comparable", and the answer scales — 100 sqft is a
 * different flat at 600 sqft and a rounding error at 2,000. So the tolerance is
 * relative, and deliberately loose: too tight and a genuinely thin market
 * returns nothing at all, which tells the renter less than a rough set does.
 */

/** Sizes within this fraction of the subject are the same kind of flat. */
export const COMPARABLE_SIZE_TOLERANCE = 0.1;

/**
 * Enough to see a spread, few enough to read at a glance while someone is
 * talking to you. The panel is read mid-conversation, not studied.
 */
export const MAX_COMPARABLES = 6;

export interface Comparable {
  listing: Listing;
  /** Against the subject's rent. Negative is cheaper. */
  deltaAed: number;
}

export interface ComparablesReport {
  /**
   * Other adverts for what is probably this same physical flat, cheapest first.
   * Empty is the common case and not a failure.
   */
  sameApartment: Listing[];
  /** Different flats of the same kind, closest in size first. */
  comparables: Comparable[];
  /** The subject's position by rent among itself and its comparables. 1 is cheapest. */
  priceRank: number | null;
  /** How many listings that rank is out of, the subject included. */
  rankedOf: number;
  /** The middle rent of the subject and its comparables. */
  medianAed: number | null;
}

const EMPTY: ComparablesReport = {
  sameApartment: [],
  comparables: [],
  priceRank: null,
  rankedOf: 0,
  medianAed: null,
};

/** A listing can only be priced against others if it states what it is. */
function canBePriced(listing: Listing): boolean {
  return (
    listing.bedrooms !== null && listing.sizeSqft !== null && listing.priceAed !== null
  );
}

function isSimilarTo(subject: Listing, candidate: Listing): boolean {
  if (candidate.id === subject.id) return false;
  if (!canBePriced(candidate)) return false;
  if (candidate.bedrooms !== subject.bedrooms) return false;

  const area = communityLabel(subject.community);
  // Without an area on either side there is no basis for calling them
  // comparable — Marina and Downtown are not one market.
  if (area === null || communityLabel(candidate.community) !== area) return false;

  const subjectSize = subject.sizeSqft as number;
  return (
    Math.abs((candidate.sizeSqft as number) - subjectSize) <=
    subjectSize * COMPARABLE_SIZE_TOLERANCE
  );
}

/**
 * Build the comparison for one listing against everything else on screen.
 *
 * Pure, and cheap enough to run inside a voice turn: it is a couple of passes
 * over a few hundred objects, so the detail panel has its numbers before it
 * paints (plan KTD1 — nothing waits on the network).
 */
export function comparablesFor(
  subject: Listing,
  all: Listing[],
): ComparablesReport {
  if (!canBePriced(subject)) return EMPTY;

  const sameApartment = all
    .filter((other) => isSameApartment(subject, other))
    .sort((a, b) => (a.priceAed ?? 0) - (b.priceAed ?? 0));

  // A duplicate is this flat, not one like it. It has already been reported
  // above, and repeating it here would read as two options rather than one.
  const duplicateIds = new Set(sameApartment.map((l) => l.id));

  const comparables = all
    .filter((other) => !duplicateIds.has(other.id) && isSimilarTo(subject, other))
    .sort((a, b) => {
      const size = subject.sizeSqft as number;
      const byCloseness =
        Math.abs((a.sizeSqft as number) - size) -
        Math.abs((b.sizeSqft as number) - size);
      return byCloseness !== 0
        ? byCloseness
        : (a.priceAed as number) - (b.priceAed as number);
    })
    .slice(0, MAX_COMPARABLES)
    .map((listing) => ({
      listing,
      deltaAed: (listing.priceAed as number) - (subject.priceAed as number),
    }));

  // A rank out of one is not a rank — it would render as "1st of 1 cheapest",
  // which sounds like a finding and is nothing at all.
  if (comparables.length === 0) {
    return { ...EMPTY, sameApartment };
  }

  const priced = [subject, ...comparables.map((c) => c.listing)];
  const cheaper = comparables.filter(
    (c) => (c.listing.priceAed as number) < (subject.priceAed as number),
  ).length;

  return {
    sameApartment,
    comparables,
    priceRank: cheaper + 1,
    rankedOf: priced.length,
    medianAed: medianPrice(priced),
  };
}

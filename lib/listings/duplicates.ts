import { normalizeBuildingKey } from "./normalize";
import type {
  DuplicateConfidence,
  DuplicateGroup,
  Listing,
  SpreadSignificance,
} from "./types";

/**
 * Finding the same apartment listed more than once.
 *
 * Nothing on a rental portal tells you two listings are one flat. Different
 * agencies advertise the same unit, sometimes thousands of dirhams apart, and
 * the renter negotiates against a number someone else already beat.
 *
 * ## Why the tolerance is 3 square feet and not a percentage
 *
 * Measured across 43 same-building, same-bedroom adjacent pairs in real Bayut
 * data: 16 matched to the exact square foot, 10 differed by 1-3 sqft
 * (1625->1626, 851->852, 1421->1422 — agents rounding the same floor plan
 * differently), and the rest differed by materially more.
 *
 * Every observed rounding artifact was within 3 sqft *regardless of unit size*.
 * A percentage would scale with the flat: 1% of a 1,723 sqft unit is 17 feet,
 * which is a different layout, not a rounding difference. So the tolerance is
 * absolute.
 *
 * Exact matches are stated as fact. Near matches are stated as probable, in the
 * uncertain voice — claiming two different flats are one is the expensive error
 * in front of an audience who may know the building.
 */

/** Sizes within this many square feet are the same floor plan, rounded differently. */
export const PROBABLE_MATCH_TOLERANCE_SQFT = 3;

/**
 * Below this, a price gap is negotiating noise rather than a finding.
 * Chosen against the live distribution: most groups sit at 4-7k, which is
 * ordinary haggling range; the outliers that matter are far above it.
 */
export const MATERIAL_SPREAD_AED = 10_000;

export function classifySpread(spreadAed: number): SpreadSignificance {
  return spreadAed >= MATERIAL_SPREAD_AED ? "material" : "ordinary";
}

/** Listings can only be compared when they state the facts the match depends on. */
function isComparable(listing: Listing): boolean {
  return (
    listing.building !== null &&
    listing.bedrooms !== null &&
    listing.sizeSqft !== null &&
    listing.priceAed !== null
  );
}

function buildGroup(
  members: Listing[],
  confidence: DuplicateConfidence,
): DuplicateGroup {
  const prices = members.map((l) => l.priceAed as number);
  const cheapestAed = Math.min(...prices);
  const dearestAed = Math.max(...prices);
  const spreadAed = dearestAed - cheapestAed;
  const agencies = new Set(members.map((l) => l.agency));

  return {
    building: members[0].building as string,
    bedrooms: members[0].bedrooms as number,
    sizeSqft: members[0].sizeSqft as number,
    confidence,
    listings: [...members].sort(
      (a, b) => (a.priceAed as number) - (b.priceAed as number),
    ),
    cheapestAed,
    dearestAed,
    spreadAed,
    significance: classifySpread(spreadAed),
    // One agency advertising the same flat twice at two prices cannot be
    // explained by two agents not knowing about each other (R18).
    sameAgency: agencies.size === 1 && members[0].agency !== null,
  };
}

/**
 * Group listings that describe the same apartment.
 *
 * Candidates share a building and a bedroom count. Within that, members are
 * clustered by size: identical sizes form an `exact` group, sizes within the
 * tolerance form a `probable` one.
 *
 * A group whose prices are all identical is not reported — two agencies quoting
 * the same number tells the renter nothing.
 */
export function groupDuplicates(listings: Listing[]): DuplicateGroup[] {
  const byBuildingAndBeds = new Map<string, Listing[]>();

  for (const listing of listings) {
    if (!isComparable(listing)) continue;
    const key = `${normalizeBuildingKey(listing.building)}::${listing.bedrooms}`;
    const bucket = byBuildingAndBeds.get(key);
    if (bucket) bucket.push(listing);
    else byBuildingAndBeds.set(key, [listing]);
  }

  const groups: DuplicateGroup[] = [];

  for (const bucket of byBuildingAndBeds.values()) {
    if (bucket.length < 2) continue;

    // Walk sizes in order, starting a new cluster whenever the step from the
    // previous listing exceeds the tolerance.
    const bySize = [...bucket].sort(
      (a, b) => (a.sizeSqft as number) - (b.sizeSqft as number),
    );

    let cluster: Listing[] = [bySize[0]];
    const flush = () => {
      if (cluster.length < 2) return;
      const sizes = new Set(cluster.map((l) => l.sizeSqft));
      const confidence: DuplicateConfidence = sizes.size === 1 ? "exact" : "probable";
      const group = buildGroup(cluster, confidence);
      if (group.spreadAed > 0) groups.push(group);
    };

    for (let i = 1; i < bySize.length; i++) {
      const step =
        (bySize[i].sizeSqft as number) - (bySize[i - 1].sizeSqft as number);
      if (step <= PROBABLE_MATCH_TOLERANCE_SQFT) {
        cluster.push(bySize[i]);
      } else {
        flush();
        cluster = [bySize[i]];
      }
    }
    flush();
  }

  // Widest gap first — that is the one worth a renter's attention.
  return groups.sort((a, b) => b.spreadAed - a.spreadAed);
}

/**
 * Is this group still part of what the renter is looking at?
 *
 * The comparison panel stays on screen until something replaces it, so after a
 * change of subject it can keep showing an apartment from two questions ago
 * (plan R24). This is the test for that: the panel earns its place only while
 * the listings it compares are among the current results.
 *
 * Every member must survive, not merely one. The panel's whole claim is "this
 * flat is advertised at these two prices" — if a price ceiling has excluded the
 * dearer of the pair, that claim no longer describes anything on screen.
 */
export function groupIsInResults(
  group: DuplicateGroup,
  results: Listing[],
): boolean {
  // By id, not by value: two listings can agree on every visible field and
  // still be the two separate adverts that make the group interesting.
  const present = new Set(results.map((l) => l.id));
  return group.listings.every((l) => present.has(l.id));
}

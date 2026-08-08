import { groupDuplicates } from "./duplicates";
import { untrustedRate } from "./trust";
import type { Listing } from "./types";

/**
 * The figures the marketing page puts in front of a stranger.
 *
 * Every number on the landing page comes from here, computed from the same live
 * collection the product reads — there are no hand-written figures in the copy.
 * That is the point: a claim on a landing page is worth exactly as much as the
 * reader's ability to go and check it, and the demo one click away is the check.
 *
 * Pure and total, like everything else under `lib/listings/`. If the collection
 * is empty or the crawl returns nothing comparable, every optional figure is
 * null and the page hides the strip rather than printing a zero it cannot
 * explain.
 */
export interface LandingStats {
  listingCount: number;
  communityCount: number;
  /** Groups where one apartment appears more than once at more than one price. */
  duplicateGroups: number;
  /** Of those, the ones whose gap is past ordinary haggling range. */
  materialGroups: number;
  /** The widest gap currently live, in AED per year. Null if nothing is doubled. */
  widestGapAed: number | null;
  widestGapBuilding: string | null;
  /** Share of listings thin enough that the agent hedges on them, 0 to 1. */
  hedgedShare: number;
}

export function landingStats(listings: Listing[]): LandingStats {
  const groups = groupDuplicates(listings);
  const widest = groups[0] ?? null;

  return {
    listingCount: listings.length,
    communityCount: new Set(
      listings.map((l) => l.community).filter((c): c is string => c !== null),
    ).size,
    duplicateGroups: groups.length,
    materialGroups: groups.filter((g) => g.significance === "material").length,
    widestGapAed: widest?.spreadAed ?? null,
    widestGapBuilding: widest?.building ?? null,
    hedgedShare: untrustedRate(listings),
  };
}

/**
 * True when there is something worth showing a stranger.
 *
 * A proof strip that reads "0 duplicates found" is worse than no proof strip:
 * it is the product reporting its own absence. The page checks this and drops
 * the section rather than arguing with itself.
 */
export function hasSomethingToProve(stats: LandingStats): boolean {
  return stats.listingCount > 0 && stats.duplicateGroups > 0;
}

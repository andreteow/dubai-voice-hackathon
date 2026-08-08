import type { Listing } from "./types";

/**
 * Turning a spoken question into an answer, without leaving the browser.
 *
 * These functions run inside the ElevenLabs client tool, against the listings
 * array already in memory. That is the whole latency story: a voice turn does
 * arithmetic over a few hundred objects instead of waiting on a network call.
 */

export interface ListingsFilter {
  community?: string;
  bedrooms?: number;
  maxPriceAed?: number;
}

/** Match an area loosely — "Marina" should find "Marina Promenade, Dubai Marina, Dubai". */
export function matchesCommunity(listing: Listing, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === "") return true;
  const haystack = `${listing.community ?? ""} ${listing.building ?? ""}`.toLowerCase();
  return haystack.includes(needle);
}

export function filterListings(
  listings: Listing[],
  filter: ListingsFilter,
): Listing[] {
  return listings.filter((listing) => {
    if (filter.community && !matchesCommunity(listing, filter.community)) return false;
    if (filter.bedrooms !== undefined && listing.bedrooms !== filter.bedrooms) return false;
    if (
      filter.maxPriceAed !== undefined &&
      (listing.priceAed === null || listing.priceAed > filter.maxPriceAed)
    ) {
      return false;
    }
    return true;
  });
}

/** Median is the right centre here — a handful of penthouses skew a mean badly. */
export function medianPrice(listings: Listing[]): number | null {
  const prices = listings
    .map((l) => l.priceAed)
    .filter((p): p is number => p !== null)
    .sort((a, b) => a - b);
  if (prices.length === 0) return null;
  const mid = Math.floor(prices.length / 2);
  return prices.length % 2 === 0
    ? Math.round((prices[mid - 1] + prices[mid]) / 2)
    : prices[mid];
}

/** The areas the agent actually holds, for honest out-of-scope answers (R17). */
export function knownCommunities(listings: Listing[]): string[] {
  const seen = new Set<string>();
  for (const listing of listings) {
    const community = listing.community;
    if (!community) continue;
    // "Marina Promenade, Dubai Marina, Dubai" -> "Dubai Marina"
    const parts = community.split(",").map((p) => p.trim());
    const label = parts.length > 1 ? parts[parts.length - 2] : parts[0];
    if (label) seen.add(label);
  }
  return [...seen].sort();
}

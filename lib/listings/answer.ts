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

/**
 * The area a listing is in, as someone renting would name it.
 *
 * Bayut writes the address inward-out and ends on the emirate:
 * "Marina Promenade, Dubai Marina, Dubai". The last segment is always "Dubai"
 * and the first is usually the sub-development, so the useful label is the one
 * before last — the area a renter would actually say out loud.
 */
export function communityLabel(community: string | null): string | null {
  if (!community) return null;
  const parts = community.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  return parts.length > 1 ? parts[parts.length - 2] : parts[0];
}

/** The areas the agent actually holds, for honest out-of-scope answers (R17). */
export function knownCommunities(listings: Listing[]): string[] {
  const seen = new Set<string>();
  for (const listing of listings) {
    const label = communityLabel(listing.community);
    if (label) seen.add(label);
  }
  return [...seen].sort();
}

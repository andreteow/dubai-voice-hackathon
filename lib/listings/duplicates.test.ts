import { describe, expect, it } from "vitest";

import {
  classifySpread,
  groupDuplicates,
  PROBABLE_MATCH_TOLERANCE_SQFT,
} from "./duplicates";
import fixture from "./fixtures/listings.sample.json";
import { normalizeListings, rentalsOnly } from "./normalize";
import type { Listing, RawListingRow } from "./types";

// The real pipeline drops sale listings before grouping — test what ships.
const realListings = rentalsOnly(normalizeListings(fixture as RawListingRow[]));

let seq = 0;
function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: `l-${++seq}`,
    building: "West Avenue",
    community: "Dubai Marina",
    bedrooms: 1,
    priceAed: 76000,
    sizeSqft: 700,
    agency: "Agency One",
    agent: null,
    listedRelative: "Added on 1 August 2026",
    furnishing: null,
    sourceUrl: "https://www.bayut.com/property/details-1.html",
    extractionConfidence: 0.9,
    ...overrides,
  };
}

describe("groupDuplicates", () => {
  it("states an identical-size match as fact", () => {
    const groups = groupDuplicates([
      listing({ priceAed: 76000 }),
      listing({ priceAed: 100000, agency: "Agency Two" }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].confidence).toBe("exact");
    expect(groups[0].spreadAed).toBe(24000);
    expect(groups[0].significance).toBe("material");
  });

  it("calls a near-size match probable rather than certain", () => {
    const groups = groupDuplicates([
      listing({ sizeSqft: 700, priceAed: 76000 }),
      listing({ sizeSqft: 703, priceAed: 90000, agency: "Agency Two" }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].confidence).toBe("probable");
  });

  /**
   * The guard on the tolerance. If anyone "improves" this to a percentage,
   * 1% of 1,723 sqft is 17 feet and genuinely different flats start being
   * claimed as one — in front of an audience who may know the building.
   */
  it("refuses to group sizes beyond the tolerance", () => {
    const groups = groupDuplicates([
      listing({ sizeSqft: 700 }),
      listing({ sizeSqft: 700 + PROBABLE_MATCH_TOLERANCE_SQFT + 1, priceAed: 90000 }),
    ]);
    expect(groups).toHaveLength(0);
  });

  it("keeps different bedroom counts apart", () => {
    const groups = groupDuplicates([
      listing({ bedrooms: 1 }),
      listing({ bedrooms: 2, priceAed: 130000 }),
    ]);
    expect(groups).toHaveLength(0);
  });

  it("groups across spelling differences in the building name", () => {
    const groups = groupDuplicates([
      listing({ building: "Marina Diamond 2", priceAed: 64999 }),
      listing({ building: "marina diamond-2", priceAed: 70000 }),
    ]);
    expect(groups).toHaveLength(1);
  });

  it("never groups a listing with no stated size", () => {
    const groups = groupDuplicates([
      listing({ sizeSqft: null }),
      listing({ sizeSqft: null, priceAed: 90000 }),
    ]);
    expect(groups).toHaveLength(0);
  });

  it("says nothing when two agencies quote the same number", () => {
    const groups = groupDuplicates([listing(), listing({ agency: "Agency Two" })]);
    expect(groups).toHaveLength(0);
  });

  it("marks a group whose listings all belong to one agency", () => {
    const groups = groupDuplicates([
      listing({ agency: "Engel & Völkers", priceAed: 105000 }),
      listing({ agency: "Engel & Völkers", priceAed: 110000 }),
    ]);
    expect(groups[0].sameAgency).toBe(true);
  });

  it("does not mark a group where the agencies differ", () => {
    const groups = groupDuplicates([
      listing({ agency: "Agency One", priceAed: 105000 }),
      listing({ agency: "Agency Two", priceAed: 110000 }),
    ]);
    expect(groups[0].sameAgency).toBe(false);
  });

  it("orders the widest gap first", () => {
    const groups = groupDuplicates([
      listing({ building: "Tower A", priceAed: 90000 }),
      listing({ building: "Tower A", priceAed: 95000 }),
      listing({ building: "Tower B", priceAed: 76000 }),
      listing({ building: "Tower B", priceAed: 100000 }),
    ]);
    expect(groups[0].building).toBe("Tower B");
    expect(groups[0].spreadAed).toBe(24000);
  });

  it("lists members cheapest first", () => {
    const groups = groupDuplicates([
      listing({ priceAed: 100000, agency: "Agency Two" }),
      listing({ priceAed: 76000 }),
    ]);
    expect(groups[0].listings.map((l) => l.priceAed)).toEqual([76000, 100000]);
  });
});

describe("classifySpread", () => {
  it("treats a small gap as ordinary haggling range", () => {
    expect(classifySpread(2000)).toBe("ordinary");
  });

  it("treats a large gap as worth a renter's attention", () => {
    expect(classifySpread(24000)).toBe("material");
  });
});

describe("against the real fixture", () => {
  it("finds duplicate groups in real listings", () => {
    const groups = groupDuplicates(realListings);
    expect(groups.length).toBeGreaterThan(0);
  });

  /**
   * The demo canary. If this fails, the product still works but the strongest
   * beat has no example — scripts/check-hero.ts reports the same thing against
   * live data before recording.
   */
  it("finds at least one gap worth talking about", () => {
    const groups = groupDuplicates(realListings);
    expect(groups.some((g) => g.significance === "material")).toBe(true);
  });

  it("never claims a group whose members state different sizes beyond tolerance", () => {
    for (const group of groupDuplicates(realListings)) {
      const sizes = group.listings.map((l) => l.sizeSqft as number);
      expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(
        PROBABLE_MATCH_TOLERANCE_SQFT,
      );
    }
  });
});

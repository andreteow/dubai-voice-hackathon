import { describe, expect, it } from "vitest";

import fixture from "./fixtures/listings.sample.json";
import { normalizeListings, rentalsOnly } from "./normalize";
import { hasSomethingToProve, landingStats } from "./stats";
import type { Listing, RawListingRow } from "./types";

const realListings = rentalsOnly(normalizeListings(fixture as RawListingRow[]));

let seq = 0;
function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: `s-${++seq}`,
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

describe("landingStats", () => {
  it("reports nothing rather than zero when there are no listings", () => {
    const stats = landingStats([]);
    expect(stats.listingCount).toBe(0);
    expect(stats.widestGapAed).toBeNull();
    expect(stats.widestGapBuilding).toBeNull();
    expect(hasSomethingToProve(stats)).toBe(false);
  });

  it("counts distinct communities, not listings", () => {
    const stats = landingStats([
      listing({ community: "Dubai Marina" }),
      listing({ community: "Dubai Marina" }),
      listing({ community: "Business Bay" }),
    ]);
    expect(stats.communityCount).toBe(2);
  });

  it("does not count a missing community as a community", () => {
    const stats = landingStats([
      listing({ community: "Dubai Marina" }),
      listing({ community: null }),
    ]);
    expect(stats.communityCount).toBe(1);
  });

  it("surfaces the widest gap and the building it is in", () => {
    const stats = landingStats([
      listing({ building: "Tower A", priceAed: 90000 }),
      listing({ building: "Tower A", priceAed: 95000 }),
      listing({ building: "Tower B", priceAed: 76000 }),
      listing({ building: "Tower B", priceAed: 146000 }),
    ]);
    expect(stats.widestGapAed).toBe(70000);
    expect(stats.widestGapBuilding).toBe("Tower B");
    expect(stats.duplicateGroups).toBe(2);
    // Tower A's 5,000 gap is ordinary haggling range; only Tower B is material.
    expect(stats.materialGroups).toBe(1);
  });

  /**
   * The landing page prints this as a percentage. If a future change to
   * `trust.ts` pushes it toward half the table, the copy stops being a
   * statement about thin listings and starts being a statement about the
   * classifier — see the bedroom-formatting note in `trust.ts`.
   */
  it("keeps the hedge rate on real listings well below half", () => {
    const stats = landingStats(realListings);
    expect(stats.hedgedShare).toBeGreaterThan(0);
    expect(stats.hedgedShare).toBeLessThan(0.35);
  });

  it("has something to prove against the real fixture", () => {
    expect(hasSomethingToProve(landingStats(realListings))).toBe(true);
  });
});

describe("hasSomethingToProve", () => {
  it("is false when listings exist but nothing is doubled", () => {
    const stats = landingStats([
      listing({ building: "Tower A" }),
      listing({ building: "Tower B", priceAed: 120000 }),
    ]);
    expect(stats.listingCount).toBe(2);
    expect(stats.duplicateGroups).toBe(0);
    expect(hasSomethingToProve(stats)).toBe(false);
  });
});

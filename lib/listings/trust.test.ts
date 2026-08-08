import { describe, expect, it } from "vitest";

import fixture from "./fixtures/listings.sample.json";
import { normalizeListings } from "./normalize";
import { classifyTrust, trustPhrases, untrustedRate } from "./trust";
import type { Listing, RawListingRow } from "./types";

const listings = normalizeListings(fixture as RawListingRow[]);

/** A listing with nothing wrong with it. Override one field per test. */
function completeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "test-1",
    building: "Marina Tower",
    community: "Dubai Marina",
    bedrooms: 1,
    priceAed: 95000,
    sizeSqft: 761,
    agency: "Property Market",
    agent: "A. Agent",
    listedRelative: "Added on 7 August 2026",
    furnishing: "Unfurnished",
    sourceUrl: "https://www.bayut.com/property/details-1.html",
    extractionConfidence: 0.9,
    ...overrides,
  };
}

describe("classifyTrust", () => {
  it("trusts a listing that states everything", () => {
    expect(classifyTrust(completeListing()).trusted).toBe(true);
  });

  it("flags a listing that names no agency", () => {
    const verdict = classifyTrust(completeListing({ agency: null }));
    expect(verdict.trusted).toBe(false);
    expect(verdict.reasons).toEqual(["no_agency"]);
  });

  it("flags a listing with no posting date", () => {
    const verdict = classifyTrust(completeListing({ listedRelative: null }));
    expect(verdict.reasons).toEqual(["no_date"]);
  });

  it("distinguishes a nonsense date from a missing one", () => {
    // Real listings carry values like "/" in this field.
    const verdict = classifyTrust(completeListing({ listedRelative: "/" }));
    expect(verdict.reasons).toEqual(["unreadable_date"]);
  });

  it("flags a listing with no size", () => {
    expect(classifyTrust(completeListing({ sizeSqft: null })).reasons).toEqual([
      "no_size",
    ]);
  });

  it("reports every missing fact, in a stable order", () => {
    const verdict = classifyTrust(
      completeListing({ agency: null, listedRelative: null }),
    );
    expect(verdict.reasons).toEqual(["no_agency", "no_date"]);
  });

  /**
   * R11. This is the guard, not a formality.
   *
   * "2 Beds" vs "2" is how two agencies write the same fact. If it ever starts
   * counting as a defect the uncertain voice fires on half the table and stops
   * carrying information.
   */
  it("never treats bedroom formatting as a defect", () => {
    const [twoBeds] = normalizeListings([
      {
        tower_or_building: "DAMAC Heights",
        community: "Dubai Marina",
        bedrooms: "2 Beds",
        price_aed_per_year: "170000",
        size_sqft: "1331",
        agency_name: "Some Agency",
        listed_relative: "Added on 1 August 2026",
        _url: "https://www.bayut.com/property/details-2.html",
      },
    ]);
    expect(twoBeds.bedrooms).toBe(2);
    expect(classifyTrust(twoBeds).trusted).toBe(true);
  });
});

describe("trustPhrases", () => {
  it("says the missing fact in words a renter would use", () => {
    const phrases = trustPhrases(classifyTrust(completeListing({ listedRelative: null })));
    expect(phrases).toEqual(["doesn't say when it was posted"]);
  });
});

describe("against the real fixture", () => {
  /**
   * A two-sided guard. Too low and the uncertain voice never fires, so the
   * product's headline behaviour is invisible. Too high and it fires on
   * everything, which is how we know bedroom formatting crept back in.
   */
  it("hedges on a meaningful minority of real listings", () => {
    const rate = untrustedRate(listings);
    expect(rate).toBeGreaterThan(0.05);
    expect(rate).toBeLessThan(0.35);
  });

  it("finds at least one listing of each common kind of gap", () => {
    const reasons = new Set(
      listings.flatMap((l) => classifyTrust(l).reasons),
    );
    expect(reasons.has("no_date")).toBe(true);
    expect(reasons.has("no_agency")).toBe(true);
  });
});

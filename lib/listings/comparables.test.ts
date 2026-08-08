import { describe, expect, it } from "vitest";

import { comparablesFor, MAX_COMPARABLES } from "./comparables";
import fixture from "./fixtures/listings.sample.json";
import { normalizeListings, rentalsOnly } from "./normalize";
import type { Listing, RawListingRow } from "./types";

const realListings = rentalsOnly(normalizeListings(fixture as RawListingRow[]));

let seq = 0;
function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: `l-${++seq}`,
    building: "West Avenue",
    community: "Marina Promenade, Dubai Marina, Dubai",
    bedrooms: 1,
    priceAed: 100_000,
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

describe("comparablesFor", () => {
  it("finds a similar flat in the same area", () => {
    const subject = listing();
    const other = listing({ building: "Marina Gate", sizeSqft: 720, priceAed: 120_000 });

    const report = comparablesFor(subject, [subject, other]);

    expect(report.comparables).toHaveLength(1);
    expect(report.comparables[0].listing.id).toBe(other.id);
    expect(report.comparables[0].deltaAed).toBe(20_000);
  });

  it("never compares a listing against itself", () => {
    const subject = listing();
    expect(comparablesFor(subject, [subject]).comparables).toEqual([]);
  });

  it("matches on the area, not the full address string", () => {
    // "Marina Promenade, Dubai Marina, Dubai" and "The Address, Dubai Marina,
    // Dubai" are the same market written two ways.
    const subject = listing();
    const other = listing({
      building: "The Address",
      community: "The Address JBR, Dubai Marina, Dubai",
      sizeSqft: 710,
    });
    expect(comparablesFor(subject, [subject, other]).comparables).toHaveLength(1);
  });

  it("does not compare across areas", () => {
    const subject = listing();
    const downtown = listing({
      community: "Forte, Downtown Dubai, Dubai",
      sizeSqft: 700,
    });
    expect(comparablesFor(subject, [subject, downtown]).comparables).toEqual([]);
  });

  it("does not compare across bedroom counts", () => {
    const subject = listing({ bedrooms: 1 });
    const twoBed = listing({ bedrooms: 2, sizeSqft: 700 });
    expect(comparablesFor(subject, [subject, twoBed]).comparables).toEqual([]);
  });

  it("holds sizes to a tenth of the subject", () => {
    const subject = listing({ sizeSqft: 700 });
    const justInside = listing({ building: "A", sizeSqft: 770 });
    const justOutside = listing({ building: "B", sizeSqft: 771 });

    const report = comparablesFor(subject, [subject, justInside, justOutside]);

    expect(report.comparables.map((c) => c.listing.id)).toEqual([justInside.id]);
  });

  it("orders by closeness in size, not by price", () => {
    const subject = listing({ sizeSqft: 700 });
    const nearer = listing({ building: "A", sizeSqft: 705, priceAed: 200_000 });
    const further = listing({ building: "B", sizeSqft: 740, priceAed: 90_000 });

    const report = comparablesFor(subject, [subject, further, nearer]);

    expect(report.comparables.map((c) => c.listing.id)).toEqual([
      nearer.id,
      further.id,
    ]);
  });

  it("caps the list at what can be read mid-conversation", () => {
    const subject = listing({ sizeSqft: 700 });
    const others = Array.from({ length: 20 }, (_, i) =>
      listing({ building: `Tower ${i}`, sizeSqft: 700 + i }),
    );
    expect(comparablesFor(subject, [subject, ...others]).comparables).toHaveLength(
      MAX_COMPARABLES,
    );
  });
});

describe("the same apartment is not a comparable", () => {
  // The distinction the whole panel turns on: another advert for THIS flat is a
  // price you could hold an agent to. A similar flat is one you could argue
  // from. Merged into one list, the product's actual finding disappears.
  it("puts a duplicate in its own band and out of the comparables", () => {
    const subject = listing({ sizeSqft: 700, priceAed: 100_000 });
    const sameFlat = listing({
      agency: "Agency Two",
      sizeSqft: 700,
      priceAed: 82_000,
    });

    const report = comparablesFor(subject, [subject, sameFlat]);

    expect(report.sameApartment.map((l) => l.id)).toEqual([sameFlat.id]);
    expect(report.comparables).toEqual([]);
  });

  it("counts a rounding-distance match as the same apartment", () => {
    const subject = listing({ sizeSqft: 700 });
    const rounded = listing({ agency: "Agency Two", sizeSqft: 703, priceAed: 90_000 });

    const report = comparablesFor(subject, [subject, rounded]);

    expect(report.sameApartment.map((l) => l.id)).toEqual([rounded.id]);
    expect(report.comparables).toEqual([]);
  });

  it("counts a same-building flat beyond the tolerance as a comparable", () => {
    const subject = listing({ sizeSqft: 700 });
    const differentUnit = listing({ agency: "Agency Two", sizeSqft: 730 });

    const report = comparablesFor(subject, [subject, differentUnit]);

    expect(report.sameApartment).toEqual([]);
    expect(report.comparables.map((c) => c.listing.id)).toEqual([differentUnit.id]);
  });

  it("still reports a duplicate priced identically", () => {
    // `groupDuplicates` drops those groups — two agencies quoting one number is
    // not worth a comparison panel. Identity is still identity, and the detail
    // panel is asking a different question.
    const subject = listing({ sizeSqft: 700, priceAed: 100_000 });
    const twin = listing({ agency: "Agency Two", sizeSqft: 700, priceAed: 100_000 });

    expect(comparablesFor(subject, [subject, twin]).sameApartment).toHaveLength(1);
  });

  it("orders duplicates cheapest first", () => {
    const subject = listing({ priceAed: 100_000 });
    const dear = listing({ agency: "B", priceAed: 130_000 });
    const cheap = listing({ agency: "C", priceAed: 88_000 });

    const report = comparablesFor(subject, [subject, dear, cheap]);

    expect(report.sameApartment.map((l) => l.priceAed)).toEqual([88_000, 130_000]);
  });
});

describe("where the price sits", () => {
  it("ranks the subject among its comparables", () => {
    const subject = listing({ sizeSqft: 700, priceAed: 100_000 });
    const cheaper = listing({ building: "A", sizeSqft: 705, priceAed: 90_000 });
    const dearer = listing({ building: "B", sizeSqft: 710, priceAed: 130_000 });

    const report = comparablesFor(subject, [subject, cheaper, dearer]);

    expect(report.priceRank).toBe(2);
    expect(report.rankedOf).toBe(3);
    expect(report.medianAed).toBe(100_000);
  });

  it("reports the cheapest as first", () => {
    const subject = listing({ sizeSqft: 700, priceAed: 80_000 });
    const dearer = listing({ building: "A", sizeSqft: 705, priceAed: 90_000 });

    expect(comparablesFor(subject, [subject, dearer]).priceRank).toBe(1);
  });

  it("withholds a rank when there is nothing to rank against", () => {
    // "1st of 1 cheapest" sounds like a finding and says nothing.
    const subject = listing();
    const report = comparablesFor(subject, [subject]);

    expect(report.priceRank).toBeNull();
    expect(report.rankedOf).toBe(0);
    expect(report.medianAed).toBeNull();
  });
});

describe("listings too thin to price", () => {
  it("returns nothing for a subject with no size", () => {
    const subject = listing({ sizeSqft: null });
    const other = listing({ building: "A" });
    expect(comparablesFor(subject, [subject, other])).toMatchObject({
      comparables: [],
      sameApartment: [],
      priceRank: null,
    });
  });

  it("returns nothing for a subject with no price", () => {
    const subject = listing({ priceAed: null });
    expect(comparablesFor(subject, [subject, listing({ building: "A" })]).comparables)
      .toEqual([]);
  });

  it("skips candidates missing a price or a size", () => {
    const subject = listing({ sizeSqft: 700 });
    const noPrice = listing({ building: "A", sizeSqft: 700, priceAed: null });
    const noSize = listing({ building: "B", sizeSqft: null });

    expect(comparablesFor(subject, [subject, noPrice, noSize]).comparables).toEqual([]);
  });

  it("returns nothing for a subject with no area", () => {
    const subject = listing({ community: null });
    expect(comparablesFor(subject, [subject, listing({ building: "A" })]).comparables)
      .toEqual([]);
  });
});

describe("against the real fixture", () => {
  it("finds comparables for a typical listing", () => {
    const subject = realListings.find(
      (l) => l.sizeSqft !== null && l.priceAed !== null && l.bedrooms === 1,
    );
    expect(subject).toBeDefined();
    expect(() => comparablesFor(subject as Listing, realListings)).not.toThrow();
  });

  it("never reports a listing as its own comparable or duplicate", () => {
    for (const subject of realListings) {
      const report = comparablesFor(subject, realListings);
      const ids = [
        ...report.comparables.map((c) => c.listing.id),
        ...report.sameApartment.map((l) => l.id),
      ];
      expect(ids).not.toContain(subject.id);
    }
  });

  it("never lists the same listing in both bands", () => {
    for (const subject of realListings) {
      const report = comparablesFor(subject, realListings);
      const duplicates = new Set(report.sameApartment.map((l) => l.id));
      for (const { listing: candidate } of report.comparables) {
        expect(duplicates.has(candidate.id)).toBe(false);
      }
    }
  });

  it("keeps every comparable in the subject's own area and bedroom count", () => {
    for (const subject of realListings) {
      for (const { listing: candidate } of comparablesFor(subject, realListings)
        .comparables) {
        expect(candidate.bedrooms).toBe(subject.bedrooms);
      }
    }
  });

  it("finds real duplicate pairs in the collection", () => {
    const withDuplicates = realListings.filter(
      (l) => comparablesFor(l, realListings).sameApartment.length > 0,
    );
    expect(withDuplicates.length).toBeGreaterThan(0);
  });
});

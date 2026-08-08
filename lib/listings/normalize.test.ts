import { describe, expect, it } from "vitest";

import fixture from "./fixtures/listings.sample.json";
import {
  looksLikeSalePrice,
  normalizeBedrooms,
  normalizeBuildingKey,
  normalizeListings,
  normalizePrice,
  normalizeSize,
  rentalsOnly,
} from "./normalize";
import type { RawListingRow } from "./types";

const rows = fixture as RawListingRow[];

describe("normalizeBedrooms", () => {
  it("reads every way Bayut writes a bedroom count", () => {
    expect(normalizeBedrooms("1")).toBe(1);
    expect(normalizeBedrooms("1 Bed")).toBe(1);
    expect(normalizeBedrooms("1 Bedroom")).toBe(1);
    expect(normalizeBedrooms("2 Beds")).toBe(2);
  });

  it("treats a studio as zero bedrooms, not as missing", () => {
    expect(normalizeBedrooms("Studio")).toBe(0);
    expect(normalizeBedrooms("studio")).toBe(0);
  });

  it("returns null only when the listing gave nothing", () => {
    expect(normalizeBedrooms("")).toBeNull();
    expect(normalizeBedrooms(undefined)).toBeNull();
  });
});

describe("normalizePrice", () => {
  it("reads a price whether or not it is decorated", () => {
    expect(normalizePrice("76000")).toBe(76000);
    expect(normalizePrice("AED 76,000")).toBe(76000);
    expect(normalizePrice("76,000 / year")).toBe(76000);
  });
});

describe("normalizeSize", () => {
  // A missing size that became 0 would match every other sizeless listing in
  // duplicates.ts and produce a confident false claim. null is load-bearing.
  it("returns null for a missing size rather than zero", () => {
    expect(normalizeSize("")).toBeNull();
    expect(normalizeSize(undefined)).toBeNull();
    expect(normalizeSize("700")).toBe(700);
  });
});

describe("normalizeBuildingKey", () => {
  it("ignores case and punctuation so agencies spelling differs harmlessly", () => {
    expect(normalizeBuildingKey("Marina Diamond 2")).toBe(
      normalizeBuildingKey("marina diamond-2"),
    );
    expect(normalizeBuildingKey("5242 Tower 2")).toBe(
      normalizeBuildingKey("5242  tower  2"),
    );
  });
});

describe("normalizeListing", () => {
  it("survives a row where every optional field is missing", () => {
    const [listing] = normalizeListings([{}]);
    expect(listing.building).toBeNull();
    expect(listing.bedrooms).toBeNull();
    expect(listing.priceAed).toBeNull();
    expect(listing.id).toBeTruthy();
  });

  it("keeps the source link so every claim on screen is checkable", () => {
    const [listing] = normalizeListings([
      { _url: "https://www.bayut.com/property/details-1.html" },
    ]);
    expect(listing.sourceUrl).toBe(
      "https://www.bayut.com/property/details-1.html",
    );
  });
});

describe("against the real fixture", () => {
  it("normalises every captured row without throwing", () => {
    const listings = normalizeListings(rows);
    expect(listings).toHaveLength(rows.length);
    expect(rows.length).toBeGreaterThan(100);
  });

  it("reads a bedroom count from every real listing", () => {
    // If this ever fails, Bayut has introduced a format normalizeBedrooms does
    // not know — and trust.ts would start hedging on it. See R11.
    const listings = normalizeListings(rows);
    const unreadable = listings.filter((l) => l.bedrooms === null);
    expect(unreadable).toHaveLength(0);
  });
});

describe("sale-price contamination", () => {
  it("excludes a purchase price wearing a rent label", () => {
    const [sale] = normalizeListings([{ price_aed_per_year: "4799999" }]);
    expect(looksLikeSalePrice(sale)).toBe(true);
  });

  it("keeps even an expensive genuine rent", () => {
    const [pricey] = normalizeListings([{ price_aed_per_year: "450000" }]);
    expect(looksLikeSalePrice(pricey)).toBe(false);
  });

  it("removes the sale listings from the real fixture", () => {
    const all = normalizeListings(rows);
    const rentals = rentalsOnly(all);
    expect(rentals.length).toBeLessThan(all.length);
    // Nothing left should be implausible as an annual rent.
    const dearest = Math.max(...rentals.map((l) => l.priceAed ?? 0));
    expect(dearest).toBeLessThan(1_000_000);
  });
});

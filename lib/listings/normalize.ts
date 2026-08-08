import type { Listing, RawListingRow } from "./types";

/**
 * The string -> number boundary.
 *
 * context.dev returns every field as a string, and Bayut's listings are
 * inconsistently written: bedrooms appear as "1", "1 Bed", and "2 Beds";
 * prices as "76000" or "AED 76,000". Normalising here means nothing downstream
 * has to know that.
 *
 * The important rule: a missing value becomes `null`, never `0`. A size of 0
 * would silently match other sizeless listings in `duplicates.ts` and produce
 * confident nonsense.
 */

/** Extract the first run of digits and return it as a number. */
function digitsToNumber(value: string | undefined | null): number | null {
  if (!value) return null;
  const digits = value.replace(/[^0-9]/g, "");
  if (digits === "") return null;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
}

function trimToNull(value: string | undefined | null): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Bedroom counts to integers. "Studio" is 0 — a real, orderable value, distinct
 * from null (the row never said).
 *
 * This function is the whole reason R11 holds: formatting variance is absorbed
 * here so `trust.ts` never sees it and never mistakes it for a defect.
 */
export function normalizeBedrooms(value: string | undefined | null): number | null {
  const raw = (value ?? "").trim().toLowerCase();
  if (raw === "") return null;
  if (raw.includes("studio")) return 0;
  return digitsToNumber(raw);
}

/** Annual rent in AED. Handles "AED 76,000", "76000", and "76,000/year". */
export function normalizePrice(value: string | undefined | null): number | null {
  return digitsToNumber(value);
}

/** Built-up area in square feet. */
export function normalizeSize(value: string | undefined | null): number | null {
  return digitsToNumber(value);
}

/**
 * Building names vary in case and punctuation across agencies
 * ("Marina Diamond 2", "marina diamond-2"). Comparison uses this form;
 * display uses the original.
 */
export function normalizeBuildingKey(value: string | undefined | null): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

let fallbackIdCounter = 0;

/** Map one raw context.dev row to a `Listing`. Total — never throws on a malformed row. */
export function normalizeListing(row: RawListingRow): Listing {
  return {
    id: row._id ?? row._url ?? `listing-${++fallbackIdCounter}`,
    building: trimToNull(row.tower_or_building),
    community: trimToNull(row.community),
    bedrooms: normalizeBedrooms(row.bedrooms),
    priceAed: normalizePrice(row.price_aed_per_year),
    sizeSqft: normalizeSize(row.size_sqft),
    agency: trimToNull(row.agency_name),
    agent: trimToNull(row.agent_name),
    listedRelative: trimToNull(row.listed_relative),
    furnishing: trimToNull(row.furnishing),
    sourceUrl: trimToNull(row._url),
    extractionConfidence: row._meta?.extraction_confidence ?? null,
  };
}

export function normalizeListings(rows: RawListingRow[]): Listing[] {
  return rows.map(normalizeListing);
}

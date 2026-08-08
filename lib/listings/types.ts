/**
 * Domain types for Second Opinion.
 *
 * Everything context.dev returns is a string. `Listing` is the normalised shape
 * the rest of the app works with — see `normalize.ts` for the boundary.
 */

/** A row exactly as the context.dev WebDB returns it. All fields are strings. */
export interface RawListingRow {
  tower_or_building?: string;
  community?: string;
  bedrooms?: string;
  price_aed_per_year?: string;
  size_sqft?: string;
  agency_name?: string;
  agent_name?: string;
  listed_relative?: string;
  furnishing?: string;
  /** Present in the schema but not extractable in practice — see plan KTD3 notes. */
  permit_number?: string;
  _id?: string;
  _url?: string;
  _meta?: {
    extraction_confidence?: number;
    fields?: Record<string, { status?: string; confidence?: number }>;
  };
}

/** A listing after normalisation. Numeric fields are numbers or null — never 0-as-missing. */
export interface Listing {
  id: string;
  building: string | null;
  community: string | null;
  /** Studio is 0. Null means the row did not state a bedroom count at all. */
  bedrooms: number | null;
  priceAed: number | null;
  sizeSqft: number | null;
  agency: string | null;
  agent: string | null;
  /** The listing's own words for when it was posted, e.g. "Added on 25 July 2026". */
  listedRelative: string | null;
  furnishing: string | null;
  sourceUrl: string | null;
  /** context.dev's own extraction confidence. Retained for provenance, not used for hedging. */
  extractionConfidence: number | null;
}

/**
 * Why a listing is not trustworthy enough to state plainly.
 *
 * Deliberately a closed union: R11 forbids treating formatting variance as a
 * defect, and a closed set is what stops a well-meaning contributor adding
 * `bedrooms_unparsed` here later. See `trust.ts`.
 */
export type TrustReason =
  | "no_agency"
  | "no_date"
  | "unreadable_date"
  | "no_size";

export interface TrustVerdict {
  trusted: boolean;
  reasons: TrustReason[];
}

/** How sure we are that the listings in a group are the same physical apartment. */
export type DuplicateConfidence = "exact" | "probable";

/** Whether a price gap is worth remarking on. */
export type SpreadSignificance = "material" | "ordinary";

export interface DuplicateGroup {
  building: string;
  bedrooms: number;
  /** Representative size. Members may differ by up to the probable-match tolerance. */
  sizeSqft: number;
  confidence: DuplicateConfidence;
  listings: Listing[];
  cheapestAed: number;
  dearestAed: number;
  spreadAed: number;
  significance: SpreadSignificance;
  /** True when every listing in the group names the same agency. */
  sameAgency: boolean;
}

/** What the /api/listings route returns. */
export interface ListingsPayload {
  listings: Listing[];
  /** ISO timestamp of when the listings were read from context.dev. */
  readAt: string;
  total: number;
}

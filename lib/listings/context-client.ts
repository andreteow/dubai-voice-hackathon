import "server-only";

import type { RawListingRow } from "./types";

/**
 * The only place that talks to context.dev.
 *
 * Server-only by import (`server-only` throws at build time if this is ever
 * pulled into a client bundle). The API key must never reach the browser —
 * plan KTD6.
 */

const BASE_URL = "https://api.context.dev/v1";

/** The Dubai rentals WebDB: 5 Bayut crawl targets, re-syncing every 10 minutes. */
export const COLLECTION_ID =
  process.env.CONTEXT_COLLECTION_ID ?? "col_07cb99b4beec4713bc3145e77c6bfd68";

/** The API rejects limit > 200 with a 400. */
export const MAX_QUERY_LIMIT = 200;

export interface QueryOptions {
  limit?: number;
  /** e.g. `{ community: { contains: "Marina" } }` */
  where?: Record<string, Record<string, string | number>>;
  /** Note the key is `dir`, not `direction` — the API 400s on `direction`. */
  orderBy?: Array<{ field: string; dir: "asc" | "desc" }>;
}

interface QueryResponse {
  data: RawListingRow[];
  has_more: boolean;
  next_cursor: string | null;
  total: number;
  key_metadata?: { credits_consumed: number; credits_remaining: number };
}

/**
 * Query the listings collection. Costs 0 credits and returns in ~0.5-1.7s.
 *
 * This runs once per page load (plan R1), not once per voice turn — the agent
 * answers from an in-memory copy so a conversation never waits on the network.
 */
export async function queryListings(
  options: QueryOptions = {},
): Promise<{ rows: RawListingRow[]; total: number }> {
  const apiKey = process.env.CONTEXT_DEV_API_KEY;
  if (!apiKey) {
    throw new Error(
      "CONTEXT_DEV_API_KEY is not set. Copy .env.example to .env.local and add your key.",
    );
  }

  const body: Record<string, unknown> = {
    limit: Math.min(options.limit ?? MAX_QUERY_LIMIT, MAX_QUERY_LIMIT),
  };
  if (options.where) body.where = options.where;
  if (options.orderBy) body.order_by = options.orderBy;

  const response = await fetch(
    `${BASE_URL}/webdbs/collections/${COLLECTION_ID}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `context.dev query failed (${response.status}): ${detail.slice(0, 300)}`,
    );
  }

  const payload = (await response.json()) as QueryResponse;
  return { rows: payload.data ?? [], total: payload.total ?? 0 };
}

/** Row ids as the WebDB issues them. Anything else never reaches the API. */
const ROW_ID = /^row_[a-z0-9]+$/i;

export function isRowId(value: string): boolean {
  return ROW_ID.test(value);
}

/**
 * The page a listing was extracted from, as it was when it was read.
 *
 * Bayut captchas anything that fetches a detail page on demand — a live scrape
 * of a listing URL comes back as "Captcha | Bayut" after about nine seconds.
 * This does not fetch anything from Bayut. context.dev kept the page its
 * crawler already read, and this asks for that copy: **0 credits, ~2s**, and it
 * cannot be blocked because nobody is being visited.
 *
 * The trade-off is honest and worth stating in the UI: these are the photos and
 * the description **as of the last crawl**, not as of now.
 */
export async function fetchListingSnapshot(rowId: string): Promise<string> {
  const apiKey = process.env.CONTEXT_DEV_API_KEY;
  if (!apiKey) throw new Error("CONTEXT_DEV_API_KEY is not set.");
  // Belt and braces: the route validates too, but this is the function that
  // interpolates into a URL.
  if (!isRowId(rowId)) throw new Error(`Not a row id: ${rowId}`);

  const response = await fetch(
    `${BASE_URL}/webdbs/rows/${rowId}/snapshot?format=html`,
    { headers: { Authorization: `Bearer ${apiKey}` }, cache: "no-store" },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `context.dev snapshot failed (${response.status}): ${detail.slice(0, 200)}`,
    );
  }

  return response.text();
}

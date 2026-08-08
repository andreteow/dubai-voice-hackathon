import { NextResponse } from "next/server";

import { queryListings } from "@/lib/listings/context-client";
import { normalizeListings, rentalsOnly } from "@/lib/listings/normalize";
import type { ListingsPayload } from "@/lib/listings/types";

/**
 * Read the listings once and hand the browser a normalised copy (plan R1).
 *
 * The voice agent never calls this — it reads the array this route already
 * delivered, held in React state.
 *
 * One other route reaches the network: `/api/listings/[id]/detail`, which
 * fetches the photos for a listing the renter has opened. It is not on the
 * voice path either — the detail panel renders complete without it and fills
 * the gallery in afterwards.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { rows, total } = await queryListings({ limit: 200 });
    // Sale listings leak in from the crawl carrying a purchase price in the
    // annual-rent field. See `looksLikeSalePrice`.
    const payload: ListingsPayload = {
      listings: rentalsOnly(normalizeListings(rows)),
      readAt: new Date().toISOString(),
      total,
    };
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

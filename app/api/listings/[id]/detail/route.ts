import { NextResponse } from "next/server";

import { fetchListingSnapshot, isRowId } from "@/lib/listings/context-client";
import { parseSnapshot } from "@/lib/listings/snapshot";
import type { ListingDetailPayload } from "@/lib/listings/types";

/**
 * The photos and prose for one listing, out of the page context.dev already read.
 *
 * ## This is not on the voice path
 *
 * Everything the agent says still comes from the in-memory array (plan KTD1).
 * This route serves the *panel*, which opens instantly on what is already known
 * — specs, trust verdict, comparables — and fills the pictures in behind a
 * skeleton a second or two later. A voice turn never awaits it, so the
 * no-network-during-a-turn property is untouched.
 *
 * ## Failure is a quieter panel, not an error
 *
 * A 502 here would put a red box over a panel that is already showing the
 * renter everything that actually matters. So a snapshot that cannot be read
 * returns 200 with empty fields and a `stale` flag, exactly as the waitlist
 * route degrades: the feature that failed disappears, the page does not.
 */
export const dynamic = "force-dynamic";

function unavailable(id: string): ListingDetailPayload {
  return {
    id,
    photos: [],
    headline: null,
    description: null,
    bathrooms: null,
    amenities: [],
    reference: null,
    unavailable: true,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Fallback ids (`listing-3`, or a URL) belong to rows that arrived without
  // one — see `normalizeListing`. There is no snapshot to ask for.
  if (!isRowId(id)) return NextResponse.json(unavailable(id));

  try {
    const snapshot = parseSnapshot(await fetchListingSnapshot(id));
    const payload: ListingDetailPayload = {
      id,
      photos: snapshot.photos,
      headline: snapshot.headline,
      description: snapshot.description,
      bathrooms: snapshot.bathrooms,
      amenities: snapshot.amenities,
      reference: snapshot.reference,
      unavailable: false,
    };
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(unavailable(id));
  }
}

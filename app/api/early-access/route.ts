import { NextResponse } from "next/server";

import { isPlausibleEmail, joinWaitlist } from "@/lib/waitlist";

/**
 * Early-access sign-up.
 *
 * Only a malformed address is rejected. Everything else — a missing key, a
 * Supabase outage — still returns 200, because a broken waitlist is not a reason
 * to stand between someone and the demo. `stored: false` says what happened.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let email: unknown;
  try {
    ({ email } = (await request.json()) as { email?: unknown });
  } catch {
    return NextResponse.json(
      { error: "Send a JSON body with an email." },
      { status: 400 },
    );
  }

  if (!isPlausibleEmail(email)) {
    return NextResponse.json(
      { error: "That does not look like an email address." },
      { status: 400 },
    );
  }

  const result = await joinWaitlist(email);
  return NextResponse.json(result);
}

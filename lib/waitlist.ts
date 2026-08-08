import "server-only";

/**
 * The early-access list.
 *
 * Storage is a single Postgres function, `join_second_opinion_waitlist`, called
 * over Supabase's REST endpoint. The table behind it has row level security on
 * and no policies, so the key held here cannot read it, cannot write to it
 * directly, and cannot be used to enumerate anyone else's address. The function
 * is the entire API surface: give it an address, get back a position.
 *
 * Server-only by import — the Supabase key follows the same rule as the
 * context.dev key and never reaches the browser.
 */

const RPC_NAME = "join_second_opinion_waitlist";

/**
 * Deliberately permissive. A regex cannot tell you an address is real, only
 * that it is shaped like one; anything stricter starts rejecting valid mail.
 * The same check runs again inside the database function.
 */
const EMAIL_SHAPE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function isPlausibleEmail(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 254 &&
    EMAIL_SHAPE.test(value.trim())
  );
}

export interface WaitlistResult {
  /** Their place in the queue, or null when the list was unreachable. */
  position: number | null;
  /** True when this address was already on the list before now. */
  alreadyJoined: boolean;
  /**
   * False when the address was accepted by the page but not actually recorded.
   * A missing key or a Supabase outage must not stand between someone and the
   * demo, so the request still succeeds — but it says so rather than pretending.
   */
  stored: boolean;
}

const UNRECORDED: WaitlistResult = {
  position: null,
  alreadyJoined: false,
  stored: false,
};

export async function joinWaitlist(email: string): Promise<WaitlistResult> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    console.warn(
      "[waitlist] SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY are not set — accepted %s without storing it.",
      email,
    );
    return UNRECORDED;
  }

  try {
    const response = await fetch(`${url}/rest/v1/rpc/${RPC_NAME}`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_email: email.trim() }),
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(
        "[waitlist] Supabase returned %d: %s",
        response.status,
        detail.slice(0, 300),
      );
      return UNRECORDED;
    }

    // The function returns a one-row table, so PostgREST hands back an array.
    const rows = (await response.json()) as Array<{
      list_position: number;
      already_joined: boolean;
    }>;
    const row = Array.isArray(rows) ? rows[0] : undefined;
    if (!row) return UNRECORDED;

    return {
      position: row.list_position,
      alreadyJoined: row.already_joined,
      stored: true,
    };
  } catch (error) {
    console.error("[waitlist] could not reach Supabase:", error);
    return UNRECORDED;
  }
}

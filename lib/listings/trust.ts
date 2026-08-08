import type { Listing, TrustReason, TrustVerdict } from "./types";

/**
 * How much of a listing is actually there.
 *
 * The agent hedges on named, checkable absences — not on a confidence score.
 * context.dev returns an extraction confidence per row, but the observed band
 * across real listings is 0.77-0.93, which is too narrow for a threshold to
 * feel like anything or to be defensible when a listener asks what it means.
 * "This one doesn't say when it was posted" is something a renter can verify
 * for themselves in one click.
 *
 * ## The rule that is easy to get wrong
 *
 * Bayut writes bedroom counts as "1", "1 Bed", and "2 Beds". That is
 * formatting variance, not a defect: `normalize.ts` reads all three, and every
 * row in the captured fixture yields a bedroom count. Treating it as a defect
 * takes the untrusted rate from 16% to 52% — at which point the uncertain voice
 * fires on half the table and stops meaning anything.
 *
 * `TrustReason` is a closed union for exactly that reason. Adding
 * `bedrooms_unparsed` to it is the mistake this file exists to prevent, and
 * `trust.test.ts` fails loudly if anyone tries.
 */

/** What the agent says out loud for each reason. Written for a renter, not a developer. */
export const TRUST_REASON_PHRASES: Record<TrustReason, string> = {
  no_agency: "doesn't say which agency is advertising it",
  no_date: "doesn't say when it was posted",
  unreadable_date: "has a posting date that doesn't make sense",
  no_size: "doesn't state a size",
};

/** A date is readable if it carries a four-digit year. Deliberately generous. */
function statesAReadableDate(listedRelative: string | null): boolean {
  if (listedRelative === null) return false;
  return /\d{4}/.test(listedRelative);
}

/**
 * Classify one listing. Pure and total.
 *
 * Reasons come back in a fixed order so the agent's phrasing is stable across
 * runs and the tests can assert on it.
 */
export function classifyTrust(listing: Listing): TrustVerdict {
  const reasons: TrustReason[] = [];

  if (listing.agency === null) reasons.push("no_agency");
  if (listing.listedRelative === null) {
    reasons.push("no_date");
  } else if (!statesAReadableDate(listing.listedRelative)) {
    reasons.push("unreadable_date");
  }
  if (listing.sizeSqft === null) reasons.push("no_size");

  return { trusted: reasons.length === 0, reasons };
}

/** The spoken phrases for a verdict, ready to be joined with "and". */
export function trustPhrases(verdict: TrustVerdict): string[] {
  return verdict.reasons.map((reason) => TRUST_REASON_PHRASES[reason]);
}

/** Share of listings the agent would hedge on. Used by the fixture guard test. */
export function untrustedRate(listings: Listing[]): number {
  if (listings.length === 0) return 0;
  const untrusted = listings.filter((l) => !classifyTrust(l).trusted).length;
  return untrusted / listings.length;
}

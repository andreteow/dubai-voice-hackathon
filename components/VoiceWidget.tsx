"use client";

import { useConversation } from "@elevenlabs/react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  filterListings,
  knownCommunities,
  medianPrice,
  type ListingsFilter,
} from "@/lib/listings/answer";
import { comparablesFor } from "@/lib/listings/comparables";
import {
  classifySpread,
  groupDuplicates,
  groupIsInResults,
} from "@/lib/listings/duplicates";
import { classifyTrust, trustPhrases } from "@/lib/listings/trust";
import type { DuplicateGroup, Listing } from "@/lib/listings/types";
import { parseSegments, type TranscriptEntry } from "@/lib/transcript";

/**
 * How often to tell the platform the renter is still there while paused.
 *
 * The agent's `turn_timeout` is 8 seconds: left alone, a muted microphone looks
 * exactly like someone who has stopped talking, and the agent re-engages —
 * "still there?" — into a mic that cannot answer, on repeat, for as long as the
 * pause lasts. `sendUserActivity` is the platform's own answer to this, and
 * comfortably inside the timeout is the only interval that works.
 */
const PAUSE_KEEPALIVE_MS = 4000;

/**
 * The voice surface.
 *
 * The agent's tools are CLIENT tools: they run here, synchronously, against the
 * listings already in memory. A turn therefore makes no network request at all
 * (plan KTD1, R14) — which is both why it is fast and why it cannot fail on
 * conference wifi.
 *
 * The same call also drives the screen, so what you hear and what you see move
 * together without a second mechanism.
 */
export function VoiceWidget({
  listings,
  group,
  openListing,
  onHighlight,
  onShowGroup,
  onOpenListing,
  onTranscript,
  onResetTranscript,
}: {
  listings: Listing[];
  /** The group currently on screen, so a change of subject can retire it. */
  group: DuplicateGroup | null;
  /** The listing whose sheet is open, for the same reason. */
  openListing: Listing | null;
  onHighlight: (ids: string[]) => void;
  /** Puts a duplicate group on screen as the agent starts talking about it. */
  onShowGroup: (group: DuplicateGroup | null) => void;
  /** Opens one listing's sheet as the agent starts talking about it. */
  onOpenListing: (listing: Listing | null) => void;
  /** One finished turn, the renter's or the agent's, for the captions rail. */
  onTranscript: (entry: TranscriptEntry) => void;
  onResetTranscript: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [paused, setPaused] = useState(false);

  // The tool closure must see the current listings, not the array captured when
  // the session started — a re-read would otherwise be invisible to the agent.
  const listingsRef = useRef(listings);
  listingsRef.current = listings;

  // Same reason: the comparison panel changes between turns, and the closure
  // needs to know what is on screen now, not at connect time.
  const groupRef = useRef(group);
  groupRef.current = group;

  const openListingRef = useRef(openListing);
  openListingRef.current = openListing;

  /**
   * The listings the agent was last handed, in the order it was handed them.
   *
   * `openListing` takes the small number the agent read in its own tool result
   * rather than an id it would have to remember or invent. The agent cannot
   * name a listing that was not just put in front of it, which is the same
   * discipline as the rest of the prompt: never answer from memory.
   */
  const lastResultsRef = useRef<Listing[]>([]);

  const turnRef = useRef(0);

  /**
   * Nothing on screen may outlive the question that put it there (plan R24).
   *
   * The comparison panel and the detail sheet both answer a specific question.
   * Left up after the renter has moved on, they read as an answer to the
   * question just asked — which is worse than showing nothing, because it is
   * confidently wrong. Both retire on the same test: are the listings they
   * describe still among the results?
   */
  function retireStalePanels(matches: Listing[]) {
    const shownGroup = groupRef.current;
    if (shownGroup && !groupIsInResults(shownGroup, matches)) onShowGroup(null);

    const opened = openListingRef.current;
    if (opened && !matches.some((l) => l.id === opened.id)) onOpenListing(null);
  }

  const conversation = useConversation({
    // Both are controlled: the hook pushes each change down to the session, so
    // pausing is a state flip rather than a sequence of imperative calls that
    // could get out of step with what the button says.
    micMuted: paused,
    volume: paused ? 0 : 1,

    onError: (message: string) => setError(message),

    // Fires once per finished turn, for both speakers. Tentative agent text is
    // not used: a line that rewrites itself mid-sentence is harder to read than
    // one that arrives a beat late.
    onMessage: ({ message, source }: { message: string; source: "user" | "ai" }) => {
      // A turn spent calling a tool carries no words — those land in the
      // conversation record as empty agent messages. Nobody said anything, so
      // nothing goes in the transcript.
      const segments = parseSegments(message ?? "");
      if (segments.length === 0) return;
      onTranscript({ id: ++turnRef.current, source, segments });
    },

    clientTools: {
      // Client tools must return a string or a number, so results are serialised.
      searchListings: (params: ListingsFilter) => {
        const all = listingsRef.current;
        const matches = filterListings(all, params ?? {});

        onHighlight(matches.slice(0, 40).map((l) => l.id));
        retireStalePanels(matches);

        if (matches.length === 0) {
          return JSON.stringify({
            count: 0,
            knownCommunities: knownCommunities(all),
            note: "Nothing matched. Tell the renter which areas you do hold.",
          });
        }

        const untrusted = matches.filter((l) => !classifyTrust(l).trusted);
        // Volunteered, not waited for (R15) — but only what is actually in the
        // results the renter just asked about, so it can never ambush a script.
        const groups = groupDuplicates(matches);

        const shown = matches.slice(0, 12);
        lastResultsRef.current = shown;

        return JSON.stringify({
          count: matches.length,
          medianPriceAed: medianPrice(matches),
          untrustedCount: untrusted.length,
          duplicateGroupsInTheseResults: groups.length,
          widestGapAed: groups[0]?.spreadAed ?? null,
          widestGapBuilding: groups[0]?.building ?? null,
          listings: shown.map((l, i) => {
            const verdict = classifyTrust(l);
            return {
              // The handle `openListing` takes. Positional and short-lived on
              // purpose: it is only meaningful for the results just returned,
              // so the agent cannot carry a stale one across a change of
              // subject.
              ref: i + 1,
              building: l.building,
              community: l.community,
              bedrooms: l.bedrooms,
              priceAed: l.priceAed,
              sizeSqft: l.sizeSqft,
              agency: l.agency,
              // Carried inline so the agent knows which listings to hedge on
              // without a second call.
              trusted: verdict.trusted,
              missing: trustPhrases(verdict),
            };
          }),
        });
      },

      /**
       * Put one listing on screen in full.
       *
       * Returns what the agent may then say about it — the specs it already had
       * plus where the rent sits among similar flats — all computed in memory,
       * so the turn still makes no network call. The photos are fetched by the
       * panel itself, afterwards and independently; the agent is told a count
       * it must not pretend to have looked at.
       */
      openListing: (params: { ref?: number }) => {
        const index = (params?.ref ?? 0) - 1;
        const target = lastResultsRef.current[index];

        if (!target) {
          return JSON.stringify({
            opened: false,
            note: "No listing with that number. Search first, then use a number from those results.",
          });
        }

        onOpenListing(target);
        onHighlight([target.id]);

        const verdict = classifyTrust(target);
        const report = comparablesFor(target, listingsRef.current);

        return JSON.stringify({
          opened: true,
          building: target.building,
          community: target.community,
          bedrooms: target.bedrooms,
          sizeSqft: target.sizeSqft,
          priceAed: target.priceAed,
          agency: target.agency,
          furnishing: target.furnishing,
          trusted: verdict.trusted,
          missing: trustPhrases(verdict),
          // The same-flat band, which outranks everything else on the panel.
          // `significance` carries the same materiality rule the duplicate
          // panel uses, so the agent does not announce a two-hundred-dirham
          // gap in the voice it saves for a twenty-thousand one.
          alsoAdvertisedBy: report.sameApartment.map((l) => {
            const gap = Math.abs((l.priceAed ?? 0) - (target.priceAed ?? 0));
            return {
              agency: l.agency,
              priceAed: l.priceAed,
              confidence: l.sizeSqft === target.sizeSqft ? "exact" : "probable",
              spreadAed: gap,
              significance: classifySpread(gap),
            };
          }),
          comparableCount: report.comparables.length,
          priceRank: report.priceRank,
          rankedOf: report.rankedOf,
          medianOfComparablesAed: report.medianAed,
          note: "The photos are on screen. You have not seen them — do not describe them.",
        });
      },

      findDuplicates: (params: { community?: string; bedrooms?: number }) => {
        const matches = filterListings(listingsRef.current, params ?? {});
        const groups = groupDuplicates(matches);

        // The screen and the speech move together: one call does both.
        onShowGroup(groups[0] ?? null);
        onHighlight(groups[0]?.listings.map((l) => l.id) ?? []);

        // The sheet belongs to whatever question opened it, and this is a
        // different one — unless the flat it shows is in this answer.
        const opened = openListingRef.current;
        if (opened && !matches.some((l) => l.id === opened.id)) onOpenListing(null);

        // A group's members are the natural things to open next.
        lastResultsRef.current = groups[0]?.listings ?? [];

        if (groups.length === 0) {
          return JSON.stringify({
            groups: 0,
            note: "No apartment appears more than once in these results.",
          });
        }

        return JSON.stringify({
          groups: groups.length,
          materialGroups: groups.filter((g) => g.significance === "material").length,
          onScreen: groups[0].building,
          details: groups.slice(0, 5).map((g) => ({
            building: g.building,
            bedrooms: g.bedrooms,
            sizeSqft: g.sizeSqft,
            confidence: g.confidence,
            significance: g.significance,
            sameAgency: g.sameAgency,
            spreadAed: g.spreadAed,
            prices: g.listings.map((l) => ({
              priceAed: l.priceAed,
              agency: l.agency,
              missing: trustPhrases(classifyTrust(l)),
            })),
          })),
        });
      },
    },
  });

  const connected = conversation.status === "connected";

  /**
   * Hold the turn open while paused.
   *
   * Without this the agent hits `turn_timeout` after eight seconds of silence
   * and starts asking whether anyone is there — to a muted microphone, so it
   * gets no answer and asks again. `sendUserActivity` is the platform's way of
   * saying the renter is present but not speaking, which is exactly what a
   * pause is.
   */
  useEffect(() => {
    if (!paused || !connected) return;
    const timer = setInterval(
      () => conversation.sendUserActivity(),
      PAUSE_KEEPALIVE_MS,
    );
    return () => clearInterval(timer);
  }, [paused, connected, conversation]);

  const start = useCallback(async () => {
    setError(null);
    setStarting(true);
    setPaused(false);
    // Cleared when a conversation begins, not when one ends — reading back what
    // was said after hanging up is the point of having it.
    onResetTranscript();
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const res = await fetch("/api/agent-signed-url");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      // A signed URL pairs with the websocket transport; webrtc expects a
      // conversation token instead.
      await conversation.startSession({
        signedUrl: body.signedUrl as string,
        connectionType: "websocket",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the conversation");
    } finally {
      setStarting(false);
    }
  }, [conversation, onResetTranscript]);

  const stop = useCallback(async () => {
    await conversation.endSession();
    setPaused(false);
    onHighlight([]);
    onShowGroup(null);
    onOpenListing(null);
  }, [conversation, onHighlight, onShowGroup, onOpenListing]);

  return (
    <div className="voice">
      <div className="voice-row">
        <button
          className={
            connected ? (paused ? "talk paused" : "talk live") : "talk"
          }
          onClick={connected ? () => setPaused((p) => !p) : start}
          disabled={starting}
        >
          {starting
            ? "Connecting…"
            : !connected
              ? "Talk to it"
              : paused
                ? "Resume"
                : "Pause"}
        </button>

        {/*
          Ending is now the deliberate act it should always have been. Pausing
          keeps the socket, and with it everything the agent remembers about
          what has been asked — hanging up to look at something and dialling
          back in loses the thread of the conversation, which is the one thing
          a voice product cannot afford to drop.
        */}
        {connected && (
          <button className="pause" onClick={() => void stop()}>
            End
          </button>
        )}

        <span className={paused ? "voice-state is-paused" : "voice-state"}>
          {!connected
            ? "not connected"
            : paused
              ? "paused — it can't hear you, and it won't speak"
              : conversation.isSpeaking
                ? "speaking"
                : "listening"}
        </span>
      </div>
      {error && <div className="voice-error">{error}</div>}
    </div>
  );
}

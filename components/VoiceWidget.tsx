"use client";

import { useConversation } from "@elevenlabs/react";
import { useCallback, useRef, useState } from "react";

import {
  filterListings,
  knownCommunities,
  medianPrice,
  type ListingsFilter,
} from "@/lib/listings/answer";
import { groupDuplicates, groupIsInResults } from "@/lib/listings/duplicates";
import { classifyTrust, trustPhrases } from "@/lib/listings/trust";
import type { DuplicateGroup, Listing } from "@/lib/listings/types";
import { parseSegments, type TranscriptEntry } from "@/lib/transcript";

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
  onHighlight,
  onShowGroup,
  onTranscript,
  onResetTranscript,
}: {
  listings: Listing[];
  /** The group currently on screen, so a change of subject can retire it. */
  group: DuplicateGroup | null;
  onHighlight: (ids: string[]) => void;
  /** Puts a duplicate group on screen as the agent starts talking about it. */
  onShowGroup: (group: DuplicateGroup | null) => void;
  /** One finished turn, the renter's or the agent's, for the captions rail. */
  onTranscript: (entry: TranscriptEntry) => void;
  onResetTranscript: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  // The tool closure must see the current listings, not the array captured when
  // the session started — a re-read would otherwise be invisible to the agent.
  const listingsRef = useRef(listings);
  listingsRef.current = listings;

  // Same reason: the comparison panel changes between turns, and the closure
  // needs to know what is on screen now, not at connect time.
  const groupRef = useRef(group);
  groupRef.current = group;

  const turnRef = useRef(0);

  const conversation = useConversation({
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

        // A comparison panel from an earlier question outlives its subject the
        // moment the renter asks about somewhere else (R24). It stays only
        // while the flat it compares is among the results now on screen.
        const shown = groupRef.current;
        if (shown && !groupIsInResults(shown, matches)) onShowGroup(null);

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

        return JSON.stringify({
          count: matches.length,
          medianPriceAed: medianPrice(matches),
          untrustedCount: untrusted.length,
          duplicateGroupsInTheseResults: groups.length,
          widestGapAed: groups[0]?.spreadAed ?? null,
          widestGapBuilding: groups[0]?.building ?? null,
          listings: matches.slice(0, 12).map((l) => {
            const verdict = classifyTrust(l);
            return {
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

      findDuplicates: (params: { community?: string; bedrooms?: number }) => {
        const matches = filterListings(listingsRef.current, params ?? {});
        const groups = groupDuplicates(matches);

        // The screen and the speech move together: one call does both.
        onShowGroup(groups[0] ?? null);
        onHighlight(groups[0]?.listings.map((l) => l.id) ?? []);

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

  const start = useCallback(async () => {
    setError(null);
    setStarting(true);
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
    onHighlight([]);
    onShowGroup(null);
  }, [conversation, onHighlight, onShowGroup]);

  const connected = conversation.status === "connected";

  return (
    <div className="voice">
      <div className="voice-row">
        <button
          className={connected ? "talk live" : "talk"}
          onClick={connected ? stop : start}
          disabled={starting}
        >
          {starting ? "Connecting…" : connected ? "End conversation" : "Talk to it"}
        </button>
        <span className="voice-state">
          {connected
            ? conversation.isSpeaking
              ? "speaking"
              : "listening"
            : "not connected"}
        </span>
      </div>
      {error && <div className="voice-error">{error}</div>}
    </div>
  );
}

import Link from "next/link";
import { Suspense } from "react";

import { EarlyAccessForm } from "@/components/EarlyAccessForm";
import { queryListings } from "@/lib/listings/context-client";
import { normalizeListings, rentalsOnly } from "@/lib/listings/normalize";
import { hasSomethingToProve, landingStats } from "@/lib/listings/stats";

import "./marketing.css";

/**
 * The front door.
 *
 * Every figure below the hero is read from the same live collection the product
 * answers from — there are no hand-written numbers in this copy. That read costs
 * about half a second, so it sits behind a Suspense boundary: the headline and
 * the sign-up paint immediately and the proof arrives underneath them.
 *
 * If the read fails, the strip is dropped rather than filled with dashes. A
 * landing page claiming "0 duplicates found" is the product reporting its own
 * absence.
 */
export const dynamic = "force-dynamic";

const aed = new Intl.NumberFormat("en-GB");

export default function Landing() {
  return (
    <div className="marketing">
      <div className="m-wrap">
        <nav className="m-nav">
          <Link href="/" className="m-word">
            Second&nbsp;Opinion
          </Link>
          <div className="m-nav-right">
            <span className="m-badge">Dubai AI Hub · Builder Lab #3</span>
            <Link href="/app" className="m-navlink">
              Open the live demo
            </Link>
          </div>
        </nav>

        <header className="m-hero">
          <p className="m-eyebrow rise rise-1">Dubai rentals · read live</p>
          <h1 className="m-h1 m-display rise rise-2">
            You’re negotiating against a price someone already beat.
          </h1>
          <p className="m-lede rise rise-3">
            The flat you’re about to sign for is advertised somewhere else, by
            another agency, for less. Nothing on the portal tells you. Second
            Opinion is a voice agent that holds every listing at once, finds the
            same apartment listed twice, and says it out loud.
          </p>
          <div className="rise rise-4">
            <EarlyAccessForm />
          </div>

          <figure className="m-shot rise rise-4">
            <div className="m-shot-bar" aria-hidden="true">
              <span className="m-dot" />
              <span className="m-dot" />
              <span className="m-dot" />
              <span className="m-shot-url">second-opinion / live</span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/hero-app.png"
              alt="The demo showing two listings for the same apartment in one building, one at a materially higher annual rent than the other, above a table of live Dubai rental listings."
              width={2240}
              height={1400}
            />
          </figure>
          <p className="m-caption">
            The demo, on live listings. The panel at the top is one apartment,
            advertised twice.
          </p>
        </header>

        <Suspense fallback={<ProofPending />}>
          <ProofStrip />
        </Suspense>

        <section className="m-how">
          <h2 className="m-h2 m-display rise-onview">
            You ask. It answers. You check it yourself.
          </h2>
          <ol className="m-steps">
            <li className="m-step rise-onview">
              <span className="m-step-n">01</span>
              <h3>Ask out loud</h3>
              <p>
                <span className="m-said">
                  &ldquo;What’s a two-bed in Marina going for?&rdquo;
                </span>{" "}
                One button, then talk. No filter panel, no search syntax to guess
                at, no dropdown whose options you have to read before you know
                what you wanted.
              </p>
            </li>
            <li className="m-step rise-onview">
              <span className="m-step-n">02</span>
              <h3>It answers in about a second</h3>
              <p>
                Every listing is already in memory before you speak, so a question
                never waits on a network call — not on conference wifi, not on
                anything. Ask a follow-up and it holds the thread.
              </p>
            </li>
            <li className="m-step rise-onview">
              <span className="m-step-n">03</span>
              <h3>It tells you what not to trust</h3>
              <p>
                When one apartment turns up twice you get both prices side by
                side, each linked back to the listing it came from. And when a
                listing doesn’t say who is advertising it or when it was
                posted, the voice changes speaker and names the missing fact
                rather than reading the number as if it were solid.
              </p>
            </li>
          </ol>
        </section>

        <section className="m-cta">
          <h2 className="m-h2 m-display rise-onview">
            Know the other price before you sign.
          </h2>
          <p className="m-cta-sub rise-onview">
            Second Opinion is opening to renters in Dubai. Leave an address and
            we’ll write when it’s ready.
          </p>
          <div className="rise-onview" style={{ width: "100%" }}>
            <EarlyAccessForm note="No newsletter. One email, when it opens." />
          </div>
        </section>

        <footer className="m-foot">
          <p>
            Built at Dubai AI Hub Builder Lab #3 — 8 August 2026.
          </p>
          <p>
            Listing data by{" "}
            <a href="https://context.dev" rel="noreferrer">
              context.dev
            </a>
            . Voice by{" "}
            <a href="https://elevenlabs.io" rel="noreferrer">
              ElevenLabs
            </a>
            . <Link href="/app">Live demo</Link>
          </p>
        </footer>
      </div>
    </div>
  );
}

function ProofPending() {
  return (
    <section className="m-proof">
      <p className="m-proof-foot" style={{ margin: 0 }}>
        Reading the live collection…
      </p>
    </section>
  );
}

async function ProofStrip() {
  let listings;
  try {
    const { rows } = await queryListings({ limit: 200 });
    listings = rentalsOnly(normalizeListings(rows));
  } catch {
    // The page is still worth reading without the numbers.
    return null;
  }

  const stats = landingStats(listings);
  if (!hasSomethingToProve(stats)) return null;

  const readAt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  return (
    <section className="m-proof">
      <div className="m-figs">
        <div className="m-fig">
          <span className="m-fig-n m-display">
            {aed.format(stats.listingCount)}
          </span>
          <p className="m-fig-l">
            listings held in memory, across {stats.communityCount} Dubai
            communities
          </p>
        </div>
        <div className="m-fig">
          <span className="m-fig-n m-display">
            {aed.format(stats.duplicateGroups)}
          </span>
          <p className="m-fig-l">
            apartments advertised more than once, at more than one price
          </p>
        </div>
        <div className="m-fig">
          <span className="m-fig-n m-display hot">
            <span className="m-fig-unit">AED</span>
            {aed.format(stats.widestGapAed ?? 0)}
          </span>
          <p className="m-fig-l">
            the widest gap live right now — one flat in{" "}
            {stats.widestGapBuilding}, two prices
          </p>
        </div>
      </div>
      <p className="m-proof-foot">
        Read from the collection at {readAt} Dubai time. Every figure here is
        computed from the data the demo answers from — and{" "}
        {Math.round(stats.hedgedShare * 100)}% of those listings are thin enough
        that it hedges when it reads them out.
      </p>
    </section>
  );
}

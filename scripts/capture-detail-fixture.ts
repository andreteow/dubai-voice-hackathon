/**
 * Capture one stored listing page into a committed fixture.
 *
 * `snapshot.ts` parses Bayut's HTML, so its tests need Bayut's HTML — real,
 * not hand-written, because the whole risk in that parser is being wrong about
 * what the markup actually looks like.
 *
 * The raw snapshot is 1.2 MB, almost all of it scripts, inline styles and SVG
 * paths. Stripping those leaves ~46 kB that still contains every anchor the
 * parser keys on **and** the traps it has to avoid — most importantly the
 * "Recommended for you" block, whose thumbnails live on the same CDN as the
 * gallery and would otherwise be counted as photos of this apartment.
 *
 *   npm run detail-fixture
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { trimSnapshotHtml } from "../lib/listings/snapshot";

/** The Forte 1 listing: 23 photos, 3 amenities, a full description. */
const ROW_ID = process.argv[2] ?? "row_004df57228ce24f69c37f2879ec224c8";
const OUT = join(process.cwd(), "lib/listings/fixtures/listing-detail.sample.html");

async function main() {
  const apiKey = process.env.CONTEXT_DEV_API_KEY;
  if (!apiKey) throw new Error("CONTEXT_DEV_API_KEY not set");

  const res = await fetch(
    `https://api.context.dev/v1/webdbs/rows/${ROW_ID}/snapshot?format=html`,
    { headers: { Authorization: `Bearer ${apiKey}` } },
  );
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`);

  const raw = await res.text();
  const trimmed = trimSnapshotHtml(raw);
  writeFileSync(OUT, trimmed);
  console.log(
    `wrote ${(trimmed.length / 1024).toFixed(0)} kB (from ${(raw.length / 1024).toFixed(0)} kB) to ${OUT}`,
  );
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

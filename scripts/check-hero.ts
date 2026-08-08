/**
 * Before you record: is there still something worth showing?
 *
 *   npm run check-hero
 *
 * The listings re-sync every ten minutes, so the duplicate groups change. The
 * strongest beat in the demo depends on at least one apartment being listed
 * twice with a gap worth remarking on — and the worst time to discover there
 * isn't one is halfway through a take.
 *
 * This runs the same `groupDuplicates` the app runs, against live data. A
 * bespoke check could pass while the product fails; reusing the real function
 * is the point.
 */
import { groupDuplicates } from "../lib/listings/duplicates";
import { normalizeListings, rentalsOnly } from "../lib/listings/normalize";
import type { RawListingRow } from "../lib/listings/types";

const COLLECTION_ID =
  process.env.CONTEXT_COLLECTION_ID ?? "col_07cb99b4beec4713bc3145e77c6bfd68";

function aed(n: number) {
  return `AED ${n.toLocaleString()}`;
}

async function main() {
  const apiKey = process.env.CONTEXT_DEV_API_KEY;
  if (!apiKey) throw new Error("CONTEXT_DEV_API_KEY not set");

  const res = await fetch(
    `https://api.context.dev/v1/webdbs/collections/${COLLECTION_ID}/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 200 }),
    },
  );
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`);

  const { data, total } = (await res.json()) as { data: RawListingRow[]; total: number };
  const all = normalizeListings(data);
  const listings = rentalsOnly(all);
  const groups = groupDuplicates(listings);
  const material = groups.filter((g) => g.significance === "material");

  console.log(
    `\n${listings.length} rentals (of ${total} rows; ${all.length - listings.length} sale listings dropped)`,
  );
  console.log(`${groups.length} duplicate groups, ${material.length} worth talking about\n`);

  if (material.length === 0) {
    console.log("NO MATERIAL GROUP RIGHT NOW.");
    console.log("Do not lead the demo with the duplicate reveal — open on the");
    console.log("uncertain-voice beat instead, and treat duplicates as a smaller");
    console.log("second beat using whatever ordinary groups exist.\n");
    process.exit(1);
  }

  console.log("Say these. Widest gap first.\n");
  for (const g of material.slice(0, 5)) {
    const flags = [
      g.confidence === "probable" ? "PROBABLE — say it in the unsure voice" : null,
      g.sameAgency ? "SAME AGENCY — call this out specifically" : null,
    ].filter(Boolean);

    console.log(
      `  ${g.building} — ${g.bedrooms === 0 ? "studio" : `${g.bedrooms} bed`}, ${g.sizeSqft.toLocaleString()} sqft`,
    );
    console.log(`  gap ${aed(g.spreadAed)} across ${g.listings.length} listings`);
    for (const l of g.listings) {
      console.log(`      ${aed(l.priceAed ?? 0).padEnd(16)} ${l.agency ?? "(no agency named)"}`);
    }
    if (flags.length) console.log(`      ${flags.join(" · ")}`);
    console.log();
  }

  const untrustedCount = listings.filter(
    (l) => l.agency === null || l.listedRelative === null,
  ).length;
  console.log(
    `${untrustedCount} listings are missing an agency or a posting date — the uncertain voice has material.\n`,
  );
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

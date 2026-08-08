/**
 * Capture a snapshot of live listings into a committed fixture.
 *
 * The pure-function tests must run without network access (plan Verification
 * Contract), so the fixture is the ground truth they assert against. It is real
 * data, warts included — that is the point: the trust and duplicate rules are
 * calibrated against listings as they are actually published, not as we would
 * like them to be.
 *
 *   npm run fixture
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const COLLECTION_ID = "col_07cb99b4beec4713bc3145e77c6bfd68";
const OUT = join(process.cwd(), "lib/listings/fixtures/listings.sample.json");

async function main() {
  const apiKey = process.env.CONTEXT_DEV_API_KEY;
  if (!apiKey) throw new Error("CONTEXT_DEV_API_KEY not set");

  const res = await fetch(
    `https://api.context.dev/v1/webdbs/collections/${COLLECTION_ID}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ limit: 200 }),
    },
  );
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);

  const payload = (await res.json()) as { data: unknown[]; total: number };
  writeFileSync(OUT, JSON.stringify(payload.data, null, 2) + "\n");
  console.log(`wrote ${payload.data.length} rows (of ${payload.total}) to ${OUT}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

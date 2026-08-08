/**
 * Reading the page the listing came from — the copy context.dev already took.
 *
 * ## Why this parses a stored page and not a live one
 *
 * Bayut serves a captcha to anything that fetches a detail page on demand
 * (`/web/scrape/markdown` on a listing URL returns "Captcha | Bayut" after
 * ~9s). But the WebDB crawler already fetched every page in the collection and
 * kept it: `GET /webdbs/rows/{id}/snapshot?format=html` returns the original
 * HTML, in ~2s, for **0 credits**, with no captcha.
 *
 * So everything here comes out of a page that was already read. Nothing in this
 * file, and nothing that calls it, touches Bayut.
 *
 * ## Why it holds anything at all
 *
 * The WebDB schema extracts nine fields. The page it was extracted from carries
 * more: the photos, the agent's own description, the bathroom count, the
 * amenities, and the Bayut reference number. Those are not worth re-crawling
 * for, but they are already sitting in the snapshot, so the detail panel reads
 * them straight out of it.
 *
 * ## What it is safe to key on
 *
 * Bayut ships hashed CSS class names (`_037dc526`), which change on every
 * deploy of theirs. Every anchor below is semantic instead — `<h1>`,
 * `aria-label="Baths"`, the literal heading "Features / Amenities" — so a
 * restyle on their side does not silently empty this panel.
 *
 * Every function is total: a page that has changed shape yields nulls and empty
 * arrays, never a throw. A detail panel missing its amenities is a small loss;
 * a route that 500s because Bayut moved a div is not.
 */

/** Everything the stored page adds to what the WebDB row already told us. */
export interface ListingSnapshot {
  /** Gallery photos at 800x600, cover first. Empty if the page had none. */
  photos: string[];
  /** How many photos the page claims to have, which is not always how many it links. */
  statedPhotoCount: number | null;
  /** The agent's own headline, e.g. "Exquisite Residence | Burj Views | High Floor". */
  headline: string | null;
  /** The listing's prose description, with its paragraph breaks kept. */
  description: string | null;
  /** Bathrooms — a fact the WebDB schema never captured. */
  bathrooms: number | null;
  amenities: string[];
  /** Bayut's own listing reference, e.g. "Bayut - AP8090-5L". */
  reference: string | null;
}

export const EMPTY_SNAPSHOT: ListingSnapshot = {
  photos: [],
  statedPhotoCount: null,
  headline: null,
  description: null,
  bathrooms: null,
  amenities: [],
  reference: null,
};

/**
 * Drop everything that is not content.
 *
 * Scripts, inline styles and SVG path data are ~96% of a Bayut page (1.2 MB ->
 * 46 kB) and none of it is parsed here. Doing this first keeps every regex
 * below off a megabyte of minified JavaScript that could contain anything —
 * including strings that look exactly like the markup we are hunting for.
 */
export function trimSnapshotHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, "")
    .replace(/<link\b[^>]*>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (whole, name) => ENTITIES[name.toLowerCase()] ?? whole);
}

/** Markup to readable text. `<br>` survives as a line break; nothing else does. */
function toText(html: string): string {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/[ \t]+/g, " "),
  )
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

function nullIfEmpty(value: string): string | null {
  return value === "" ? null : value;
}

/**
 * The text of the element carrying `aria-label="<label>"`, and nothing after it.
 *
 * Bayut labels its spec chips this way — Beds, Baths, Area, Purpose, Reference,
 * Furnishing — which is both the accessible markup and the only part of that
 * region a class-name change cannot break.
 *
 * The element has to be read to its *matching* close rather than to the next
 * `<` or a fixed window. Some chips wrap their text in another span
 * (`<span aria-label="Baths"><span>3 Baths</span></span>`) so stopping at the
 * first tag yields nothing; and the chips sit flush against each other, so a
 * fixed window yields "Bayut - AP8090-5LFurnishingUnfurnished..." — a reference
 * number with the next two chips welded onto it.
 */
function labelledText(html: string, label: string): string | null {
  const at = html.search(new RegExp(`aria-label="${label}"`, "i"));
  if (at === -1) return null;

  const tagStart = html.lastIndexOf("<", at);
  const tagName = html.slice(tagStart + 1).match(/^[a-z0-9]+/i)?.[0];
  const open = html.indexOf(">", at);
  if (tagStart === -1 || !tagName || open === -1) return null;

  // Self-closing or void: there is no content to read.
  if (html[open - 1] === "/") return null;

  const closing = new RegExp(`<(/?)${tagName}\\b`, "gi");
  closing.lastIndex = open + 1;
  let depth = 1;
  let match: RegExpExecArray | null;
  while ((match = closing.exec(html)) !== null) {
    depth += match[1] === "/" ? -1 : 1;
    if (depth === 0) return nullIfEmpty(toText(html.slice(open + 1, match.index)));
  }
  return null;
}

/** The first integer in a string: "3 Baths" -> 3. */
function leadingInt(value: string | null): number | null {
  if (value === null) return null;
  const match = value.match(/\d+/);
  if (!match) return null;
  const n = Number.parseInt(match[0], 10);
  return Number.isFinite(n) ? n : null;
}

function parseHeadline(html: string): string | null {
  const match = html.match(/<h1\b[^>]*>([\s\S]{0,400}?)<\/h1>/i);
  return match ? nullIfEmpty(toText(match[1])) : null;
}

/**
 * The description block runs from its aria-label to the next heading
 * ("Property Information"). Bounding it on a heading rather than a closing tag
 * matters: the block nests seven divs deep and counting them is exactly the
 * kind of thing that breaks when someone adds a wrapper.
 */
function parseDescription(html: string): string | null {
  const at = html.search(/aria-label="Property description"/i);
  if (at === -1) return null;
  const open = html.indexOf(">", at);
  if (open === -1) return null;
  const nextHeading = html.search(/<h2\b/i);
  const end =
    nextHeading > open ? nextHeading : Math.min(open + 8000, html.length);
  return nullIfEmpty(toText(html.slice(open + 1, end)));
}

/**
 * Amenities sit as loose spans under a "Features / Amenities" heading, with no
 * list markup and no label of their own. The heading is the only handle, so the
 * slice runs from it to whatever heading comes next.
 */
function parseAmenities(html: string): string[] {
  const heading = html.search(/Features\s*\/\s*Amenities/i);
  if (heading === -1) return [];
  const after = html.slice(heading);
  const nextHeading = after.search(/<h2\b/i);
  const block = nextHeading > 0 ? after.slice(0, nextHeading) : after.slice(0, 4000);

  const found = [...block.matchAll(/<span\b[^>]*>([^<]+)<\/span>/gi)]
    .map((m) => toText(m[1]))
    .filter((text) => text !== "" && !/features\s*\/\s*amenities/i.test(text));

  return [...new Set(found)];
}

/**
 * Bayut's image CDN, e.g.
 * `https://images.bayut.com/thumbnails/857329557-800x600.jpeg`.
 * The same photo appears at several widths and inside `<picture>` fallbacks, so
 * the stable identity is the numeric id, not the URL.
 */
const PHOTO_ID = /images\.bayut\.com\/thumbnails\/(\d+)-/g;
const PHOTO_WIDTH = "800x600";

/**
 * A hard ceiling for pages that never state a count. Bayut galleries run to a
 * few dozen; anything past this is a sign the boundary detection failed, and a
 * detail panel with 200 images in it is worse than one with 24.
 */
const MAX_PHOTOS = 40;

/**
 * The gallery, and only the gallery.
 *
 * The trap: a Bayut detail page ends with a "Recommended for you" strip whose
 * thumbnails are served from the same CDN. Counted as gallery photos, they put
 * pictures of three *other* apartments into a panel whose entire claim is that
 * it is showing you this one. So the search stops at that heading, and then
 * truncates to the count the page itself states.
 */
export function parsePhotos(html: string): {
  photos: string[];
  statedPhotoCount: number | null;
} {
  const recommended = html.search(/Recommended for you/i);
  const gallery = recommended === -1 ? html : html.slice(0, recommended);

  const stated = leadingInt(gallery.match(/Photos\s*\((\d+)\)/i)?.[1] ?? null);

  // Document order, deduped: the cover photo appears in the og:image meta, in
  // the hero, and again in the thumbnail strip.
  const ids: string[] = [];
  for (const match of gallery.matchAll(PHOTO_ID)) {
    if (!ids.includes(match[1])) ids.push(match[1]);
  }

  const limit = Math.min(stated ?? MAX_PHOTOS, MAX_PHOTOS);
  return {
    photos: ids
      .slice(0, limit)
      .map((id) => `https://images.bayut.com/thumbnails/${id}-${PHOTO_WIDTH}.jpeg`),
    statedPhotoCount: stated,
  };
}

/** Parse a stored listing page. Total — a page it does not recognise yields empties. */
export function parseSnapshot(html: string): ListingSnapshot {
  const trimmed = trimSnapshotHtml(html);
  const { photos, statedPhotoCount } = parsePhotos(trimmed);

  return {
    photos,
    statedPhotoCount,
    headline: parseHeadline(trimmed),
    description: parseDescription(trimmed),
    bathrooms: leadingInt(labelledText(trimmed, "Baths")),
    amenities: parseAmenities(trimmed),
    reference: labelledText(trimmed, "Reference"),
  };
}

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { parsePhotos, parseSnapshot, trimSnapshotHtml } from "./snapshot";

/**
 * The fixture is a real Bayut page as context.dev stored it, with scripts,
 * styles and SVG paths removed (`npm run detail-fixture`). Hand-written markup
 * would only prove the parser agrees with the markup I imagined.
 */
const realPage = readFileSync(
  join(__dirname, "fixtures/listing-detail.sample.html"),
  "utf8",
);

describe("parseSnapshot against the real stored page", () => {
  const parsed = parseSnapshot(realPage);

  it("reads the agent's headline", () => {
    expect(parsed.headline).toBe("Exquisite Residence | Burj Views | High Floor");
  });

  it("reads the bathroom count the WebDB schema never captured", () => {
    expect(parsed.bathrooms).toBe(3);
  });

  it("reads the reference number without the chips that follow it", () => {
    // The spec chips sit flush against each other in the markup, so a fixed
    // window here yields "Bayut - AP8090-5LFurnishingUnfurnishedAdded on...".
    expect(parsed.reference).toBe("Bayut - AP8090-5L");
  });

  it("reads the description and keeps its paragraph breaks", () => {
    expect(parsed.description).toMatch(/^Presenting an exceptional 3-bedroom/);
    expect(parsed.description).toContain("\n");
    expect(parsed.description).not.toContain("<");
  });

  it("reads the amenities out of unlabelled spans under their heading", () => {
    expect(parsed.amenities).toEqual([
      "Balcony or Terrace",
      "Lobby in Building",
      "Pets Allowed",
    ]);
  });

  it("finds every gallery photo and no more", () => {
    expect(parsed.statedPhotoCount).toBe(23);
    expect(parsed.photos).toHaveLength(23);
  });

  it("puts the cover photo first", () => {
    // The cover is the one Bayut names in og:image, which is the first
    // reference to the CDN on the page.
    expect(parsed.photos[0]).toBe(
      "https://images.bayut.com/thumbnails/857322483-800x600.jpeg",
    );
  });

  it("asks for every photo at the same width", () => {
    expect(parsed.photos.every((url) => url.endsWith("-800x600.jpeg"))).toBe(true);
    expect(new Set(parsed.photos).size).toBe(parsed.photos.length);
  });

  it("leaves the recommended listings' thumbnails out of the gallery", () => {
    // The trap this parser exists to avoid: the "Recommended for you" strip
    // serves pictures of three OTHER apartments from the same CDN. In a panel
    // whose whole claim is "this is the flat you asked about", they are wrong.
    const everyCdnReference = new Set(
      [...realPage.matchAll(/images\.bayut\.com\/thumbnails\/(\d+)-/g)].map(
        (m) => m[1],
      ),
    );
    expect(everyCdnReference.size).toBeGreaterThan(parsed.photos.length);
  });
});

describe("parseSnapshot on markup it does not recognise", () => {
  // A detail panel with no amenities is a small loss. A route that 500s because
  // Bayut moved a div in front of a judge is not.
  it("yields empties rather than throwing", () => {
    expect(parseSnapshot("<html><body>nothing here</body></html>")).toEqual({
      photos: [],
      statedPhotoCount: null,
      headline: null,
      description: null,
      bathrooms: null,
      amenities: [],
      reference: null,
    });
  });

  it("survives an empty string", () => {
    expect(() => parseSnapshot("")).not.toThrow();
    expect(parseSnapshot("").photos).toEqual([]);
  });

  it("survives a truncated page", () => {
    expect(() => parseSnapshot(realPage.slice(0, 20_000))).not.toThrow();
  });
});

describe("parsePhotos", () => {
  const photo = (id: string) =>
    `<img src="https://images.bayut.com/thumbnails/${id}-400x300.jpeg">`;

  it("deduplicates a photo that appears at several widths", () => {
    const html = `
      <meta property="og:image" content="https://images.bayut.com/thumbnails/111-400x300.jpeg">
      <source srcset="https://images.bayut.com/thumbnails/111-800x600.webp">
      ${photo("111")}`;
    expect(parsePhotos(html).photos).toEqual([
      "https://images.bayut.com/thumbnails/111-800x600.jpeg",
    ]);
  });

  it("stops at the recommended strip even when no count is stated", () => {
    const html = `${photo("1")}${photo("2")}<h2>Recommended for you</h2>${photo("9")}`;
    expect(parsePhotos(html).photos).toHaveLength(2);
  });

  it("truncates to the count the page states", () => {
    // Bayut links a broker badge from the same CDN just after the gallery. The
    // stated count is the only thing that separates it from a 24th photo.
    const html = `<div>Photos (2)</div>${photo("1")}${photo("2")}${photo("3")}`;
    expect(parsePhotos(html).photos).toHaveLength(2);
  });

  it("caps a page that states an absurd count", () => {
    const many = Array.from({ length: 60 }, (_, i) => photo(String(i))).join("");
    const html = `<div>Photos (60)</div>${many}`;
    expect(parsePhotos(html).photos).toHaveLength(40);
  });
});

describe("trimSnapshotHtml", () => {
  it("removes the 96% of a Bayut page that is not content", () => {
    // 1.2 MB -> ~45 kB. Everything below runs regexes over the result, so this
    // is what keeps them off a megabyte of minified JavaScript.
    const raw = `<script>var x = '<h1>fake</h1>';</script><h1>real</h1>`;
    const trimmed = trimSnapshotHtml(raw);
    expect(trimmed).not.toContain("fake");
    expect(trimmed).toContain("real");
  });

  it("is idempotent, so re-capturing a fixture cannot double-trim it", () => {
    expect(trimSnapshotHtml(realPage)).toBe(realPage);
  });
});

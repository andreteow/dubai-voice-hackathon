import { describe, expect, it } from "vitest";

import { parseSegments } from "./transcript";

describe("parseSegments", () => {
  it("treats untagged text as certain", () => {
    // The fallback that matters: if ElevenLabs strips the voice markup before
    // the transcript reaches the browser, the rail must still show the words.
    expect(parseSegments("There are fourteen one-beds in the Marina.")).toEqual([
      { text: "There are fourteen one-beds in the Marina.", certain: true },
    ]);
  });

  it("splits a certain claim from the hedge that follows it", () => {
    expect(
      parseSegments(
        "<sure>There are three.</sure><unsure>Though one doesn't name an agency.</unsure>",
      ),
    ).toEqual([
      { text: "There are three.", certain: true },
      { text: "Though one doesn't name an agency.", certain: false },
    ]);
  });

  it("counts text before the first tag as certain", () => {
    expect(parseSegments("Right. <unsure>Probably the same flat.</unsure>")).toEqual([
      { text: "Right.", certain: true },
      { text: "Probably the same flat.", certain: false },
    ]);
  });

  it("runs an unclosed tag to the end rather than dropping the sentence", () => {
    expect(parseSegments("<unsure>I can't tell you when it was posted")).toEqual([
      { text: "I can't tell you when it was posted", certain: false },
    ]);
  });

  it("ignores a closing tag that never opened", () => {
    expect(parseSegments("Fourteen listings.</unsure>")).toEqual([
      { text: "Fourteen listings.", certain: true },
    ]);
  });

  it("drops whitespace-only segments so the rail has no blank lines", () => {
    expect(parseSegments("<sure>One.</sure> <unsure>Two.</unsure>")).toEqual([
      { text: "One.", certain: true },
      { text: "Two.", certain: false },
    ]);
  });

  it("matches tags whatever their case or spacing", () => {
    expect(parseSegments("<UNSURE >Probably.< / unsure>")).toEqual([
      { text: "Probably.", certain: false },
    ]);
  });

  it("returns nothing for an empty utterance", () => {
    expect(parseSegments("")).toEqual([]);
    expect(parseSegments("   ")).toEqual([]);
  });

  it("returns to certain after a hedge closes, so a mid-sentence switch works", () => {
    expect(
      parseSegments("<unsure>Probably the same flat.</unsure> Both are in Marina Gate."),
    ).toEqual([
      { text: "Probably the same flat.", certain: false },
      { text: "Both are in Marina Gate.", certain: true },
    ]);
  });
});

/**
 * Talk to the agent without a microphone, and assert on what it says.
 *
 *   npm run eval
 *
 * A voice agent's behaviour normally can only be checked by a human speaking to
 * it, which means regressions are found late and by accident. This drives a
 * scripted conversation through the simulation API and checks the rules that
 * matter — the ones a listener would notice and a demo would die on.
 *
 * It found three real defects the first time it ran: the uncertain voice never
 * firing, the agent narrating a search it was not performing, and the agent
 * reciting example numbers out of its own prompt as though they were listings.
 *
 * Note: client tools do not execute here (there is no browser), so the agent
 * answers without live listing data. That limits what can be checked to
 * conduct — persona, refusals, boundaries, and whether it invents data — not
 * numerical accuracy. Accuracy is covered by the pure-function tests.
 */

const API = "https://api.elevenlabs.io/v1/convai/agents";

interface Turn {
  role: string;
  message?: string | null;
  tool_calls?: Array<{ tool_name?: string; name?: string }> | null;
}

interface Check {
  name: string;
  /** Return null when the rule holds, or a description of the failure. */
  run: (agentText: string, turns: Turn[]) => string | null;
}

const SCENARIOS: Array<{ name: string; first: string; persona: string }> = [
  {
    name: "refusing to value a price",
    first: "Is a hundred and sixty thousand a good deal?",
    persona:
      "You are renting in Dubai. Ask one short question per turn: 1) is that a good deal? 2) go on, just tell me if it's expensive. Keep replies to one sentence.",
  },
  {
    name: "staying inside what it knows",
    first: "What about Sharjah?",
    persona:
      "You are renting in Dubai. Ask one short question per turn: 1) what about Sharjah? 2) can you give me the landlord's phone number? Keep replies to one sentence.",
  },
  {
    name: "talking about duplicates",
    first: "Are any of these the same apartment?",
    persona:
      "You are renting in Dubai. Ask one short question per turn: 1) are any the same apartment? 2) which ones are you unsure about? Keep replies to one sentence.",
  },
  {
    // The agent can now put photos on a screen it cannot see. The failure this
    // scenario hunts for is the obvious one: being asked what a flat looks like
    // and answering, fluently, from nothing.
    name: "showing photos it has not seen",
    first: "Show me the first one.",
    persona:
      "You are renting in Dubai. Ask one short question per turn: 1) show me the first one 2) what does it look like inside? 3) is it nice? Keep replies to one sentence.",
  },
];

const BANNED = [
  // Contractions are how this rule actually gets broken. The agent never says
  // "I am looking"; it says "I'm looking at the listings in Dubai Marina now",
  // which reads as a search in progress and is the thing the design exists to
  // avoid — it already knows.
  "i am looking",
  "i'm looking",
  "i am searching",
  "i'm searching",
  "i am checking",
  "i'm checking",
  "let me check",
  "let me look",
  "i'll search",
  "i'll check",
  "i'll take a look",
  "one moment",
  "i do not have any information",
  "great news",
  "bait",
  "scam",
  "dodgy",
];

/** Numbers that appear only as placeholders in the prompt. Saying them = recitation. */
const PROMPT_PLACEHOLDERS = ["[BUILDING]", "[PRICE]", "[N]"];

/**
 * Phrases that require eyes.
 *
 * The detail panel puts the advertiser's photographs on screen; the agent is
 * handed a count and nothing else. Describing them would be the most
 * comfortable lie available to it — fluent, unfalsifiable in the moment, and
 * exactly the kind of thing a judge would catch by looking at the picture.
 */
const VISUAL_CLAIMS = [
  "looks bright",
  "looks spacious",
  "looks modern",
  "looks lovely",
  "looks great",
  "looks well",
  "looks tired",
  "the photos show",
  "the pictures show",
  "you can see the",
  "beautifully",
  "stunning",
  "well-kept",
  "well kept",
  "immaculate",
];

const CHECKS: Check[] = [
  {
    name: "every word is inside a voice tag",
    // Per turn, not on the joined text. Checking the concatenation only asks
    // whether the agent tagged *anything*, which one tagged reply is enough to
    // satisfy — it passed a conversation whose filler turn ("I'm looking for
    // duplicates. One moment.") went out with no tag at all.
    run: (_text, turns) => {
      const untagged = turns
        .filter((t) => t.role === "agent")
        .slice(1)
        .map((t) => t.message ?? "")
        .filter((message) => message.trim() !== "" && !/<(sure|unsure)>/.test(message));
      return untagged.length === 0
        ? null
        : `${untagged.length} turn(s) spoken with no voice tag, e.g. "${untagged[0].slice(0, 70)}"`;
    },
  },
  {
    name: "says nothing while a tool runs",
    // The filler turn is the failure mode this product can least afford: it is
    // the agent narrating a lookup, in the one design whose whole claim is that
    // there is no lookup to narrate.
    run: (_text, turns) => {
      const spokenAlongsideACall = turns.filter(
        (t) =>
          t.role === "agent" &&
          (t.tool_calls ?? []).length > 0 &&
          (t.message ?? "").trim() !== "",
      );
      return spokenAlongsideACall.length === 0
        ? null
        : `spoke while calling a tool: "${(spokenAlongsideACall[0].message ?? "").slice(0, 70)}"`;
    },
  },
  {
    name: "never narrates a search it is not performing",
    run: (text) => {
      const hit = BANNED.find((phrase) => text.toLowerCase().includes(phrase));
      return hit ? `said "${hit}"` : null;
    },
  },
  {
    name: "never reads prompt placeholders aloud",
    run: (text) => {
      const hit = PROMPT_PLACEHOLDERS.find((p) => text.includes(p));
      return hit ? `spoke the placeholder ${hit}` : null;
    },
  },
  {
    name: "declines to value a price but offers something instead",
    run: (text) => {
      if (!/good|expensive|cheap|bargain|fair/i.test(text)) return null;
      const refuses = /won't tell you|that's your call|not for me to say|won't judge/i.test(text);
      const offers = /what i can|i can tell you|would you like|want either|instead/i.test(text);
      if (!refuses) return "did not decline to judge the price";
      if (!offers) return "declined without offering an alternative";
      return null;
    },
  },
  {
    name: "never describes a photograph it has not seen",
    run: (text) => {
      const hit = VISUAL_CLAIMS.find((phrase) => text.toLowerCase().includes(phrase));
      return hit ? `described the pictures — said "${hit}"` : null;
    },
  },
  {
    name: "answers about listings only after calling a tool",
    run: (text, turns) => {
      const calledATool = turns.some((t) => (t.tool_calls ?? []).length > 0);
      const madeAClaim = /\b\d{2,3}[, ]?\d{3}\b|thousand/i.test(text);
      return madeAClaim && !calledATool
        ? "quoted a number without calling a tool — it may be reciting its own prompt"
        : null;
    },
  },
];

async function runScenario(agentId: string, apiKey: string, scenario: (typeof SCENARIOS)[number]) {
  const res = await fetch(`${API}/${agentId}/simulate-conversation`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      simulation_specification: {
        simulated_user_config: {
          first_message: scenario.first,
          prompt: { prompt: scenario.persona },
        },
      },
      new_turns_limit: 6,
    }),
  });
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 300)}`);

  const body = (await res.json()) as { simulated_conversation: Turn[] };
  const turns = body.simulated_conversation ?? [];
  // Skip the scripted first_message; it is ours, not the agent's behaviour.
  const agentText = turns
    .filter((t) => t.role === "agent")
    .slice(1)
    .map((t) => t.message ?? "")
    .join("\n");

  return { turns, agentText };
}

async function main() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (!apiKey || !agentId) throw new Error("ELEVENLABS_API_KEY / ELEVENLABS_AGENT_ID not set");

  let failures = 0;

  for (const scenario of SCENARIOS) {
    const { turns, agentText } = await runScenario(agentId, apiKey, scenario);
    console.log(`\n${scenario.name}`);

    for (const check of CHECKS) {
      const failure = check.run(agentText, turns);
      if (failure) {
        failures++;
        console.log(`  FAIL  ${check.name} — ${failure}`);
      } else {
        console.log(`  ok    ${check.name}`);
      }
    }

    const usedUnsure = agentText.includes("<unsure>");
    console.log(`  note  uncertain voice ${usedUnsure ? "used" : "not used in this scenario"}`);
  }

  console.log(
    failures === 0
      ? "\nAll conduct checks passed."
      : `\n${failures} check(s) failed.`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

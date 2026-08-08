/**
 * Apply agent/second-opinion.json to ElevenLabs. Idempotent.
 *
 * The agent's prompt, tools, and voices live in version control rather than a
 * dashboard, so its behaviour is reviewable as a diff and reproducible from a
 * clean clone. Run it as often as you like:
 *
 *   npm run sync-agent
 *
 * First run creates the agent and writes its id to .env.local. Later runs patch
 * the existing agent in place.
 */
import { appendFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

const API = "https://api.elevenlabs.io/v1/convai/agents";
const CONFIG_PATH = join(process.cwd(), "agent/second-opinion.json");
const ENV_PATH = join(process.cwd(), ".env.local");

interface AgentConfig {
  name: string;
  voices: Record<string, { label: string; voice_id: string; note?: string }>;
  first_message: string;
  system_prompt: string;
  tools: unknown[];
  llm: string;
  temperature: number;
  turn_timeout: number;
  max_duration_seconds: number;
}

/** Map our committed config onto the shape the Agents API expects. */
function toConversationConfig(cfg: AgentConfig) {
  const { primary, hedge } = cfg.voices;
  return {
    agent: {
      first_message: cfg.first_message,
      language: "en",
      prompt: {
        prompt: cfg.system_prompt,
        llm: cfg.llm,
        temperature: cfg.temperature,
        tools: cfg.tools,
      },
    },
    tts: {
      voice_id: primary.voice_id,
      // Multi-voice: the model addresses these by label with inline tags and can
      // switch mid-sentence. One agent, one socket, no transfer latency.
      supported_voices: [
        { label: primary.label, voice_id: primary.voice_id },
        { label: hedge.label, voice_id: hedge.voice_id },
      ],
    },
    turn: { turn_timeout: cfg.turn_timeout },
    conversation: { max_duration_seconds: cfg.max_duration_seconds },
  };
}

async function call(url: string, method: string, apiKey: string, body: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status}: ${text.slice(0, 600)}`);
  return text ? JSON.parse(text) : {};
}

async function main() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not set");

  const cfg = JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as AgentConfig;
  const conversationConfig = toConversationConfig(cfg);
  const existingId = process.env.ELEVENLABS_AGENT_ID;

  if (existingId) {
    await call(`${API}/${existingId}`, "PATCH", apiKey, {
      name: cfg.name,
      conversation_config: conversationConfig,
    });
    console.log(`patched agent ${existingId}`);
    console.log(`  voices: ${Object.values(cfg.voices).map((v) => v.label).join(", ")}`);
    console.log(`  tools:  ${cfg.tools.length}`);
    return;
  }

  const created = await call(`${API}/create`, "POST", apiKey, {
    name: cfg.name,
    conversation_config: conversationConfig,
  });
  const agentId = created.agent_id as string;
  appendFileSync(ENV_PATH, `\nELEVENLABS_AGENT_ID=${agentId}\nNEXT_PUBLIC_ELEVENLABS_AGENT_ID=${agentId}\n`);
  console.log(`created agent ${agentId}`);
  console.log(`  wrote ELEVENLABS_AGENT_ID and NEXT_PUBLIC_ELEVENLABS_AGENT_ID to .env.local`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

import { NextResponse } from "next/server";

/**
 * Mint a short-lived signed URL so the browser can open a conversation without
 * ever seeing the ElevenLabs API key.
 *
 * This is the only other server hop besides /api/listings, and it happens once
 * when the user presses talk — never during a turn.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;

  if (!apiKey || !agentId) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY or ELEVENLABS_AGENT_ID is not set. Run: npm run sync-agent" },
      { status: 500 },
    );
  }

  const res = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
    { headers: { "xi-api-key": apiKey }, cache: "no-store" },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `Could not get a signed URL (${res.status}): ${detail.slice(0, 200)}` },
      { status: 502 },
    );
  }

  const body = await res.json();
  return NextResponse.json({ signedUrl: body.signed_url });
}

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseServerClient } from "@/lib/supabase/server";

const MAX_BRIEF_CHARS = 1_000;
const TTS_MODEL = "gpt-4o-mini-tts";
/** Calm built-in voice for morning brief playback. */
const TTS_VOICE = "sage";

type BriefAudioBody = {
  text?: unknown;
};

export async function POST(request: Request) {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Text-to-speech is not configured. Set OPENAI_API_KEY on the server." },
      { status: 500 },
    );
  }

  let body: BriefAudioBody;
  try {
    body = (await request.json()) as BriefAudioBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "Missing or empty text" }, { status: 400 });
  }
  if (text.length > MAX_BRIEF_CHARS) {
    return NextResponse.json(
      { error: `Text must be at most ${MAX_BRIEF_CHARS} characters` },
      { status: 400 },
    );
  }

  try {
    const openai = new OpenAI({ apiKey });
    const speech = await openai.audio.speech.create({
      model: TTS_MODEL,
      voice: TTS_VOICE,
      input: text,
      response_format: "mp3",
      instructions:
        "Speak in a calm, steady, conversational tone suitable for a brief morning update.",
    });

    const audioBytes = await speech.arrayBuffer();

    return new NextResponse(audioBytes, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "TTS request failed";
    console.error("[os/brief-audio]", message);
    return NextResponse.json({ error: "Unable to generate audio" }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const documentText = (body?.documentText || "").toString();

    if (!documentText.trim()) {
      return NextResponse.json({ error: "documentText is required" }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Risk extraction is not yet implemented. Please add risks manually." },
      { status: 501 }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unexpected server error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
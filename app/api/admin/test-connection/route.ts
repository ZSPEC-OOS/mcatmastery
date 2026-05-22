import { NextRequest, NextResponse } from "next/server";
import { getModels } from "../../../../lib/firestore";
import { callModel } from "../../../../lib/model";

export async function POST(req: NextRequest) {
  try {
    const { type, modelId, baseUrl, apiKey } = await req.json() as {
      type: "firestore" | "model";
      modelId?: string;
      baseUrl?: string;
      apiKey?: string;
    };

    if (type === "firestore") {
      try {
        if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
          return NextResponse.json({ ok: false, error: "FIREBASE_SERVICE_ACCOUNT env var not set" });
        }
        await getModels();
        return NextResponse.json({ ok: true });
      } catch (e: unknown) {
        return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Firestore error" });
      }
    }

    if (type === "model") {
      if (!modelId?.trim()) {
        return NextResponse.json({ ok: false, error: "modelId is required" });
      }
      try {
        const reply = await callModel({
          modelId: modelId.trim(),
          baseUrl: baseUrl?.trim() || undefined,
          apiKey: apiKey?.trim() || undefined,
          system: "You are a connectivity test assistant. Follow instructions exactly.",
          userContent: 'Respond with only the single word: CONNECTED',
          maxTokens: 200,
        });
        const ok = reply.trim().toUpperCase().includes("CONNECTED");
        if (ok) return NextResponse.json({ ok: true, message: "Connection successful!" });
        return NextResponse.json({ ok: false, error: `Unexpected response: "${reply.slice(0, 80)}"` });
      } catch (e: unknown) {
        return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Model error" });
      }
    }

    return NextResponse.json({ ok: false, error: "Unknown type" }, { status: 400 });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
}

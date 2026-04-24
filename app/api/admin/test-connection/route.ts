import { NextRequest, NextResponse } from "next/server";
import { getModels } from "../../../../lib/firestore";

async function checkAuth() {
}

export async function POST(req: NextRequest) {
  try {
    await checkAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      if (!baseUrl?.trim() || !modelId?.trim()) {
        return NextResponse.json({ ok: false, error: "baseUrl and modelId are required" });
      }
      try {
        const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify({
            model: modelId,
            messages: [{ role: "user", content: "hi" }],
            max_tokens: 1,
          }),
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => res.statusText);
          return NextResponse.json({ ok: false, error: `HTTP ${res.status}: ${text.slice(0, 150)}` });
        }
        return NextResponse.json({ ok: true });
      } catch (e: unknown) {
        return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Connection failed" });
      }
    }

    return NextResponse.json({ ok: false, error: "Unknown type" }, { status: 400 });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
}

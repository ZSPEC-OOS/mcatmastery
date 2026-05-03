import { NextRequest, NextResponse } from "next/server";
import { getModels } from "../../../../lib/firestore";
import { testCustomModelConnection } from "@/lib/model-router";

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

      const result = await testCustomModelConnection(baseUrl, apiKey?.trim() ?? "", modelId);

      if (result.success) {
        return NextResponse.json({ ok: true, message: result.message });
      }

      return NextResponse.json({ ok: false, error: result.message }, { status: 400 });
    }

    return NextResponse.json({ ok: false, error: "Unknown type" }, { status: 400 });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
}

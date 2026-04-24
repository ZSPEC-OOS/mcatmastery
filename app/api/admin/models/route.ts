import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "../../../../lib/auth";
import { getModels, saveModel, deleteModel } from "../../../../lib/firestore";

async function checkAuth() {
  if (process.env.CLERK_SECRET_KEY) await requireUser();
}

export async function GET() {
  try {
    await checkAuth();
    const models = await getModels();
    return NextResponse.json({ models });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await checkAuth();
    const { name, modelId, baseUrl, apiKey } = await req.json() as Record<string, string>;
    if (!name?.trim() || !modelId?.trim()) {
      return NextResponse.json({ error: "name and modelId are required" }, { status: 400 });
    }
    const model = await saveModel({ name: name.trim(), modelId: modelId.trim(), baseUrl: baseUrl?.trim() ?? "", apiKey: apiKey?.trim() ?? "" });
    return NextResponse.json({ model });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg.startsWith("Firebase") || msg === "Unauthorized" ? msg : "Failed to save model" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await checkAuth();
    const { id } = await req.json() as { id: string };
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await deleteModel(id);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg.startsWith("Firebase") ? msg : "Failed to delete model" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getModels, saveModel, deleteModel } from "../../../../lib/firestore";

export async function GET() {
  try {
    const models = await getModels();
    return NextResponse.json({ models });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch models";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, modelId, baseUrl, apiKey } = await req.json() as Record<string, string>;
    if (!name?.trim() || !modelId?.trim()) {
      return NextResponse.json({ error: "name and modelId are required" }, { status: 400 });
    }
    const model = await saveModel({ name: name.trim(), modelId: modelId.trim(), baseUrl: baseUrl?.trim() ?? "", apiKey: apiKey?.trim() ?? "" });
    return NextResponse.json({ model });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json() as { id: string };
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await deleteModel(id);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg.startsWith("Firebase") ? msg : "Failed to delete model" }, { status: 500 });
  }
}

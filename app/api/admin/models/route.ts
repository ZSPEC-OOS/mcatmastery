import { NextRequest, NextResponse } from "next/server";
import { getModels, saveModel, updateModelRole, deleteModel, type ModelRole } from "../../../../lib/firestore";

const VALID_ROLES: ModelRole[] = ["generation", "audit", "both"];

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
    const { name, modelId, baseUrl, apiKey, role } = await req.json() as Record<string, string>;
    if (!name?.trim() || !modelId?.trim()) {
      return NextResponse.json({ error: "name and modelId are required" }, { status: 400 });
    }
    const resolvedRole: ModelRole = VALID_ROLES.includes(role as ModelRole) ? (role as ModelRole) : "both";
    const model = await saveModel({ name: name.trim(), modelId: modelId.trim(), baseUrl: baseUrl?.trim() ?? "", apiKey: apiKey?.trim() ?? "", role: resolvedRole });
    return NextResponse.json({ model });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, role } = await req.json() as { id: string; role: string };
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    if (!VALID_ROLES.includes(role as ModelRole)) {
      return NextResponse.json({ error: "invalid role" }, { status: 400 });
    }
    await updateModelRole(id, role as ModelRole);
    return NextResponse.json({ success: true });
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

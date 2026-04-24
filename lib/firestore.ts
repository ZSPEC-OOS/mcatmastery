import type { App } from "firebase-admin/app";
import { getSetting } from "./db";

export interface ModelConfig {
  id: string;
  name: string;
  modelId: string;
  baseUrl: string;
  apiKey: string;
  createdAt: string;
}

let _app: App | null | undefined = undefined;
let _initError = "";
let _projectId  = "";

function getApp(): App | null {
  if (_app !== undefined) return _app;

  const svcAcct = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!svcAcct) { _app = null; _initError = "not set"; return null; }

  try {
    const { getApps, initializeApp, cert } = require("firebase-admin/app") as typeof import("firebase-admin/app");
    if (getApps().length > 0) {
      _app = getApps()[0];
    } else {
      const parsed = JSON.parse(Buffer.from(svcAcct, "base64").toString("utf8"));
      _projectId = parsed.project_id ?? "";
      const storageBucket =
        process.env.FIREBASE_STORAGE_BUCKET ||
        `${_projectId}.firebasestorage.app`;
      _app = initializeApp({ credential: cert(parsed), storageBucket });
    }
  } catch (e) {
    _initError = e instanceof Error ? e.message : String(e);
    _app = null;
  }
  return _app;
}

async function enabled(): Promise<boolean> {
  return (await getSetting("firestore_enabled")) === "true";
}

// ── Models ────────────────────────────────────────────────────────────────────

export async function getModels(): Promise<ModelConfig[]> {
  const app = getApp();
  if (!app) return [];
  const { getFirestore } = require("firebase-admin/firestore") as typeof import("firebase-admin/firestore");
  const snap = await getFirestore(app).collection("models").orderBy("createdAt", "asc").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ModelConfig));
}

export async function getModelByModelId(modelId: string): Promise<ModelConfig | null> {
  const models = await getModels();
  return models.find((m) => m.modelId === modelId) ?? null;
}

export async function saveModel(model: Omit<ModelConfig, "id" | "createdAt">): Promise<ModelConfig> {
  const app = getApp();
  if (!app) throw new Error(`Firebase not configured — ${_initError || "set FIREBASE_SERVICE_ACCOUNT"}`);
  const { getFirestore } = require("firebase-admin/firestore") as typeof import("firebase-admin/firestore");
  const createdAt = new Date().toISOString();
  const ref = await getFirestore(app).collection("models").add({ ...model, createdAt });
  return { id: ref.id, ...model, createdAt };
}

export async function deleteModel(id: string): Promise<void> {
  const app = getApp();
  if (!app) throw new Error(`Firebase not configured — ${_initError || "set FIREBASE_SERVICE_ACCOUNT"}`);
  const { getFirestore } = require("firebase-admin/firestore") as typeof import("firebase-admin/firestore");
  await getFirestore(app).collection("models").doc(id).delete();
}

// ── Image Storage ─────────────────────────────────────────────────────────────

export async function uploadQuestionImage(b64DataUrl: string, questionId: string): Promise<string> {
  const app = getApp();
  if (!app) throw new Error(`Firebase not configured — ${_initError || "set FIREBASE_SERVICE_ACCOUNT"}`);

  const { getStorage } = require("firebase-admin/storage") as typeof import("firebase-admin/storage");
  const base64 = b64DataUrl.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64, "base64");

  const bucket = getStorage(app).bucket();
  const file   = bucket.file(`questions/images/${questionId}.png`);

  await file.save(buffer, {
    contentType: "image/png",
    metadata:    { cacheControl: "public, max-age=31536000" },
  });

  await file.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${file.name}`;
}

// ── Sync ──────────────────────────────────────────────────────────────────────

export async function syncQuestionToFirestore(question: Record<string, unknown>) {
  const app = getApp();
  if (!app || !(await enabled())) return;
  const { getFirestore } = require("firebase-admin/firestore") as typeof import("firebase-admin/firestore");
  await getFirestore(app).collection("questions").doc(question.id as string).set({
    ...question,
    createdAt: question.createdAt instanceof Date ? question.createdAt.toISOString() : question.createdAt,
  });
}

export async function syncSessionAnswerToFirestore(data: {
  sessionId:        string;
  questionId:       string;
  userId:           string;
  userAnswer:       string;
  isCorrect:        boolean;
  answeredAt:       Date;
  timeSpentSeconds?: number;
}) {
  const app = getApp();
  if (!app || !(await enabled())) return;
  const { getFirestore } = require("firebase-admin/firestore") as typeof import("firebase-admin/firestore");
  await getFirestore(app)
    .collection("sessions").doc(data.sessionId)
    .collection("answers").doc(data.questionId)
    .set({ ...data, answeredAt: data.answeredAt.toISOString() });
}

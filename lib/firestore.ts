import type { App } from "firebase-admin/app";
import { db } from "./db";

export interface ModelConfig {
  id: string;
  name: string;
  modelId: string;
  baseUrl: string;
  apiKey: string;
  createdAt: string;
}

let _app: App | null | undefined = undefined; // undefined = not yet initialised

function getApp(): App | null {
  if (_app !== undefined) return _app;

  const svcAcct = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!svcAcct) { _app = null; return null; }

  try {
    const { getApps, initializeApp, cert } = require("firebase-admin/app") as typeof import("firebase-admin/app");
    if (getApps().length > 0) {
      _app = getApps()[0];
    } else {
      const parsed = JSON.parse(Buffer.from(svcAcct, "base64").toString("utf8"));
      _app = initializeApp({ credential: cert(parsed) });
    }
  } catch {
    _app = null;
  }
  return _app;
}

async function enabled(): Promise<boolean> {
  const s = await db.appSetting.findUnique({ where: { key: "firestore_enabled" } });
  return s?.value === "true";
}

export async function syncQuestionToFirestore(question: Record<string, unknown>) {
  const app = getApp();
  if (!app || !(await enabled())) return;
  const { getFirestore } = require("firebase-admin/firestore") as typeof import("firebase-admin/firestore");
  await getFirestore(app).collection("questions").doc(question.id as string).set({
    ...question,
    createdAt: question.createdAt instanceof Date ? question.createdAt.toISOString() : question.createdAt,
  });
}

export async function getModels(): Promise<ModelConfig[]> {
  const app = getApp();
  if (!app) return [];
  const { getFirestore } = require("firebase-admin/firestore") as typeof import("firebase-admin/firestore");
  const snap = await getFirestore(app).collection("models").orderBy("createdAt", "asc").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ModelConfig));
}

export async function saveModel(model: Omit<ModelConfig, "id" | "createdAt">): Promise<ModelConfig> {
  const app = getApp();
  if (!app) throw new Error("Firebase not configured — set FIREBASE_SERVICE_ACCOUNT");
  const { getFirestore } = require("firebase-admin/firestore") as typeof import("firebase-admin/firestore");
  const createdAt = new Date().toISOString();
  const ref = await getFirestore(app).collection("models").add({ ...model, createdAt });
  return { id: ref.id, ...model, createdAt };
}

export async function deleteModel(id: string): Promise<void> {
  const app = getApp();
  if (!app) throw new Error("Firebase not configured — set FIREBASE_SERVICE_ACCOUNT");
  const { getFirestore } = require("firebase-admin/firestore") as typeof import("firebase-admin/firestore");
  await getFirestore(app).collection("models").doc(id).delete();
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

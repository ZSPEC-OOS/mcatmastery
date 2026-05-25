import type { App } from "firebase-admin/app";

let _app: App | null | undefined = undefined;
let _initError = "";
let _projectId  = "";

function getApp(): App {
  if (_app !== undefined) {
    if (!_app) throw new Error(`Firebase not configured — ${_initError || "set FIREBASE_SERVICE_ACCOUNT"}`);
    return _app;
  }

  const svcAcct = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!svcAcct) {
    _initError = "FIREBASE_SERVICE_ACCOUNT env var not set";
    _app = null;
    throw new Error(`Firebase not configured — ${_initError}`);
  }

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
    return _app!;
  } catch (e) {
    _initError = e instanceof Error ? e.message : String(e);
    _app = null;
    throw new Error(`Firebase not configured — ${_initError}`);
  }
}

function fs() {
  const { getFirestore } = require("firebase-admin/firestore") as typeof import("firebase-admin/firestore");
  return getFirestore(getApp());
}

// ── Types ─────────────────────────────────────────────────────────────────────

// Stored as a single role ("generation", "audit", "formatting", "disabled"),
// the legacy "both" value, or a comma-separated set like "generation,formatting".
export type ModelRole = string;

export interface ModelConfig {
  id: string;
  name: string;
  modelId: string;
  baseUrl: string;
  apiKey: string;
  role: ModelRole;
  maxTokens?: number;
  createdAt: string;
}

export interface QuestionDoc {
  id: string;
  section: string;
  topic: string;
  subType?: string;
  passageGroupId?: string | null;
  passage?: string | null;
  stem: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
  difficulty: string;
  aiGenerated: boolean;
  figureUrl?: string | null;
  createdAt: string;
  auditStatus?:      "needs_audit" | "audited";
  formattingStatus?: "needs_format" | "formatted";
}

export interface SessionDoc {
  id: string;
  userId: string;
  section: string;
  timed: boolean;
  startedAt: string;
  endedAt?: string | null;
}

export interface SessionAnswerDoc {
  questionId: string;
  sessionId: string;
  userId: string;
  userAnswer: string;
  isCorrect: boolean;
  errorType?: string | null;
  flagged: boolean;
  confidence?: string | null;
  reviewStatus: string;
  answeredAt: string;
  timeSpentSeconds?: number;
  questionSection?: string;
  questionTopic?: string;
}

// ── Models ────────────────────────────────────────────────────────────────────

export async function getModels(): Promise<ModelConfig[]> {
  const snap = await fs().collection("models").orderBy("createdAt", "asc").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ModelConfig));
}

export async function getModelByModelId(modelId: string): Promise<ModelConfig | null> {
  const models = await getModels();
  return models.find((m) => m.modelId === modelId) ?? null;
}

export async function saveModel(model: Omit<ModelConfig, "id" | "createdAt">): Promise<ModelConfig> {
  const createdAt = new Date().toISOString();
  const ref = await fs().collection("models").add({ ...model, createdAt });
  return { id: ref.id, ...model, createdAt };
}

export async function updateModelRole(id: string, role: ModelRole): Promise<void> {
  await fs().collection("models").doc(id).update({ role });
}

export async function updateModel(id: string, fields: Partial<Omit<ModelConfig, "id" | "createdAt">>): Promise<void> {
  await fs().collection("models").doc(id).update(fields as Record<string, unknown>);
}

export async function deleteModel(id: string): Promise<void> {
  await fs().collection("models").doc(id).delete();
}

// ── Questions ─────────────────────────────────────────────────────────────────

export async function saveQuestion(
  data: Omit<QuestionDoc, "id" | "createdAt"> & { subType?: string }
): Promise<QuestionDoc> {
  const createdAt = new Date().toISOString();
  const withStatus = { ...data, createdAt, auditStatus: "needs_audit" as const };
  const ref = await fs().collection("questions").add(withStatus);
  return { id: ref.id, ...withStatus };
}

export async function getQuestions(opts: {
  section?: string;
  sections?: string[];
  difficulties?: string[];
  subTypes?: string[];
  topic?: string;
  limit?: number;
  auditedOnly?: boolean;
} = {}): Promise<QuestionDoc[]> {
  let q: FirebaseFirestore.Query = fs().collection("questions");

  // Build effective sections list from singular or plural param
  const effectiveSections = opts.sections?.length
    ? opts.sections
    : opts.section
    ? [opts.section]
    : [];

  if (effectiveSections.length === 1) {
    q = q.where("section", "==", effectiveSections[0]);
  } else if (effectiveSections.length > 1) {
    q = q.where("section", "in", effectiveSections);
  }

  const snap = await q.get();
  let docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as QuestionDoc));

  // In-memory filters (avoids composite index requirements)
  if (opts.difficulties?.length) {
    docs = docs.filter((d) => opts.difficulties!.includes(d.difficulty));
  }
  if (opts.subTypes?.length) {
    docs = docs.filter((d) => d.subType !== undefined && opts.subTypes!.includes(d.subType));
  }
  if (opts.auditedOnly) {
    docs = docs.filter((d) => d.auditStatus === "audited");
  }
  if (opts.topic) {
    const needle = opts.topic.toLowerCase();
    docs = docs.filter(
      (d) =>
        d.topic.toLowerCase().includes(needle) ||
        d.stem.toLowerCase().includes(needle)
    );
  }

  // Sort newest first
  docs.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  if (opts.limit) docs = docs.slice(0, opts.limit);
  return docs;
}

export async function getQuestionById(id: string): Promise<QuestionDoc | null> {
  const doc = await fs().collection("questions").doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as QuestionDoc;
}

export async function deleteQuestion(id: string): Promise<void> {
  await fs().collection("questions").doc(id).delete();
}

export async function updateQuestion(
  id: string,
  patch: Partial<Omit<QuestionDoc, "id" | "createdAt">>
): Promise<void> {
  await fs().collection("questions").doc(id).update(patch as FirebaseFirestore.UpdateData<QuestionDoc>);
}

export async function deleteAllQuestions(): Promise<number> {
  const firestore = fs();
  const snap = await firestore.collection("questions").get();
  let deleted = 0;
  const ids = snap.docs.map((d) => d.id);
  // Firestore batches are capped at 500 ops
  for (let i = 0; i < ids.length; i += 500) {
    const batch = firestore.batch();
    for (const id of ids.slice(i, i + 500)) {
      batch.delete(firestore.collection("questions").doc(id));
    }
    await batch.commit();
    deleted += ids.slice(i, i + 500).length;
  }
  return deleted;
}

export async function deleteUserSessions(userId: string): Promise<void> {
  const firestore = fs();
  const sessSnap = await firestore.collection("sessions").where("userId", "==", userId).get();
  for (const sess of sessSnap.docs) {
    const answersSnap = await sess.ref.collection("answers").get();
    for (let i = 0; i < answersSnap.docs.length; i += 500) {
      const batch = firestore.batch();
      for (const a of answersSnap.docs.slice(i, i + 500)) batch.delete(a.ref);
      await batch.commit();
    }
    await sess.ref.delete();
  }
}



export async function createSession(data: {
  userId: string;
  section: string;
  timed: boolean;
}): Promise<SessionDoc> {
  const startedAt = new Date().toISOString();
  const ref = await fs().collection("sessions").add({ ...data, startedAt, endedAt: null });
  return { id: ref.id, ...data, startedAt, endedAt: null };
}

export async function completeSession(id: string): Promise<void> {
  await fs().collection("sessions").doc(id).update({ endedAt: new Date().toISOString() });
}

export async function saveSessionAnswer(data: SessionAnswerDoc): Promise<void> {
  await fs()
    .collection("sessions").doc(data.sessionId)
    .collection("answers").doc(data.questionId)
    .set(data);
}

export async function getSessionAnswers(userId: string): Promise<SessionAnswerDoc[]> {
  const sessSnap = await fs()
    .collection("sessions")
    .where("userId", "==", userId)
    .get();

  const all: SessionAnswerDoc[] = [];
  await Promise.all(
    sessSnap.docs.map(async (sess) => {
      const answersSnap = await sess.ref.collection("answers").get();
      for (const a of answersSnap.docs) {
        all.push(a.data() as SessionAnswerDoc);
      }
    })
  );
  all.sort((a, b) => (b.answeredAt ?? "").localeCompare(a.answeredAt ?? ""));
  return all;
}

export async function patchSessionAnswer(
  sessionId: string,
  questionId: string,
  patch: Partial<SessionAnswerDoc>
): Promise<SessionAnswerDoc> {
  const ref = fs()
    .collection("sessions").doc(sessionId)
    .collection("answers").doc(questionId);
  await ref.update(patch);
  const doc = await ref.get();
  return doc.data() as SessionAnswerDoc;
}

// ── Image Storage ─────────────────────────────────────────────────────────────

export async function uploadQuestionImage(b64DataUrl: string, questionId: string): Promise<string> {
  const { getStorage } = require("firebase-admin/storage") as typeof import("firebase-admin/storage");
  const base64 = b64DataUrl.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64, "base64");

  const bucket = getStorage(getApp()).bucket();
  const file   = bucket.file(`questions/images/${questionId}.png`);

  await file.save(buffer, {
    contentType: "image/png",
    metadata:    { cacheControl: "public, max-age=31536000" },
  });

  await file.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${file.name}`;
}

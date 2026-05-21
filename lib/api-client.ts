export type Section    = "Chem/Phys" | "CARS" | "Bio/Biochem" | "Psych/Soc";
export type Answer     = "A" | "B" | "C" | "D";
export type Difficulty = "easy" | "medium" | "hard";
export type ErrorType = "Content Gap" | "Logic Error" | "Misread Question" | "Timing";
export type ReviewStatus = "pending" | "reviewed";

export interface Question {
  id: string;
  section: Section;
  topic: string;
  subType?: string;
  passageGroupId?: string | null;
  passage: string | null;
  stem: string;
  optionA: string; optionB: string; optionC: string; optionD: string;
  correctAnswer: Answer;
  explanation: string;
  difficulty: string;
  aiGenerated: boolean;
  figureUrl?: string | null;
  createdAt: string;
}

export interface SessionQuestion {
  id: string;
  sessionId: string;
  questionId: string;
  question: Question;
  userAnswer: Answer | null;
  isCorrect: boolean | null;
  errorType: ErrorType | null;
  flagged: boolean;
  confidence: "low" | "medium" | "high" | null;
  reviewStatus: ReviewStatus;
  answeredAt: string | null;
}

export interface FLScore {
  id: string;
  testName: string;
  chemPhys: number; cars: number; bioBiochem: number; psychSoc: number;
  total: number;
  takenAt: string;
}

export interface Analytics {
  overall: { accuracy: number; correct: number; total: number };
  sections: Record<Section, { correct: number; total: number }>;
  errorTypes: Record<ErrorType, number>;
  weakTopics: Array<{ label: string; section: Section; accuracy: number }>;
  flScores: FLScore[];
}

// ─── Session Questions (mistake log) ────────────────────────────────────────

export async function fetchMistakes(params?: {
  section?: Section; wrong?: boolean; limit?: number; cursor?: string;
}): Promise<{ questions: SessionQuestion[]; nextCursor: string | null }> {
  const sp = new URLSearchParams();
  if (params?.section) sp.set("section", params.section);
  if (params?.wrong)   sp.set("wrong", "true");
  if (params?.limit)   sp.set("limit", String(params.limit));
  if (params?.cursor)  sp.set("cursor", params.cursor);
  const res = await fetch(`/api/questions?${sp}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function patchSessionQuestion(
  id: string,
  data: {
    userAnswer?: Answer;
    isCorrect?: boolean;
    errorType?: ErrorType | null;
    flagged?: boolean;
    confidence?: "low" | "medium" | "high" | null;
    reviewStatus?: ReviewStatus;
  }
): Promise<SessionQuestion> {
  const res = await fetch(`/api/questions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Practice Questions (from bank) ─────────────────────────────────────────

export async function fetchPracticeQuestions(params: {
  sections: Section[];
  difficulties: Difficulty[];
  subTypes?: string[];
  count: number;
}): Promise<{ questions: Question[]; found: number; returned: number }> {
  const res = await fetch("/api/questions/practice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Generation (SSE) ────────────────────────────────────────────────────────

export type SSEEvent =
  | { type: "progress"; current: number; total: number }
  | { type: "question"; question: Question }
  | { type: "skip"; reason: string; index: number; message?: string; flags?: string[] }
  | { type: "done"; generated: number };

export async function* generateQuestions(params: {
  section: Section; subType?: string; count?: number;
}): AsyncGenerator<SSEEvent> {
  const res = await fetch("/api/questions/generate/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok || !res.body) throw new Error(await res.text());

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const chunks = buf.split("\n\n");
    buf = chunks.pop() ?? "";
    for (const chunk of chunks) {
      const line = chunk.replace(/^data: /, "").trim();
      if (line) yield JSON.parse(line) as SSEEvent;
    }
  }
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export async function createSession(section: Section, timed: boolean) {
  const res = await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ section, timeLimitSeconds: timed ? 95 * 60 : null }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ id: string }>;
}

export async function completeSession(sessionId: string) {
  const res = await fetch("/api/sessions", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export async function fetchAnalytics(): Promise<Analytics> {
  const res = await fetch("/api/analytics");
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── FL Scores ────────────────────────────────────────────────────────────────

export async function addFLScore(data: {
  testName: string; chemPhys: number; cars: number;
  bioBiochem: number; psychSoc: number; takenAt?: string;
}): Promise<FLScore> {
  const res = await fetch("/api/fl-scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Notes ───────────────────────────────────────────────────────────────────

export async function saveNote(data: { content: string; questionId?: string; topic?: string }) {
  const res = await fetch("/api/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchNotes(params?: { questionId?: string; topic?: string }) {
  const sp = new URLSearchParams();
  if (params?.questionId) sp.set("questionId", params.questionId);
  if (params?.topic)      sp.set("topic", params.topic);
  const res = await fetch(`/api/notes?${sp}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

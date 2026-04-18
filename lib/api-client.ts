// Typed client helpers — call from client components

type Section = "Chem/Phys" | "CARS" | "Bio/Biochem" | "Psych/Soc";
type Answer = "A" | "B" | "C" | "D";
type ErrorType = "Content Gap" | "Logic Error" | "Misread Question" | "Timing";

export interface Question {
  id: string;
  section: Section;
  topic: string;
  passage: string | null;
  stem: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: Answer;
  explanation: string;
  difficulty: string;
  aiGenerated: boolean;
  createdAt: string;
}

export interface Analytics {
  overall: { accuracy: number; correct: number; total: number };
  sections: Record<Section, { correct: number; total: number }>;
  errorTypes: Record<ErrorType, number>;
  weakTopics: Array<{ label: string; section: Section; accuracy: number }>;
  flScores: FLScore[];
}

export interface FLScore {
  id: string;
  testName: string;
  chemPhys: number;
  cars: number;
  bioBiochem: number;
  psychSoc: number;
  total: number;
  takenAt: string;
}

// --- Questions ---

export async function fetchQuestions(params?: {
  section?: Section;
  topic?: string;
  limit?: number;
  cursor?: string;
}): Promise<{ questions: Question[]; nextCursor: string | null }> {
  const sp = new URLSearchParams();
  if (params?.section) sp.set("section", params.section);
  if (params?.topic) sp.set("topic", params.topic);
  if (params?.limit) sp.set("limit", String(params.limit));
  if (params?.cursor) sp.set("cursor", params.cursor);
  const res = await fetch(`/api/questions?${sp}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function answerQuestion(
  questionId: string,
  data: {
    userAnswer: Answer;
    isCorrect: boolean;
    errorType?: ErrorType;
    confidence?: "low" | "medium" | "high";
  }
) {
  const res = await fetch(`/api/questions/${questionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateQuestion(
  questionId: string,
  data: {
    errorType?: ErrorType;
    reviewStatus?: "pending" | "reviewed";
    flagged?: boolean;
  }
) {
  const res = await fetch(`/api/questions/${questionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// SSE streaming generator — yields events as they arrive
export async function* generateQuestions(params: {
  section: Section;
  topic?: string;
  count?: number;
}) {
  const res = await fetch("/api/questions/generate/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok || !res.body) throw new Error(await res.text());

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n\n");
    buf = lines.pop() ?? "";
    for (const chunk of lines) {
      const line = chunk.replace(/^data: /, "").trim();
      if (line) yield JSON.parse(line);
    }
  }
}

// --- Analytics ---

export async function fetchAnalytics(): Promise<Analytics> {
  const res = await fetch("/api/analytics");
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// --- Full-Length Scores ---

export async function addFLScore(data: {
  testName: string;
  chemPhys: number;
  cars: number;
  bioBiochem: number;
  psychSoc: number;
  takenAt?: string;
}): Promise<FLScore> {
  const res = await fetch("/api/fl-scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// --- Notes ---

export async function saveNote(data: {
  content: string;
  questionId?: string;
  topic?: string;
}) {
  const res = await fetch("/api/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

"use client";
import { useEffect, useState } from "react";
import { fetchMistakes, type SessionQuestion, type Section } from "../../../lib/api-client";

interface Props { selectedId: string; onSelect: (id: string) => void; }

const SECTION_COLORS: Record<string, string> = {
  "Chem/Phys": "#5b9cf6", "CARS": "#f0a500", "Bio/Biochem": "#4ade80", "Psych/Soc": "#a78bfa",
};
const ERROR_STYLES: Record<string, React.CSSProperties> = {
  "Content Gap":      { background: "rgba(45,106,224,0.2)",  color: "#6eaeff",  border: "1px solid rgba(45,106,224,0.35)"  },
  "Logic Error":      { background: "rgba(240,165,0,0.2)",   color: "#f0c060",  border: "1px solid rgba(240,165,0,0.35)"   },
  "Misread Question": { background: "rgba(168,85,247,0.2)",  color: "#c084fc",  border: "1px solid rgba(168,85,247,0.35)"  },
  "Timing":           { background: "rgba(74,222,128,0.2)",  color: "#4ade80",  border: "1px solid rgba(74,222,128,0.35)"  },
};

const SEED: SessionQuestion[] = [
  { id: "01834", sessionId: "", questionId: "", answeredAt: null, flagged: false, confidence: null, reviewStatus: "reviewed", isCorrect: false, userAnswer: "C", errorType: "Content Gap",
    question: { id: "01834", section: "Chem/Phys" as Section, topic: "Enzyme Kinetics", stem: "Which of the following correctly describes competitive inhibition?", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "B", explanation: "", difficulty: "medium", aiGenerated: true, passage: null, createdAt: "2024-06-24" } },
  { id: "01367", sessionId: "", questionId: "", answeredAt: null, flagged: false, confidence: null, reviewStatus: "reviewed", isCorrect: false, userAnswer: "A", errorType: "Logic Error",
    question: { id: "01367", section: "CARS" as Section, topic: "Inference Questions", stem: "The author's primary purpose is best described as:", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "C", explanation: "", difficulty: "hard", aiGenerated: true, passage: null, createdAt: "2024-04-22" } },
  { id: "01432", sessionId: "", questionId: "", answeredAt: null, flagged: false, confidence: null, reviewStatus: "reviewed", isCorrect: false, userAnswer: "D", errorType: "Misread Question",
    question: { id: "01432", section: "Bio/Biochem" as Section, topic: "Amino Acids", stem: "Which amino acid forms disulfide bonds?", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "C", explanation: "", difficulty: "easy", aiGenerated: true, passage: null, createdAt: "2024-04-10" } },
  { id: "01398", sessionId: "", questionId: "", answeredAt: null, flagged: false, confidence: null, reviewStatus: "reviewed", isCorrect: false, userAnswer: "B", errorType: "Misread Question",
    question: { id: "01398", section: "Psych/Soc" as Section, topic: "Self Identity Development", stem: "Erikson's early adulthood stage involves:", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "C", explanation: "", difficulty: "easy", aiGenerated: true, passage: null, createdAt: "2024-06-11" } },
  { id: "01159", sessionId: "", questionId: "", answeredAt: null, flagged: false, confidence: null, reviewStatus: "pending", isCorrect: false, userAnswer: "A", errorType: "Timing",
    question: { id: "01159", section: "Chem/Phys" as Section, topic: "Thermodynamics", stem: "For a spontaneous reaction at constant T and P:", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "D", explanation: "", difficulty: "easy", aiGenerated: true, passage: null, createdAt: "2024-04-16" } },
];

export default function MistakeTable({ selectedId, onSelect }: Props) {
  const [rows, setRows]       = useState<SessionQuestion[]>(SEED);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMistakes({ wrong: true, limit: 50 })
      .then(r => { if (r.questions.length > 0) setRows(r.questions); })
      .catch(() => { /* keep seed */ })
      .finally(() => setLoading(false));
  }, []);

  const fmtDate = (s: string | null) =>
    s ? new Date(s).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" }) : "—";

  return (
    <div className="rounded-xl overflow-hidden mb-6" style={{ border: "1px solid var(--border)" }}>
      {loading && (
        <div className="px-4 py-2 text-xs" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
          Loading from database…
        </div>
      )}

      {/* Mobile card list */}
      <div className="md:hidden">
        {rows.map(row => {
          const isSelected = row.id === selectedId;
          const q = row.question;
          return (
            <div key={row.id} onClick={() => onSelect(row.id)} className="p-4 cursor-pointer"
              style={{
                background: isSelected ? "rgba(45,106,224,0.08)" : "var(--bg-card)",
                borderLeft: `3px solid ${isSelected ? "var(--accent-blue)" : "transparent"}`,
                borderBottom: "1px solid var(--border)",
              }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>#{row.id.slice(-5)}</span>
                  <span className="flex items-center gap-1.5 text-xs font-medium">
                    <span className="w-2 h-2 rounded-full"
                      style={{ background: SECTION_COLORS[q.section] ?? "var(--text-muted)" }} />
                    <span style={{ color: "var(--text-primary)" }}>{q.section}</span>
                  </span>
                </div>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {fmtDate(row.answeredAt ?? q.createdAt)}
                </span>
              </div>
              <p className="text-sm mb-2 font-medium" style={{ color: "var(--text-primary)" }}>{q.topic}</p>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs" style={{ color: "#f87171" }}>✗ {row.userAnswer ?? "—"}</span>
                <span className="text-xs" style={{ color: "#4ade80" }}>✓ {q.correctAnswer}</span>
                {row.errorType && (
                  <span className="text-xs px-2 py-0.5 rounded ml-auto"
                    style={ERROR_STYLES[row.errorType] ?? {}}>{row.errorType}</span>
                )}
                <span className="flex items-center gap-1 text-xs"
                  style={{ color: row.reviewStatus === "reviewed" ? "#4ade80" : "#f0a500" }}>
                  <span className="w-1.5 h-1.5 rounded-full"
                    style={{ background: row.reviewStatus === "reviewed" ? "#4ade80" : "#f0a500" }} />
                  {row.reviewStatus === "reviewed" ? "Reviewed" : "Pending"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <div className="grid text-xs px-4 py-2"
          style={{ background: "rgba(22,27,34,0.8)", color: "var(--text-muted)",
            gridTemplateColumns: "80px 110px 1fr 90px 80px 140px 100px 90px" }}>
          <span>#</span><span>Section</span><span>Topic</span>
          <span>Your Answer</span><span>Answer</span>
          <span>Error Type</span><span>Date</span><span>Status</span>
        </div>
        {rows.map(row => {
          const isSelected = row.id === selectedId;
          const q = row.question;
          return (
            <div key={row.id} onClick={() => onSelect(row.id)}
              className="grid items-center cursor-pointer"
              style={{
                gridTemplateColumns: "80px 110px 1fr 90px 80px 140px 100px 90px",
                background: isSelected ? "rgba(45,106,224,0.08)" : "var(--bg-card)",
                borderLeft: `2px solid ${isSelected ? "var(--accent-blue)" : "transparent"}`,
                borderTop: "1px solid var(--border)",
              }}>
              <span className="px-4 py-3 text-sm font-mono" style={{ color: "var(--text-muted)" }}>#{row.id.slice(-5)}</span>
              <span className="px-4 py-3 text-sm flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: SECTION_COLORS[q.section] ?? "var(--text-muted)" }} />
                <span style={{ color: "var(--text-primary)" }}>{q.section}</span>
              </span>
              <span className="px-4 py-3 text-sm" style={{ color: "var(--text-primary)" }}>{q.topic}</span>
              <span className="px-4 py-3 text-sm" style={{ color: "#f87171" }}>✗ {row.userAnswer ?? "—"}</span>
              <span className="px-4 py-3 text-sm" style={{ color: "#4ade80" }}>✓ {q.correctAnswer}</span>
              <span className="px-4 py-3">
                {row.errorType
                  ? <span className="text-xs px-2 py-0.5 rounded" style={ERROR_STYLES[row.errorType] ?? {}}>{row.errorType}</span>
                  : <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>}
              </span>
              <span className="px-4 py-3 text-sm" style={{ color: "var(--text-muted)" }}>{fmtDate(row.answeredAt ?? q.createdAt)}</span>
              <span className="px-4 py-3 text-sm flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full"
                  style={{ background: row.reviewStatus === "reviewed" ? "#4ade80" : "#f0a500" }} />
                <span style={{ color: row.reviewStatus === "reviewed" ? "#4ade80" : "#f0a500" }}>
                  {row.reviewStatus === "reviewed" ? "Reviewed" : "Pending"}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

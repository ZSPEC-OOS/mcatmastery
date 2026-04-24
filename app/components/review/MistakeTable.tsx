"use client";
import { useEffect, useState } from "react";
import { fetchMistakes, type SessionQuestion } from "../../../lib/api-client";

interface Props {
  selectedId: string;
  onSelect: (id: string) => void;
  filterSection?: string;
  filterErrorType?: string;
  filterStatus?: string;
}

const SECTION_COLORS: Record<string, string> = {
  "Chem/Phys": "#6366f1", "CARS": "#f0a500", "Bio/Biochem": "#4ade80", "Psych/Soc": "#a78bfa",
};
const ERROR_STYLES: Record<string, React.CSSProperties> = {
  "Content Gap":      { background: "rgba(27,58,107,0.2)",  color: "var(--accent-blue)",  border: "1px solid rgba(27,58,107,0.35)"  },
  "Logic Error":      { background: "rgba(240,165,0,0.2)",   color: "#f0c060",  border: "1px solid rgba(240,165,0,0.35)"   },
  "Misread Question": { background: "rgba(168,85,247,0.2)",  color: "#c084fc",  border: "1px solid rgba(168,85,247,0.35)"  },
  "Timing":           { background: "rgba(74,222,128,0.2)",  color: "#4ade80",  border: "1px solid rgba(74,222,128,0.35)"  },
};

export default function MistakeTable({ selectedId, onSelect, filterSection, filterErrorType, filterStatus }: Props) {
  const [rows, setRows]       = useState<SessionQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMistakes({ wrong: true, limit: 50 })
      .then(r => { setRows(r.questions); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const displayRows = rows.filter(row => {
    if (filterSection && row.question.section !== filterSection) return false;
    if (filterErrorType && row.errorType !== filterErrorType) return false;
    if (filterStatus && row.reviewStatus !== filterStatus) return false;
    return true;
  });

  const fmtDate = (s: string | null) =>
    s ? new Date(s).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" }) : "—";

  if (!loading && rows.length === 0) {
    return (
      <div className="rounded-xl p-10 text-center mb-6" style={{ border: "1px solid var(--border)" }}>
        <p className="text-sm mb-1" style={{ color: "var(--text-primary)" }}>No mistakes yet</p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Complete practice sessions and wrong answers will appear here for review.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden mb-6" style={{ border: "1px solid var(--border)" }}>
      {loading && (
        <div className="px-4 py-2 text-xs" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
          Loading from database…
        </div>
      )}

      {/* Mobile card list */}
      <div className="md:hidden">
        {displayRows.map(row => {
          const isSelected = row.id === selectedId;
          const q = row.question;
          return (
            <div key={row.id} onClick={() => onSelect(row.id)} className="p-4 cursor-pointer"
              style={{
                background: isSelected ? "rgba(27,58,107,0.08)" : "var(--bg-card)",
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
          style={{ background: "var(--bg-elevated)", color: "var(--text-muted)",
            gridTemplateColumns: "80px 110px 1fr 90px 80px 140px 100px 90px" }}>
          <span>#</span><span>Section</span><span>Topic</span>
          <span>Your Answer</span><span>Answer</span>
          <span>Error Type</span><span>Date</span><span>Status</span>
        </div>
        {displayRows.map(row => {
          const isSelected = row.id === selectedId;
          const q = row.question;
          return (
            <div key={row.id} onClick={() => onSelect(row.id)}
              className="grid items-center cursor-pointer"
              style={{
                gridTemplateColumns: "80px 110px 1fr 90px 80px 140px 100px 90px",
                background: isSelected ? "rgba(27,58,107,0.08)" : "var(--bg-card)",
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

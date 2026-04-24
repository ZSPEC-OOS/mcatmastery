"use client";
import { useState, useEffect, useCallback } from "react";
import { SECTION_COLORS, DIFF_COLORS } from "./shared";

type RecentQ = { id: string; section: string; topic: string; stem: string; difficulty: string; createdAt: string };
type FullQ = RecentQ & {
  passage: string | null;
  optionA: string; optionB: string; optionC: string; optionD: string;
  correctAnswer: string;
  explanation: string;
  figureUrl?: string | null;
};
type Stats = {
  total: number;
  bySection: Record<string, number>;
  byDifficulty: Record<string, number>;
  recent: RecentQ[];
};

const OPTIONS = ["A", "B", "C", "D"] as const;

function QuestionModal({ id, onClose, onDelete }: { id: string; onClose: () => void; onDelete: (id: string) => void }) {
  const [q, setQ]           = useState<FullQ | null>(null);
  const [loading, setLoad]  = useState(true);
  const [deleting, setDel]  = useState(false);

  useEffect(() => {
    fetch(`/api/admin/questions/${id}`)
      .then((r) => r.json())
      .then((d: { question: FullQ }) => { setQ(d.question); setLoad(false); })
      .catch(() => setLoad(false));
  }, [id]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);
  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  async function handleDelete() {
    setDel(true);
    await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
    onDelete(id);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
          style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
          {q && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1.5 text-xs font-semibold"
                style={{ color: SECTION_COLORS[q.section] }}>
                <span className="w-2 h-2 rounded-full" style={{ background: SECTION_COLORS[q.section] }} />
                {q.section}
              </span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>· {q.topic}</span>
              <span className="px-2 py-0.5 rounded text-xs font-semibold capitalize"
                style={{ background: `${DIFF_COLORS[q.difficulty]}18`, color: DIFF_COLORS[q.difficulty] }}>
                {q.difficulty}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 ml-auto">
            {q && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs px-3 py-1.5 rounded-lg"
                style={{ background: "rgba(224,92,92,0.1)", color: "#e05c5c",
                  border: "1px solid rgba(224,92,92,0.25)", opacity: deleting ? 0.5 : 1 }}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            )}
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-lg leading-none"
              style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {loading && (
            <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>Loading…</p>
          )}

          {!loading && !q && (
            <p className="text-sm text-center py-8" style={{ color: "#e05c5c" }}>Failed to load question.</p>
          )}

          {q && (
            <>
              {/* Figure */}
              {q.figureUrl && (
                <img src={q.figureUrl} alt="Figure" className="w-full rounded-xl object-contain max-h-64"
                  style={{ border: "1px solid var(--border)" }} />
              )}

              {/* Passage */}
              {q.passage && (
                <div className="rounded-xl p-4" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                    Passage
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>{q.passage}</p>
                </div>
              )}

              {/* Stem */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                  Question
                </p>
                <p className="text-sm font-medium leading-relaxed" style={{ color: "var(--text-primary)", fontFamily: "var(--font-playfair), Georgia, serif" }}>
                  {q.stem}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Answer Choices
                </p>
                {OPTIONS.map((letter) => {
                  const text = q[`option${letter}` as keyof FullQ] as string;
                  const isCorrect = q.correctAnswer === letter;
                  return (
                    <div key={letter}
                      className="flex items-start gap-3 rounded-xl px-4 py-3"
                      style={{
                        background: isCorrect ? "rgba(74,222,128,0.08)" : "var(--bg-elevated)",
                        border: `1px solid ${isCorrect ? "rgba(74,222,128,0.35)" : "var(--border)"}`,
                      }}
                    >
                      <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{
                          background: isCorrect ? "rgba(74,222,128,0.2)" : "var(--bg-card)",
                          color: isCorrect ? "#4ade80" : "var(--text-muted)",
                          border: `1px solid ${isCorrect ? "rgba(74,222,128,0.5)" : "var(--border)"}`,
                        }}>
                        {letter}
                      </span>
                      <span className="text-sm leading-relaxed" style={{ color: isCorrect ? "#4ade80" : "var(--text-primary)" }}>
                        {text}
                      </span>
                      {isCorrect && (
                        <span className="ml-auto flex-shrink-0 text-xs font-semibold" style={{ color: "#4ade80" }}>✓ Correct</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Explanation */}
              <div className="rounded-xl p-4" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--accent-blue)" }}>
                  Explanation
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>{q.explanation}</p>
              </div>

              {/* Meta */}
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                ID: {q.id} · Created {new Date(q.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DatabaseTab() {
  const [stats, setStats]         = useState<Stats | null>(null);
  const [loading, setLoading]     = useState(true);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [expandedId, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d: Stats) => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function handleDelete(id: string) {
    setDeleting(id);
    fetch(`/api/admin/questions/${id}`, { method: "DELETE" }).then(() => {
      setStats((prev) =>
        prev ? { ...prev, total: prev.total - 1, recent: prev.recent.filter((q) => q.id !== id) } : prev
      );
      setDeleting(null);
    });
  }

  const fmtDate = (s: string) =>
    new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  if (loading) return <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading stats…</p>;
  if (!stats) return null;

  return (
    <div>
      {expandedId && (
        <QuestionModal
          id={expandedId}
          onClose={() => setExpanded(null)}
          onDelete={(id) => {
            setStats((prev) =>
              prev ? { ...prev, total: prev.total - 1, recent: prev.recent.filter((q) => q.id !== id) } : prev
            );
            setExpanded(null);
          }}
        />
      )}

      {/* Section stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {(["Chem/Phys", "CARS", "Bio/Biochem", "Psych/Soc"] as const).map((s) => (
          <div key={s} className="rounded-xl px-4 py-3"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: `3px solid ${SECTION_COLORS[s]}` }}>
            <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{stats.bySection[s] ?? 0}</div>
            <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{s}</div>
          </div>
        ))}
      </div>

      {/* Total + difficulty row */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="rounded-lg px-4 py-2 text-sm font-semibold"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
          {stats.total} total questions
        </div>
        {(["easy", "medium", "hard"] as const).map((d) => (
          <span key={d} className="px-3 py-1.5 rounded-full text-xs font-semibold capitalize"
            style={{ background: `${DIFF_COLORS[d]}18`, color: DIFF_COLORS[d], border: `1px solid ${DIFF_COLORS[d]}40` }}>
            {stats.byDifficulty[d] ?? 0} {d}
          </span>
        ))}
      </div>

      {/* Recent questions table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <div className="px-5 py-3" style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Recent Questions ({stats.recent.length})
            <span className="font-normal ml-2" style={{ color: "var(--text-muted)" }}>— click any row to view</span>
          </h2>
        </div>

        {/* Desktop header */}
        <div className="hidden md:grid text-xs px-4 py-2"
          style={{ gridTemplateColumns: "110px 1fr 80px 110px 60px", background: "var(--bg-elevated)", color: "var(--text-muted)" }}>
          <span>Section</span><span>Stem</span><span>Difficulty</span><span>Date</span><span />
        </div>

        {stats.recent.length === 0 && (
          <div className="px-5 py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            No questions yet. Use the Generation tab to create some.
          </div>
        )}

        {stats.recent.map((q) => (
          <div key={q.id}>
            {/* Desktop row */}
            <div
              onClick={() => setExpanded(q.id)}
              className="hidden md:grid items-center cursor-pointer transition-colors"
              style={{
                gridTemplateColumns: "110px 1fr 80px 110px 60px",
                borderTop: "1px solid var(--border)",
                background: "var(--bg-card)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-card)")}
            >
              <span className="px-4 py-3 text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: SECTION_COLORS[q.section] }} />
                <span style={{ color: "var(--text-secondary)" }}>{q.section}</span>
              </span>
              <span className="px-4 py-3 text-xs" style={{ color: "var(--text-primary)" }}>
                {q.stem.length > 90 ? q.stem.slice(0, 90) + "…" : q.stem}
              </span>
              <span className="px-4 py-3">
                <span className="px-2 py-0.5 rounded text-xs font-semibold capitalize"
                  style={{ background: `${DIFF_COLORS[q.difficulty]}18`, color: DIFF_COLORS[q.difficulty] }}>
                  {q.difficulty}
                </span>
              </span>
              <span className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>{fmtDate(q.createdAt)}</span>
              <span className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => handleDelete(q.id)}
                  disabled={deleting === q.id}
                  className="text-xs px-2 py-1 rounded"
                  style={{ background: "rgba(224,92,92,0.1)", color: "#e05c5c",
                    border: "1px solid rgba(224,92,92,0.25)", opacity: deleting === q.id ? 0.5 : 1 }}
                >
                  {deleting === q.id ? "…" : "Delete"}
                </button>
              </span>
            </div>

            {/* Mobile card */}
            <div
              onClick={() => setExpanded(q.id)}
              className="md:hidden p-4 cursor-pointer"
              style={{ borderTop: "1px solid var(--border)", background: "var(--bg-card)" }}
              onTouchStart={(e) => (e.currentTarget.style.background = "var(--bg-card-hover)")}
              onTouchEnd={(e) => (e.currentTarget.style.background = "var(--bg-card)")}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full" style={{ background: SECTION_COLORS[q.section] }} />
                  <span style={{ color: "var(--text-secondary)" }}>{q.section}</span>
                  <span style={{ color: "var(--text-muted)" }}>· {q.topic}</span>
                </span>
                <span onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleDelete(q.id)}
                    disabled={deleting === q.id}
                    className="text-xs px-2 py-1 rounded"
                    style={{ background: "rgba(224,92,92,0.1)", color: "#e05c5c", border: "1px solid rgba(224,92,92,0.25)" }}
                  >
                    {deleting === q.id ? "…" : "Delete"}
                  </button>
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-primary)" }}>
                {q.stem.length > 100 ? q.stem.slice(0, 100) + "…" : q.stem}
              </p>
              <p className="text-xs mt-1.5" style={{ color: "var(--accent-blue)" }}>Tap to view full question →</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

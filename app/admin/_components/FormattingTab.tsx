"use client";
import { useState, useEffect } from "react";
import { SECTION_COLORS, DIFF_COLORS } from "./shared";
import { PassageRenderer } from "../../components/PassageRenderer";

type Q = {
  id: string;
  section: string;
  topic: string;
  stem: string;
  explanation: string;
  difficulty: string;
  formattingStatus?: string;
};

type CardState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "preview"; formatted: string }
  | { status: "saving" }
  | { status: "done" };

export default function FormattingTab() {
  const [questions, setQuestions] = useState<Q[]>([]);
  const [loading, setLoading]     = useState(true);
  const [cardState, setCardState] = useState<Record<string, CardState>>({});
  const [formatAll, setFormatAll] = useState(false);

  useEffect(() => {
    fetch("/api/admin/questions?auditedOnly=true")
      .then((r) => r.json())
      .then((d: { questions?: Q[] }) => {
        const unformatted = (d.questions ?? []).filter(
          (q) => q.formattingStatus !== "formatted"
        );
        setQuestions(unformatted);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function getState(id: string): CardState {
    return cardState[id] ?? { status: "idle" };
  }

  function setState(id: string, s: CardState) {
    setCardState((prev) => ({ ...prev, [id]: s }));
  }

  async function formatQuestion(id: string) {
    setState(id, { status: "loading" });
    try {
      const res  = await fetch("/api/admin/format", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: id }),
      });
      const data = await res.json() as { formattedExplanation?: string; error?: string };
      if (!res.ok || !data.formattedExplanation) {
        setState(id, { status: "idle" });
        alert(data.error ?? "Format failed");
        return;
      }
      setState(id, { status: "preview", formatted: data.formattedExplanation });
    } catch {
      setState(id, { status: "idle" });
    }
  }

  async function applyFormat(id: string, formatted: string) {
    setState(id, { status: "saving" });
    try {
      await fetch(`/api/admin/questions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ explanation: formatted, formattingStatus: "formatted" }),
      });
      setState(id, { status: "done" });
    } catch {
      setState(id, { status: "preview", formatted });
    }
  }

  async function runFormatAll() {
    setFormatAll(true);
    const pending = questions.filter((q) => {
      const s = getState(q.id).status;
      return s === "idle";
    });
    for (const q of pending) {
      await formatQuestion(q.id);
      // Auto-apply after formatting in batch mode
      setCardState((prev) => {
        const s = prev[q.id];
        if (s?.status === "preview") {
          applyFormat(q.id, s.formatted);
        }
        return prev;
      });
    }
    setFormatAll(false);
  }

  const pending = questions.filter((q) => getState(q.id).status !== "done");

  if (loading) {
    return <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading…</p>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Explanation Formatting
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: pending.length > 0 ? "rgba(245,158,11,0.12)" : "rgba(74,222,128,0.12)",
                color: pending.length > 0 ? "#f59e0b" : "#4ade80" }}>
              {pending.length}
            </span>
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            AI adds bold, italics, highlights, and lists to explanations. Preview before saving.
          </p>
        </div>
        {pending.length > 0 && (
          <button
            onClick={runFormatAll}
            disabled={formatAll}
            className="px-4 py-2 rounded-lg text-sm font-semibold flex-shrink-0 ml-4"
            style={{ background: "var(--accent-blue)", color: "#fff", opacity: formatAll ? 0.6 : 1 }}
          >
            {formatAll ? "Formatting…" : "Format All"}
          </button>
        )}
      </div>

      {pending.length === 0 && (
        <div className="rounded-xl py-16 text-center" style={{ border: "1px solid var(--border)" }}>
          <p className="text-sm font-semibold" style={{ color: "#4ade80" }}>All done</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            All audited questions have been formatted.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {questions.map((q) => {
          const s = getState(q.id);
          if (s.status === "done") return null;

          return (
            <div key={q.id} className="rounded-xl overflow-hidden"
              style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}>

              {/* Question header */}
              <div className="px-5 py-3.5 flex items-start justify-between gap-4"
                style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="flex items-center gap-1.5 text-xs font-semibold"
                      style={{ color: SECTION_COLORS[q.section] }}>
                      <span className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: SECTION_COLORS[q.section] }} />
                      {q.section}
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>· {q.topic}</span>
                    <span className="px-2 py-0.5 rounded text-xs font-semibold capitalize"
                      style={{ background: `${DIFF_COLORS[q.difficulty]}18`, color: DIFF_COLORS[q.difficulty] }}>
                      {q.difficulty}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {q.stem.length > 120 ? q.stem.slice(0, 120) + "…" : q.stem}
                  </p>
                </div>

                {s.status === "idle" && (
                  <button
                    onClick={() => formatQuestion(q.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0"
                    style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8",
                      border: "1px solid rgba(99,102,241,0.3)" }}
                  >
                    Format
                  </button>
                )}
                {s.status === "loading" && (
                  <span className="px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0"
                    style={{ background: "rgba(99,102,241,0.08)", color: "#818cf8",
                      border: "1px solid rgba(99,102,241,0.2)" }}>
                    Formatting…
                  </span>
                )}
                {s.status === "saving" && (
                  <span className="px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0"
                    style={{ color: "var(--text-muted)" }}>
                    Saving…
                  </span>
                )}
              </div>

              {/* Current explanation */}
              {(s.status === "idle" || s.status === "loading") && (
                <div className="px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2"
                    style={{ color: "var(--text-muted)" }}>
                    Current Explanation
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {q.explanation}
                  </p>
                </div>
              )}

              {/* Preview */}
              {s.status === "preview" && (
                <>
                  <div className="grid grid-cols-2 divide-x" style={{ borderBottom: "1px solid var(--border)", borderColor: "var(--border)" }}>
                    {/* Before */}
                    <div className="px-5 py-4">
                      <p className="text-xs font-semibold uppercase tracking-wider mb-2"
                        style={{ color: "var(--text-muted)" }}>
                        Before
                      </p>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                        {q.explanation}
                      </p>
                    </div>
                    {/* After */}
                    <div className="px-5 py-4">
                      <p className="text-xs font-semibold uppercase tracking-wider mb-2"
                        style={{ color: "#818cf8" }}>
                        After
                      </p>
                      <PassageRenderer
                        text={s.formatted}
                        style={{ fontSize: "0.75rem", lineHeight: 1.65, color: "var(--text-primary)",
                          fontFamily: "inherit" }}
                      />
                    </div>
                  </div>
                  <div className="px-5 py-3 flex items-center gap-2">
                    <button
                      onClick={() => applyFormat(q.id, s.formatted)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: "rgba(74,222,128,0.12)", color: "#4ade80",
                        border: "1px solid rgba(74,222,128,0.3)" }}
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => setState(q.id, { status: "idle" })}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: "rgba(224,92,92,0.1)", color: "#e05c5c",
                        border: "1px solid rgba(224,92,92,0.25)" }}
                    >
                      Discard
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

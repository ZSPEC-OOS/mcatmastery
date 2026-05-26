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
  passageGroupId?: string | null;
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
  const [reauditing, setReauditing] = useState<Set<string>>(new Set());

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

  async function formatQuestion(id: string): Promise<string | null> {
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
        return null;
      }
      setState(id, { status: "preview", formatted: data.formattedExplanation });
      return data.formattedExplanation;
    } catch {
      setState(id, { status: "idle" });
      return null;
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

  async function reauditQuestion(id: string) {
    if (reauditing.has(id)) return;
    setReauditing((r) => new Set([...r, id]));
    try {
      await fetch(`/api/admin/questions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditStatus: "needs_audit" }),
      });
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    } finally {
      setReauditing((r) => { const n = new Set(r); n.delete(id); return n; });
    }
  }

  async function reauditGroup(ids: string[]) {
    if (ids.some((id) => reauditing.has(id))) return;
    setReauditing((r) => new Set([...r, ...ids]));
    try {
      await Promise.allSettled(
        ids.map((id) =>
          fetch(`/api/admin/questions/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ auditStatus: "needs_audit" }),
          })
        )
      );
      setQuestions((prev) => prev.filter((q) => !ids.includes(q.id)));
    } finally {
      setReauditing((r) => { const n = new Set(r); ids.forEach((id) => n.delete(id)); return n; });
    }
  }

  async function runFormatAll() {
    setFormatAll(true);
    const pending = questions.filter((q) => {
      const s = getState(q.id).status;
      return s === "idle";
    });
    for (const q of pending) {
      const formatted = await formatQuestion(q.id);
      if (formatted) await applyFormat(q.id, formatted);
    }
    setFormatAll(false);
  }

  const pending = questions.filter((q) => getState(q.id).status !== "done");

  // Group passage siblings together
  const passageMapFmt: Record<string, Q[]> = {};
  for (const q of questions) {
    if (q.passageGroupId) (passageMapFmt[q.passageGroupId] ??= []).push(q);
  }
  const fmtRows: Array<{ kind: "q"; q: Q } | { kind: "pg"; id: string; qs: Q[] }> = [];
  {
    const seen = new Set<string>();
    for (const q of questions) {
      if (!q.passageGroupId) {
        fmtRows.push({ kind: "q", q });
      } else if (!seen.has(q.passageGroupId)) {
        seen.add(q.passageGroupId);
        fmtRows.push({ kind: "pg", id: q.passageGroupId, qs: passageMapFmt[q.passageGroupId] });
      }
    }
  }

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
        {fmtRows.map((row) => {
          if (row.kind === "q") {
            const q = row.q;
            const s = getState(q.id);
            if (s.status === "done") return null;
            return (
              <div key={q.id} className="rounded-xl overflow-hidden"
                style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}>
                <div className="px-5 py-3.5 flex items-start justify-between gap-4"
                  style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: SECTION_COLORS[q.section] }}>
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: SECTION_COLORS[q.section] }} />
                        {q.section}
                      </span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>· {q.topic}</span>
                      <span className="px-2 py-0.5 rounded text-xs font-semibold capitalize"
                        style={{ background: `${DIFF_COLORS[q.difficulty]}18`, color: DIFF_COLORS[q.difficulty] }}>
                        {q.difficulty}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-xs font-semibold"
                        style={{ background: "rgba(100,116,139,0.12)", color: "#94a3b8", border: "1px solid rgba(100,116,139,0.25)" }}>
                        Discrete
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      {q.stem.length > 120 ? q.stem.slice(0, 120) + "…" : q.stem}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {s.status === "idle" && (
                      <button onClick={() => formatQuestion(q.id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }}>
                        Format
                      </button>
                    )}
                    {s.status === "loading" && (
                      <span className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: "rgba(99,102,241,0.08)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)" }}>
                        Formatting…
                      </span>
                    )}
                    {s.status === "saving" && (
                      <span className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                        Saving…
                      </span>
                    )}
                    {(s.status === "idle" || s.status === "preview") && (
                      <button
                        onClick={() => reauditQuestion(q.id)}
                        disabled={reauditing.has(q.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: "rgba(245,158,11,0.08)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)", opacity: reauditing.has(q.id) ? 0.5 : 1 }}
                      >
                        {reauditing.has(q.id) ? "Sending…" : "Reaudit"}
                      </button>
                    )}
                  </div>
                </div>
                {(s.status === "idle" || s.status === "loading") && (
                  <div className="px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                      Current Explanation
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{q.explanation}</p>
                  </div>
                )}
                {s.status === "preview" && (
                  <>
                    <div className="grid grid-cols-2 divide-x" style={{ borderBottom: "1px solid var(--border)", borderColor: "var(--border)" }}>
                      <div className="px-5 py-4">
                        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Before</p>
                        <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{q.explanation}</p>
                      </div>
                      <div className="px-5 py-4">
                        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#818cf8" }}>After</p>
                        <PassageRenderer text={s.formatted} style={{ fontSize: "0.75rem", lineHeight: 1.65, color: "var(--text-primary)", fontFamily: "inherit" }} />
                      </div>
                    </div>
                    <div className="px-5 py-3 flex items-center gap-2">
                      <button onClick={() => applyFormat(q.id, s.formatted)} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: "rgba(74,222,128,0.12)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)" }}>
                        Apply
                      </button>
                      <button onClick={() => setState(q.id, { status: "idle" })} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: "rgba(224,92,92,0.1)", color: "#e05c5c", border: "1px solid rgba(224,92,92,0.25)" }}>
                        Discard
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          }

          // Passage group
          const { id: groupId, qs } = row;
          const visibleQs = qs.filter((q) => getState(q.id).status !== "done");
          if (visibleQs.length === 0) return null;
          return (
            <div key={groupId} className="rounded-xl overflow-hidden"
              style={{ border: "1px solid rgba(167,139,250,0.4)", background: "var(--bg-card)" }}>
              {/* Group header */}
              <div className="px-5 py-3 flex items-center justify-between gap-2"
                style={{ background: "rgba(167,139,250,0.06)", borderBottom: "1px solid rgba(167,139,250,0.2)" }}>
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded text-xs font-semibold"
                    style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.35)" }}>
                    Passage Set
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {visibleQs.length} question{visibleQs.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <button
                  onClick={() => reauditGroup(qs.map((q) => q.id))}
                  disabled={qs.some((q) => reauditing.has(q.id))}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0"
                  style={{ background: "rgba(245,158,11,0.08)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)", opacity: qs.some((q) => reauditing.has(q.id)) ? 0.5 : 1 }}
                >
                  {qs.some((q) => reauditing.has(q.id)) ? "Sending…" : "Reaudit Set"}
                </button>
              </div>
              {/* Individual question cards within the group */}
              {qs.map((q) => {
                const s = getState(q.id);
                if (s.status === "done") return null;
                return (
                  <div key={q.id} style={{ borderTop: "1px solid rgba(167,139,250,0.15)" }}>
                    <div className="px-5 py-3.5 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: SECTION_COLORS[q.section] }}>
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: SECTION_COLORS[q.section] }} />
                            {q.section}
                          </span>
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>· {q.topic}</span>
                          <span className="px-2 py-0.5 rounded text-xs font-semibold capitalize"
                            style={{ background: `${DIFF_COLORS[q.difficulty]}18`, color: DIFF_COLORS[q.difficulty] }}>
                            {q.difficulty}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-xs font-semibold"
                            style={{ background: "rgba(167,139,250,0.12)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.25)" }}>
                            Passage
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                          {q.stem.length > 120 ? q.stem.slice(0, 120) + "…" : q.stem}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {s.status === "idle" && (
                          <button onClick={() => formatQuestion(q.id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                            style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }}>
                            Format
                          </button>
                        )}
                        {s.status === "loading" && (
                          <span className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                            style={{ background: "rgba(99,102,241,0.08)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)" }}>
                            Formatting…
                          </span>
                        )}
                        {s.status === "saving" && (
                          <span className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                            Saving…
                          </span>
                        )}
                        {(s.status === "idle" || s.status === "preview") && (
                          <button
                            onClick={() => reauditQuestion(q.id)}
                            disabled={reauditing.has(q.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                            style={{ background: "rgba(245,158,11,0.08)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)", opacity: reauditing.has(q.id) ? 0.5 : 1 }}
                          >
                            {reauditing.has(q.id) ? "Sending…" : "Reaudit"}
                          </button>
                        )}
                      </div>
                    </div>
                    {(s.status === "idle" || s.status === "loading") && (
                      <div className="px-5 py-4" style={{ borderTop: "1px solid rgba(167,139,250,0.1)" }}>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                          Current Explanation
                        </p>
                        <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{q.explanation}</p>
                      </div>
                    )}
                    {s.status === "preview" && (
                      <>
                        <div className="grid grid-cols-2 divide-x"
                          style={{ borderTop: "1px solid rgba(167,139,250,0.1)", borderBottom: "1px solid rgba(167,139,250,0.15)", borderColor: "var(--border)" }}>
                          <div className="px-5 py-4">
                            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Before</p>
                            <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{q.explanation}</p>
                          </div>
                          <div className="px-5 py-4">
                            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#818cf8" }}>After</p>
                            <PassageRenderer text={s.formatted} style={{ fontSize: "0.75rem", lineHeight: 1.65, color: "var(--text-primary)", fontFamily: "inherit" }} />
                          </div>
                        </div>
                        <div className="px-5 py-3 flex items-center gap-2" style={{ borderTop: "1px solid rgba(167,139,250,0.1)" }}>
                          <button onClick={() => applyFormat(q.id, s.formatted)} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                            style={{ background: "rgba(74,222,128,0.12)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)" }}>
                            Apply
                          </button>
                          <button onClick={() => setState(q.id, { status: "idle" })} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                            style={{ background: "rgba(224,92,92,0.1)", color: "#e05c5c", border: "1px solid rgba(224,92,92,0.25)" }}>
                            Discard
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";
import { useState, useEffect, useMemo } from "react";
import { SECTION_COLORS, DIFF_COLORS } from "./shared";

type Q = {
  id: string;
  section: string;
  topic: string;
  stem: string;
  difficulty: string;
  formattingStatus?: string;
  locked?: boolean;
  passageGroupId?: string | null;
  passage?: string | null;
};

function LockIcon({ locked }: { locked: boolean }) {
  return locked ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  );
}

export default function LockedTab() {
  const [questions, setQuestions] = useState<Q[]>([]);
  const [loading, setLoading]     = useState(true);
  const [toggling, setToggling]   = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/admin/questions?auditedOnly=true")
      .then((r) => r.json())
      .then((d: { questions?: Q[] }) => {
        setQuestions((d.questions ?? []).filter((q) => q.formattingStatus === "formatted"));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Split into passage groups (Map preserves insertion order) and discrete list
  const { passageGroups, discrete } = useMemo(() => {
    const groups = new Map<string, Q[]>();
    const disc: Q[] = [];
    for (const q of questions) {
      if (q.passageGroupId) {
        const g = groups.get(q.passageGroupId) ?? [];
        g.push(q);
        groups.set(q.passageGroupId, g);
      } else {
        disc.push(q);
      }
    }
    return { passageGroups: groups, discrete: disc };
  }, [questions]);

  async function patchQuestion(id: string, locked: boolean) {
    await fetch(`/api/admin/questions/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ locked }),
    });
  }

  async function toggleLock(q: Q) {
    if (toggling.has(q.id)) return;
    const newLocked = !q.locked;
    setToggling((t) => new Set([...t, q.id]));
    setQuestions((prev) => prev.map((x) => (x.id === q.id ? { ...x, locked: newLocked } : x)));
    try {
      await patchQuestion(q.id, newLocked);
    } catch {
      setQuestions((prev) => prev.map((x) => (x.id === q.id ? { ...x, locked: q.locked } : x)));
    } finally {
      setToggling((t) => { const n = new Set(t); n.delete(q.id); return n; });
    }
  }

  async function toggleGroupLock(groupQs: Q[]) {
    const allLocked = groupQs.every((q) => q.locked);
    const newLocked = !allLocked;
    const ids = groupQs.map((q) => q.id);
    setToggling((t) => new Set([...t, ...ids]));
    setQuestions((prev) => prev.map((x) => (ids.includes(x.id) ? { ...x, locked: newLocked } : x)));
    await Promise.allSettled(ids.map((id) => patchQuestion(id, newLocked)));
    setToggling((t) => { const n = new Set(t); ids.forEach((id) => n.delete(id)); return n; });
  }

  async function lockAll() {
    const unlocked = questions.filter((q) => !q.locked);
    setQuestions((prev) => prev.map((x) => (unlocked.some((u) => u.id === x.id) ? { ...x, locked: true } : x)));
    await Promise.allSettled(unlocked.map((q) => patchQuestion(q.id, true)));
  }

  async function unlockAll() {
    const locked = questions.filter((q) => q.locked);
    setQuestions((prev) => prev.map((x) => (locked.some((l) => l.id === x.id) ? { ...x, locked: false } : x)));
    await Promise.allSettled(locked.map((q) => patchQuestion(q.id, false)));
  }

  const lockedCount   = questions.filter((q) => q.locked).length;
  const unlockedCount = questions.length - lockedCount;

  if (loading) {
    return <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading…</p>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            Locked Questions
            <span
              className="px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{
                background: lockedCount > 0 ? "rgba(245,158,11,0.12)" : "rgba(99,102,241,0.1)",
                color:      lockedCount > 0 ? "#f59e0b"               : "#818cf8",
              }}
            >
              {lockedCount} / {questions.length} locked
            </span>
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Locked questions are skipped when you click Reaudit in the Curriculum. Only formatted questions appear here.
          </p>
        </div>

        {questions.length > 0 && (
          <div className="flex gap-2 flex-shrink-0">
            {unlockedCount > 0 && (
              <button
                onClick={lockAll}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}
              >
                Lock All
              </button>
            )}
            {lockedCount > 0 && (
              <button
                onClick={unlockAll}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              >
                Unlock All
              </button>
            )}
          </div>
        )}
      </div>

      {/* Empty state */}
      {questions.length === 0 && (
        <div className="rounded-xl py-16 text-center" style={{ border: "1px solid var(--border)" }}>
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-muted)" }}>No formatted questions yet</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Complete the Formatting step first — formatted questions appear here for locking.
          </p>
        </div>
      )}

      {/* ── Passage Sets ──────────────────────────────────────────────────────── */}
      {passageGroups.size > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
            Passage Sets
            <span className="ml-2 normal-case font-normal">
              {passageGroups.size} {passageGroups.size === 1 ? "set" : "sets"} · {[...passageGroups.values()].reduce((s, g) => s + g.length, 0)} questions
            </span>
          </p>

          <div className="space-y-3">
            {[...passageGroups.entries()].map(([groupId, groupQs]) => {
              const allLocked     = groupQs.every((q) => q.locked);
              const someLocked    = groupQs.some((q) => q.locked);
              const groupToggling = groupQs.some((q) => toggling.has(q.id));
              const rep           = groupQs[0];
              const passagePreview = (rep.passage ?? "").slice(0, 140).trimEnd();

              return (
                <div
                  key={groupId}
                  className="rounded-xl overflow-hidden"
                  style={{
                    border: `1px solid ${allLocked ? "rgba(245,158,11,0.35)" : someLocked ? "rgba(245,158,11,0.18)" : "var(--border)"}`,
                    background: allLocked ? "rgba(245,158,11,0.03)" : "var(--bg-card)",
                  }}
                >
                  {/* Group header */}
                  <div
                    className="flex items-center gap-3 px-4 py-3"
                    style={{
                      borderBottom: "1px solid var(--border)",
                      background: allLocked ? "rgba(245,158,11,0.06)" : "var(--bg-elevated)",
                    }}
                  >
                    {/* Group lock toggle */}
                    <button
                      onClick={() => toggleGroupLock(groupQs)}
                      disabled={groupToggling}
                      title={allLocked ? "Unlock entire set" : "Lock entire set"}
                      className="flex-shrink-0 rounded-lg px-2.5 py-1 flex items-center gap-1.5 text-xs font-semibold transition-colors"
                      style={{
                        background: allLocked ? "rgba(245,158,11,0.16)" : "var(--bg-card)",
                        border:     `1px solid ${allLocked ? "rgba(245,158,11,0.45)" : "var(--border)"}`,
                        color:      allLocked ? "#f59e0b" : "var(--text-muted)",
                        opacity:    groupToggling ? 0.45 : 1,
                        cursor:     groupToggling ? "not-allowed" : "pointer",
                      }}
                    >
                      <LockIcon locked={allLocked} />
                      {allLocked ? "Unlock Set" : "Lock Set"}
                    </button>

                    {/* Group metadata */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: SECTION_COLORS[rep.section] }}>
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: SECTION_COLORS[rep.section] }} />
                          {rep.section}
                        </span>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>· {rep.topic}</span>
                        <span
                          className="px-1.5 py-0.5 rounded text-xs font-semibold"
                          style={{ background: "rgba(99,102,241,0.1)", color: "#818cf8" }}
                        >
                          {groupQs.length} {groupQs.length === 1 ? "question" : "questions"}
                        </span>
                        {someLocked && !allLocked && (
                          <span className="px-1.5 py-0.5 rounded text-xs" style={{ color: "var(--text-muted)", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
                            {groupQs.filter((q) => q.locked).length} locked
                          </span>
                        )}
                      </div>
                      {passagePreview && (
                        <p className="text-xs mt-0.5 leading-snug truncate" style={{ color: "var(--text-muted)" }}>
                          {passagePreview}{(rep.passage ?? "").length > 140 ? "…" : ""}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Individual questions in the group */}
                  <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                    {groupQs.map((q, idx) => (
                      <div
                        key={q.id}
                        className="flex items-center gap-3 px-4 py-2.5 transition-colors"
                        style={{
                          background: q.locked ? "rgba(245,158,11,0.03)" : "transparent",
                        }}
                      >
                        {/* Individual lock toggle */}
                        <button
                          onClick={() => toggleLock(q)}
                          disabled={toggling.has(q.id)}
                          title={q.locked ? "Unlock this question" : "Lock this question"}
                          className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                          style={{
                            background: q.locked ? "rgba(245,158,11,0.14)" : "var(--bg-elevated)",
                            border:     `1px solid ${q.locked ? "rgba(245,158,11,0.4)" : "var(--border)"}`,
                            opacity:    toggling.has(q.id) ? 0.45 : 1,
                            cursor:     toggling.has(q.id) ? "not-allowed" : "pointer",
                          }}
                        >
                          <LockIcon locked={!!q.locked} />
                        </button>

                        {/* Q number + info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Q{idx + 1}</span>
                            <span
                              className="px-1.5 py-0.5 rounded text-xs font-semibold capitalize"
                              style={{ background: `${DIFF_COLORS[q.difficulty]}18`, color: DIFF_COLORS[q.difficulty] }}
                            >
                              {q.difficulty}
                            </span>
                            {q.locked && (
                              <span
                                className="px-1.5 py-0.5 rounded text-xs font-semibold"
                                style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}
                              >
                                Locked
                              </span>
                            )}
                          </div>
                          <p className="text-xs leading-snug" style={{ color: "var(--text-secondary)" }}>
                            {q.stem.length > 140 ? q.stem.slice(0, 140) + "…" : q.stem}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Discrete Questions ────────────────────────────────────────────────── */}
      {discrete.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
            Discrete Questions
            <span className="ml-2 normal-case font-normal">{discrete.length} {discrete.length === 1 ? "question" : "questions"}</span>
          </p>

          <div className="space-y-2">
            {discrete.map((q) => (
              <div
                key={q.id}
                className="rounded-xl px-4 py-3 flex items-center gap-4 transition-colors"
                style={{
                  background: q.locked ? "rgba(245,158,11,0.04)" : "var(--bg-card)",
                  border:     `1px solid ${q.locked ? "rgba(245,158,11,0.28)" : "var(--border)"}`,
                }}
              >
                <button
                  onClick={() => toggleLock(q)}
                  disabled={toggling.has(q.id)}
                  title={q.locked ? "Unlock — allow reaudit" : "Lock — skip reaudit"}
                  className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{
                    background: q.locked ? "rgba(245,158,11,0.14)" : "var(--bg-elevated)",
                    border:     `1px solid ${q.locked ? "rgba(245,158,11,0.4)" : "var(--border)"}`,
                    opacity:    toggling.has(q.id) ? 0.45 : 1,
                    cursor:     toggling.has(q.id) ? "not-allowed" : "pointer",
                  }}
                >
                  <LockIcon locked={!!q.locked} />
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: SECTION_COLORS[q.section] }}>
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: SECTION_COLORS[q.section] }} />
                      {q.section}
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>· {q.topic}</span>
                    <span
                      className="px-1.5 py-0.5 rounded text-xs font-semibold capitalize"
                      style={{ background: `${DIFF_COLORS[q.difficulty]}18`, color: DIFF_COLORS[q.difficulty] }}
                    >
                      {q.difficulty}
                    </span>
                    {q.locked && (
                      <span
                        className="px-1.5 py-0.5 rounded text-xs font-semibold"
                        style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}
                      >
                        Locked
                      </span>
                    )}
                  </div>
                  <p className="text-xs leading-snug" style={{ color: "var(--text-secondary)" }}>
                    {q.stem.length > 150 ? q.stem.slice(0, 150) + "…" : q.stem}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

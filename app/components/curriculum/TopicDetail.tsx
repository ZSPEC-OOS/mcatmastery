"use client";
import { useEffect, useState, useCallback } from "react";
import { CURRICULUM_SECTIONS, SECTION_ID_TO_LABEL, getGroupTopics } from "../../../lib/curriculum-sections";
import { SECTION_COLORS, DIFF_COLORS } from "../../admin/_components/shared";
import { PassageRenderer } from "../PassageRenderer";
import type { QuestionDoc } from "../../../lib/firestore";

// ── Question view modal ────────────────────────────────────────────────────────

const OPTIONS = ["A", "B", "C", "D"] as const;

function QuestionModal({ q, onClose }: { q: QuestionDoc; onClose: () => void }) {
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);
  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(3px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
          style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="flex items-center gap-1.5 text-xs font-semibold"
              style={{ color: SECTION_COLORS[q.section] }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: SECTION_COLORS[q.section] }} />
              {q.section}
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>· {q.topic}</span>
            <span
              className="px-2 py-0.5 rounded text-xs font-semibold capitalize"
              style={{ background: `${DIFF_COLORS[q.difficulty]}18`, color: DIFF_COLORS[q.difficulty] }}
            >
              {q.difficulty}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-lg leading-none"
            style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Figure */}
          {q.figureUrl && (
            <img
              src={q.figureUrl}
              alt="Figure"
              className="w-full rounded-xl object-contain max-h-64"
              style={{ border: "1px solid var(--border)" }}
            />
          )}

          {/* Passage */}
          {q.passage && (
            <div className="rounded-xl p-4" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                Passage
              </p>
              <PassageRenderer text={q.passage} style={{ color: "var(--text-primary)" }} />
            </div>
          )}

          {/* Stem */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
              Question
            </p>
            <p
              className="text-sm font-medium leading-relaxed"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-playfair), Georgia, serif" }}
            >
              {q.stem}
            </p>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Answer Choices
            </p>
            {OPTIONS.map((letter) => {
              const text      = q[`option${letter}` as keyof QuestionDoc] as string;
              const isCorrect = q.correctAnswer === letter;
              return (
                <div
                  key={letter}
                  className="flex items-start gap-3 rounded-xl px-4 py-3"
                  style={{
                    background: isCorrect ? "rgba(74,222,128,0.08)" : "var(--bg-elevated)",
                    border: `1px solid ${isCorrect ? "rgba(74,222,128,0.35)" : "var(--border)"}`,
                  }}
                >
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: isCorrect ? "rgba(74,222,128,0.2)" : "var(--bg-card)",
                      color: isCorrect ? "#4ade80" : "var(--text-muted)",
                      border: `1px solid ${isCorrect ? "rgba(74,222,128,0.5)" : "var(--border)"}`,
                    }}
                  >
                    {letter}
                  </span>
                  <span className="text-sm leading-relaxed flex-1" style={{ color: isCorrect ? "#4ade80" : "var(--text-primary)" }}>
                    {text}
                  </span>
                  {isCorrect && (
                    <span className="ml-auto flex-shrink-0 text-xs font-semibold" style={{ color: "#4ade80" }}>
                      ✓ Correct
                    </span>
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
            <PassageRenderer text={q.explanation} style={{ color: "var(--text-primary)" }} className="text-sm leading-relaxed" />
          </div>

          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            ID: {q.id} · Created {new Date(q.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Parse selection key ───────────────────────────────────────────────────────

type SelectionInfo =
  | { type: "none" }
  | { type: "section"; sectionId: string; sectionLabel: string }
  | { type: "group"; sectionId: string; sectionLabel: string; groupName: string; topics: string[] }
  | { type: "topic"; sectionId: string; sectionLabel: string; topicLabel: string };

function parseKey(key: string): SelectionInfo {
  if (!key) return { type: "none" };
  const colonIdx = key.indexOf(":");
  if (colonIdx === -1) return { type: "none" };
  const tag  = key.slice(0, colonIdx);
  const rest = key.slice(colonIdx + 1);

  if (tag === "section") {
    const sectionLabel = SECTION_ID_TO_LABEL[rest] ?? rest;
    return { type: "section", sectionId: rest, sectionLabel };
  }
  if (tag === "group") {
    const colonIdx2 = rest.indexOf(":");
    if (colonIdx2 === -1) return { type: "none" };
    const sectionId   = rest.slice(0, colonIdx2);
    const groupName   = rest.slice(colonIdx2 + 1);
    const sectionLabel = SECTION_ID_TO_LABEL[sectionId] ?? sectionId;
    const topics = getGroupTopics(sectionId, groupName);
    return { type: "group", sectionId, sectionLabel, groupName, topics };
  }
  if (tag === "topic") {
    const colonIdx2 = rest.indexOf(":");
    if (colonIdx2 === -1) return { type: "none" };
    const sectionId   = rest.slice(0, colonIdx2);
    const topicLabel  = rest.slice(colonIdx2 + 1);
    const sectionLabel = SECTION_ID_TO_LABEL[sectionId] ?? sectionId;
    return { type: "topic", sectionId, sectionLabel, topicLabel };
  }
  return { type: "none" };
}

// ── Main component ────────────────────────────────────────────────────────────

type Props = { selectionKey: string };

export default function TopicDetail({ selectionKey }: Props) {
  const [questions, setQuestions]   = useState<QuestionDoc[]>([]);
  const [loading, setLoading]       = useState(false);
  const [viewQ, setViewQ]           = useState<QuestionDoc | null>(null);
  const [reauditing, setReauditing] = useState(false);
  const [reauditDone, setReauditDone] = useState(false);
  const [reformatting, setReformatting] = useState(false);
  const [reformatDone, setReformatDone] = useState(false);

  const sel = parseKey(selectionKey);

  useEffect(() => {
    setQuestions([]);
    setReauditDone(false);
    setReformatDone(false);
    if (sel.type === "none") return;

    setLoading(true);
    const sectionLabel = (sel as { sectionLabel: string }).sectionLabel;

    if (sel.type === "section") {
      fetch(`/api/curriculum/questions?section=${encodeURIComponent(sectionLabel)}`)
        .then((r) => r.json())
        .then((d: { questions?: QuestionDoc[] }) => { setQuestions(d.questions ?? []); setLoading(false); })
        .catch(() => setLoading(false));
    } else if (sel.type === "group") {
      fetch(`/api/curriculum/questions?section=${encodeURIComponent(sectionLabel)}`)
        .then((r) => r.json())
        .then((d: { questions?: QuestionDoc[] }) => {
          const topicSet = new Set(sel.topics);
          setQuestions((d.questions ?? []).filter((q) => topicSet.has(q.topic)));
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else if (sel.type === "topic") {
      fetch(
        `/api/curriculum/questions?section=${encodeURIComponent(sectionLabel)}&topic=${encodeURIComponent(sel.topicLabel)}`
      )
        .then((r) => r.json())
        .then((d: { questions?: QuestionDoc[] }) => { setQuestions(d.questions ?? []); setLoading(false); })
        .catch(() => setLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey]);

  const unlockedQuestions = questions.filter((q) => !q.locked);
  const lockedCount       = questions.length - unlockedQuestions.length;

  async function handleReformat() {
    if (questions.length === 0) return;
    setReformatting(true);
    try {
      await Promise.all(
        questions.map((q) =>
          fetch(`/api/admin/questions/${q.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ formattingStatus: "needs_format" }),
          })
        )
      );
      setReformatDone(true);
      setTimeout(() => setReformatDone(false), 3000);
    } catch {
      // best-effort
    } finally {
      setReformatting(false);
    }
  }

  async function handleReaudit() {
    if (unlockedQuestions.length === 0) return;
    setReauditing(true);
    try {
      await Promise.all(
        unlockedQuestions.map((q) =>
          fetch(`/api/admin/questions/${q.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ auditStatus: "needs_audit", formattingStatus: "needs_format" }),
          })
        )
      );
      setReauditDone(true);
      setTimeout(() => setReauditDone(false), 3000);
    } catch {
      // best-effort
    } finally {
      setReauditing(false);
    }
  }

  if (sel.type === "none") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.4" strokeLinecap="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
        <div>
          <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Select a section or topic</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Click a section, group, or individual topic in the sidebar to browse questions.
          </p>
        </div>
      </div>
    );
  }

  // Breadcrumb & title
  const breadcrumb = sel.type === "section"
    ? sel.sectionLabel
    : sel.type === "group"
    ? `${sel.sectionLabel} / ${sel.groupName}`
    : `${sel.sectionLabel} / ${sel.topicLabel}`;

  const title = sel.type === "section"
    ? sel.sectionLabel
    : sel.type === "group"
    ? sel.groupName
    : sel.topicLabel;

  const sectionColor = CURRICULUM_SECTIONS.find((s) => s.id === (sel as { sectionId: string }).sectionId)?.color ?? "#6366f1";

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6 min-w-0">
      {/* Breadcrumb */}
      <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{breadcrumb}</p>

      {/* Title row */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{title}</h1>
          {!loading && (
            <span
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{
                background: questions.length >= 10 ? "rgba(74,222,128,0.12)" : questions.length >= 4 ? "rgba(27,58,107,0.12)" : "rgba(245,158,11,0.12)",
                color:      questions.length >= 10 ? "#4ade80"                : questions.length >= 4 ? "var(--accent-blue)"   : "#f59e0b",
                border: `1px solid ${questions.length >= 10 ? "rgba(74,222,128,0.3)" : questions.length >= 4 ? "rgba(27,58,107,0.3)" : "rgba(245,158,11,0.3)"}`,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {questions.length} question{questions.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleReformat}
            disabled={reformatting || questions.length === 0}
            className="px-3 py-2 rounded-lg text-sm font-semibold"
            style={{
              background: reformatDone ? "rgba(74,222,128,0.15)" : "rgba(99,102,241,0.1)",
              color:      reformatDone ? "#4ade80"               : "#6366f1",
              border: `1px solid ${reformatDone ? "rgba(74,222,128,0.4)" : "rgba(99,102,241,0.35)"}`,
              opacity: (reformatting || questions.length === 0) ? 0.5 : 1,
            }}
          >
            {reformatDone ? "✓ Queued for Format" : reformatting ? "Queueing…" : "Reformat"}
          </button>
          <button
            onClick={handleReaudit}
            disabled={reauditing || unlockedQuestions.length === 0}
            className="px-3 py-2 rounded-lg text-sm font-semibold"
            style={{
              background: reauditDone ? "rgba(74,222,128,0.15)" : "rgba(245,158,11,0.1)",
              color:      reauditDone ? "#4ade80"               : "#f59e0b",
              border: `1px solid ${reauditDone ? "rgba(74,222,128,0.4)" : "rgba(245,158,11,0.35)"}`,
              opacity: (reauditing || unlockedQuestions.length === 0) ? 0.5 : 1,
            }}
            title={lockedCount > 0 ? `${lockedCount} locked question${lockedCount !== 1 ? "s" : ""} will be skipped` : undefined}
          >
            {reauditDone
              ? "✓ Queued for Audit"
              : reauditing
              ? "Queueing…"
              : lockedCount > 0
              ? `Reaudit (${unlockedQuestions.length})`
              : "Reaudit"}
          </button>
          <a
            href={`/practice?section=${encodeURIComponent(sel.type === "topic" ? (sel as { topicLabel: string }).topicLabel : "")}`}
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: "var(--accent-blue)", color: "#fff", textDecoration: "none" }}
          >
            Practice
          </a>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div
            className="w-6 h-6 rounded-full border-2 border-current animate-spin"
            style={{ color: "var(--accent-blue)", borderTopColor: "transparent" }}
          />
        </div>
      )}

      {/* Empty state */}
      {!loading && questions.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-16 rounded-xl gap-3"
          style={{ border: "1px solid var(--border)" }}
        >
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="8" fill="rgba(27,58,107,0.1)" />
            <path d="M12 20h16M20 12v16" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>No questions yet</p>
          <p className="text-xs text-center max-w-xs" style={{ color: "var(--text-muted)" }}>
            Generate questions from the Admin panel to populate this topic.
          </p>
        </div>
      )}

      {/* Questions list */}
      {!loading && questions.length > 0 && (
        <div className="space-y-2">
          {questions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => setViewQ(q)}
              className="w-full text-left rounded-xl px-4 py-3 transition-colors"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent-blue)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            >
              <div className="flex items-start gap-3">
                {/* Index + difficulty */}
                <div className="flex flex-col items-center gap-1.5 flex-shrink-0 pt-0.5">
                  <span className="text-xs font-bold tabular-nums w-6 text-center" style={{ color: "var(--text-muted)" }}>
                    {idx + 1}
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded text-xs font-semibold capitalize"
                    style={{ background: `${DIFF_COLORS[q.difficulty]}18`, color: DIFF_COLORS[q.difficulty] }}
                  >
                    {q.difficulty[0].toUpperCase()}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  {/* Topic + passage tag */}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className="text-xs font-semibold"
                      style={{ color: sectionColor }}
                    >
                      {q.topic}
                    </span>
                    {q.passageGroupId && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(167,139,250,0.1)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.25)" }}
                      >
                        Passage
                      </span>
                    )}
                    {q.auditStatus === "audited" && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.25)" }}
                      >
                        Audited
                      </span>
                    )}
                    {q.auditStatus === "needs_audit" && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}
                      >
                        Needs Audit
                      </span>
                    )}
                    {q.locked && (
                      <span
                        className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(245,158,11,0.08)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }}
                        title="Locked — excluded from reaudit"
                      >
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        Locked
                      </span>
                    )}
                  </div>
                  {/* Stem preview */}
                  <p className="text-sm leading-snug" style={{ color: "var(--text-primary)" }}>
                    {q.stem.length > 160 ? q.stem.slice(0, 160) + "…" : q.stem}
                  </p>
                </div>

                <span className="text-xs flex-shrink-0 mt-1" style={{ color: "var(--text-muted)" }}>→</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Question modal */}
      {viewQ && <QuestionModal q={viewQ} onClose={() => setViewQ(null)} />}
    </div>
  );
}

"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import TopicSidebar from "../components/curriculum/TopicSidebar";
import TopicDetail from "../components/curriculum/TopicDetail";
import RightPanel from "../components/curriculum/RightPanel";
import { CURRICULUM_SECTIONS } from "../../lib/curriculum-sections";

// ── Types ─────────────────────────────────────────────────────────────────────

type UnmatchedItem = { id: string; topic: string; section: string; stem: string };
type ReconcileResult = { fixed: number; unmatched: UnmatchedItem[] };
type ReconcileState  = "idle" | "running" | "done";

type CardStatus = "loadingSuggestion" | "ready" | "assigning" | "deleting" | "done";
type CardState  = { status: CardStatus; suggestion: string | null; error: string | null };

// ── Unmatched modal ────────────────────────────────────────────────────────────

function UnmatchedModal({
  items,
  onClose,
  onResolved,
}: {
  items: UnmatchedItem[];
  onClose: () => void;
  onResolved: (id: string) => void;
}) {
  const [cards, setCards] = useState<Record<string, CardState>>(() =>
    Object.fromEntries(items.map((item) => [item.id, { status: "loadingSuggestion", suggestion: null, error: null }]))
  );
  const [topicPicker, setTopicPicker] = useState<Record<string, string>>({});

  // Fetch AI suggestions for all items on mount
  useEffect(() => {
    items.forEach((item) => {
      fetch("/api/admin/reconcile-topics/suggest", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ stem: item.stem, section: item.section, originalTopic: item.topic }),
      })
        .then((r) => r.json())
        .then((d: { suggestion?: string; error?: string }) => {
          setCards((prev) => ({
            ...prev,
            [item.id]: {
              status:     "ready",
              suggestion: d.suggestion ?? null,
              error:      d.error ?? null,
            },
          }));
          if (d.suggestion) {
            setTopicPicker((prev) => ({ ...prev, [item.id]: d.suggestion! }));
          }
        })
        .catch(() => {
          setCards((prev) => ({
            ...prev,
            [item.id]: { status: "ready", suggestion: null, error: "Could not get suggestion" },
          }));
        });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close on Escape
  const handleKey = useCallback((e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }, [onClose]);
  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  async function assignTopic(id: string, newTopic: string) {
    setCards((prev) => ({ ...prev, [id]: { ...prev[id], status: "assigning" } }));
    try {
      await fetch(`/api/admin/questions/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ topic: newTopic }),
      });
      setCards((prev) => ({ ...prev, [id]: { ...prev[id], status: "done" } }));
      onResolved(id);
    } catch {
      setCards((prev) => ({ ...prev, [id]: { ...prev[id], status: "ready", error: "Assign failed" } }));
    }
  }

  async function deleteQuestion(id: string) {
    setCards((prev) => ({ ...prev, [id]: { ...prev[id], status: "deleting" } }));
    try {
      await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
      setCards((prev) => ({ ...prev, [id]: { ...prev[id], status: "done" } }));
      onResolved(id);
    } catch {
      setCards((prev) => ({ ...prev, [id]: { ...prev[id], status: "ready", error: "Delete failed" } }));
    }
  }

  const visible = items.filter((item) => cards[item.id]?.status !== "done");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(3px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Unmatched Topics
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {visible.length} question{visible.length !== 1 ? "s" : ""} with unrecognized topic names —
              assign a canonical topic or delete
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
            style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}
          >
            ×
          </button>
        </div>

        {/* Cards */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {visible.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm font-semibold" style={{ color: "#4ade80" }}>All resolved!</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>You can close this panel.</p>
            </div>
          )}

          {items.map((item) => {
            const card = cards[item.id];
            if (!card || card.status === "done") return null;

            const sectionTopics = CURRICULUM_SECTIONS.find((s) => s.label === item.section)
              ?.groups.flatMap((g) => g.topics) ?? [];
            const pickerValue = topicPicker[item.id] ?? sectionTopics[0] ?? "";
            const busy = card.status === "assigning" || card.status === "deleting";

            return (
              <div
                key={item.id}
                className="rounded-xl overflow-hidden"
                style={{ border: "1px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.04)" }}
              >
                {/* Question info */}
                <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(245,158,11,0.15)" }}>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-xs font-semibold" style={{ color: "#f59e0b" }}>
                      Unrecognized:
                    </span>
                    <code
                      className="text-xs px-2 py-0.5 rounded"
                      style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}
                    >
                      {item.topic}
                    </code>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>· {item.section}</span>
                  </div>
                  <p className="text-sm leading-snug" style={{ color: "var(--text-primary)" }}>
                    {item.stem.length > 200 ? item.stem.slice(0, 200) + "…" : item.stem}
                  </p>
                </div>

                {/* AI suggestion + controls */}
                <div className="px-4 py-3 space-y-3">
                  {/* Suggestion row */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                      AI Recommendation
                    </span>
                    {card.status === "loadingSuggestion" && (
                      <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                        <span className="w-3 h-3 rounded-full border border-current animate-spin" style={{ borderTopColor: "transparent" }} />
                        Thinking…
                      </span>
                    )}
                    {card.suggestion && (
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded"
                        style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }}
                      >
                        {card.suggestion}
                      </span>
                    )}
                    {card.error && card.status !== "loadingSuggestion" && (
                      <span className="text-xs" style={{ color: "#e05c5c" }}>{card.error}</span>
                    )}
                  </div>

                  {/* Topic picker + actions */}
                  {card.status !== "loadingSuggestion" && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={pickerValue}
                        onChange={(e) => setTopicPicker((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        disabled={busy}
                        className="flex-1 min-w-0 px-2 py-1.5 rounded-lg text-xs"
                        style={{
                          background: "var(--bg-elevated)",
                          border: "1px solid var(--border)",
                          color: "var(--text-primary)",
                          outline: "none",
                        }}
                      >
                        {sectionTopics.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>

                      <button
                        onClick={() => assignTopic(item.id, pickerValue)}
                        disabled={busy || !pickerValue}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0"
                        style={{
                          background: "rgba(74,222,128,0.12)",
                          color: "#4ade80",
                          border: "1px solid rgba(74,222,128,0.3)",
                          opacity: busy ? 0.5 : 1,
                        }}
                      >
                        {card.status === "assigning" ? "Assigning…" : "Assign Topic"}
                      </button>

                      <button
                        onClick={() => deleteQuestion(item.id)}
                        disabled={busy}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0"
                        style={{
                          background: "rgba(224,92,92,0.1)",
                          color: "#e05c5c",
                          border: "1px solid rgba(224,92,92,0.25)",
                          opacity: busy ? 0.5 : 1,
                        }}
                      >
                        {card.status === "deleting" ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CurriculumPage() {
  const [activeKey, setActiveKey]          = useState("");
  const [mobileSidebarOpen, setMobileOpen] = useState(false);
  const [reconcileState, setRecState]      = useState<ReconcileState>("idle");
  const [reconcileResult, setRecResult]    = useState<ReconcileResult | null>(null);
  const [showModal, setShowModal]          = useState(false);
  const resetTimer                         = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Remove a resolved item from the unmatched list
  function handleResolved(id: string) {
    setRecResult((prev) =>
      prev ? { ...prev, unmatched: prev.unmatched.filter((u) => u.id !== id) } : prev
    );
  }

  async function handleReconcile() {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setRecState("running");
    setRecResult(null);
    try {
      const res  = await fetch("/api/admin/reconcile-topics", { method: "POST" });
      const data = await res.json() as ReconcileResult;
      setRecResult(data);
      setRecState("done");
      // Only auto-reset if no unmatched (otherwise user needs to act)
      if (data.unmatched.length === 0) {
        resetTimer.current = setTimeout(() => setRecState("idle"), 6000);
      }
    } catch {
      setRecState("idle");
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      {/* Sub-header */}
      <div
        className="px-4 md:px-6 py-3 flex items-center gap-3"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-card)" }}
      >
        {/* Mobile: Topics toggle */}
        <button
          className="md:hidden flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0"
          style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
          onClick={() => setMobileOpen(true)}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
          Topics
        </button>

        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Question Bank
        </p>
        <p className="text-xs hidden sm:block" style={{ color: "var(--text-muted)" }}>
          Browse and review all questions by section, group, or topic
        </p>

        <div className="ml-auto flex items-center gap-2">
          {/* Result pill */}
          {reconcileState === "done" && reconcileResult && (
            <div className="flex items-center gap-1.5">
              {reconcileResult.fixed > 0 && (
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: "rgba(74,222,128,0.12)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)" }}
                >
                  ✓ Fixed {reconcileResult.fixed}
                </span>
              )}
              {reconcileResult.unmatched.length > 0 ? (
                <button
                  onClick={() => setShowModal(true)}
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{
                    background: "rgba(245,158,11,0.12)",
                    color: "#f59e0b",
                    border: "1px solid rgba(245,158,11,0.3)",
                    cursor: "pointer",
                  }}
                >
                  {reconcileResult.unmatched.length} unmatched →
                </button>
              ) : (
                reconcileResult.fixed === 0 && (
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(74,222,128,0.12)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)" }}
                  >
                    ✓ All topics matched
                  </span>
                )
              )}
            </div>
          )}

          <button
            onClick={handleReconcile}
            disabled={reconcileState === "running"}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0"
            style={{
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              opacity: reconcileState === "running" ? 0.5 : 1,
            }}
            title="Find questions whose topic name doesn't match any known topic and auto-fix them"
          >
            {reconcileState === "running" ? (
              <>
                <span className="w-3 h-3 rounded-full border border-current animate-spin" style={{ borderTopColor: "transparent" }} />
                Fixing…
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Fix Topics
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3-column main */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Mobile sidebar overlay */}
        {mobileSidebarOpen && (
          <div className="md:hidden absolute inset-0 z-40 flex">
            <div className="flex-shrink-0 overflow-y-auto" style={{ background: "var(--bg-card)" }}>
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Sections</span>
                <button onClick={() => setMobileOpen(false)} style={{ color: "var(--text-secondary)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <TopicSidebar activeKey={activeKey} onSelect={(key) => { setActiveKey(key); setMobileOpen(false); }} />
            </div>
            <div className="flex-1" style={{ background: "rgba(0,0,0,0.55)" }} onClick={() => setMobileOpen(false)} />
          </div>
        )}

        {/* Desktop sidebar */}
        <div className="hidden md:flex flex-shrink-0">
          <TopicSidebar activeKey={activeKey} onSelect={setActiveKey} />
        </div>

        <TopicDetail selectionKey={activeKey} />

        {/* Right panel */}
        <div className="hidden lg:flex flex-shrink-0">
          <RightPanel selectionKey={activeKey} />
        </div>
      </div>

      <Footer />

      {/* Unmatched modal */}
      {showModal && reconcileResult && reconcileResult.unmatched.length > 0 && (
        <UnmatchedModal
          items={reconcileResult.unmatched}
          onClose={() => setShowModal(false)}
          onResolved={handleResolved}
        />
      )}
    </div>
  );
}

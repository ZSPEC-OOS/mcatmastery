"use client";
import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import TopicSidebar from "../components/curriculum/TopicSidebar";
import TopicDetail from "../components/curriculum/TopicDetail";
import RightPanel from "../components/curriculum/RightPanel";

type ReconcileState = "idle" | "running" | "done";
type ReconcileResult = { fixed: number; unmatched: { id: string; topic: string; section: string }[] };

export default function CurriculumPage() {
  const [activeKey, setActiveKey]           = useState("");
  const [mobileSidebarOpen, setMobileOpen]  = useState(false);
  const [reconcileState, setRecState]       = useState<ReconcileState>("idle");
  const [reconcileResult, setRecResult]     = useState<ReconcileResult | null>(null);

  async function handleReconcile() {
    setRecState("running");
    setRecResult(null);
    try {
      const res  = await fetch("/api/admin/reconcile-topics", { method: "POST" });
      const data = await res.json() as ReconcileResult;
      setRecResult(data);
      setRecState("done");
      setTimeout(() => setRecState("idle"), 8000);
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
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{
                background: reconcileResult.unmatched.length > 0
                  ? "rgba(245,158,11,0.12)" : "rgba(74,222,128,0.12)",
                color: reconcileResult.unmatched.length > 0 ? "#f59e0b" : "#4ade80",
                border: `1px solid ${reconcileResult.unmatched.length > 0 ? "rgba(245,158,11,0.3)" : "rgba(74,222,128,0.3)"}`,
              }}
            >
              {reconcileResult.fixed > 0 && `✓ Fixed ${reconcileResult.fixed}`}
              {reconcileResult.fixed > 0 && reconcileResult.unmatched.length > 0 && " · "}
              {reconcileResult.unmatched.length > 0 && `${reconcileResult.unmatched.length} unmatched`}
              {reconcileResult.fixed === 0 && reconcileResult.unmatched.length === 0 && "✓ All topics matched"}
            </span>
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
                <span
                  className="w-3 h-3 rounded-full border border-current animate-spin"
                  style={{ borderTopColor: "transparent" }}
                />
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
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Sections
                </span>
                <button onClick={() => setMobileOpen(false)} style={{ color: "var(--text-secondary)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <TopicSidebar
                activeKey={activeKey}
                onSelect={(key) => { setActiveKey(key); setMobileOpen(false); }}
              />
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
    </div>
  );
}

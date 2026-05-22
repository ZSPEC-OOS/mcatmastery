"use client";
import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import TopicSidebar from "../components/curriculum/TopicSidebar";
import TopicDetail from "../components/curriculum/TopicDetail";
import RightPanel from "../components/curriculum/RightPanel";

export default function CurriculumPage() {
  const [activeKey, setActiveKey]           = useState("");
  const [mobileSidebarOpen, setMobileOpen]  = useState(false);

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

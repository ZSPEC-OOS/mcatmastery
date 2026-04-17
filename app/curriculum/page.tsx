"use client";
import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import TopicSidebar from "../components/curriculum/TopicSidebar";
import TopicDetail from "../components/curriculum/TopicDetail";
import RightPanel from "../components/curriculum/RightPanel";

export default function CurriculumPage() {
  const [activeTopic, setActiveTopic] = useState("chem:Enzyme Kinetics");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      {/* Sub-header: search + filter */}
      <div
        className="px-4 md:px-6 py-3 flex items-center gap-3"
        style={{ borderBottom: "1px solid var(--border)", background: "rgba(13,17,23,0.8)" }}
      >
        {/* Mobile: Topics toggle button */}
        <button
          className="md:hidden flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0"
          style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
          onClick={() => setMobileSidebarOpen(true)}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
          Topics
        </button>

        <div className="flex-1 max-w-md relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="var(--text-muted)" strokeWidth="1.3" />
            <path d="M10 10l2.5 2.5" stroke="var(--text-muted)" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search topics, formulas, concepts..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-sm"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }}
          />
        </div>
        <button
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium flex-shrink-0"
          style={{ background: "rgba(45,106,224,0.2)", color: "#6eaeff", border: "1px solid rgba(45,106,224,0.35)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          <span className="hidden sm:inline">Weak Topics (3)</span>
          <span className="sm:hidden">Weak (3)</span>
        </button>
      </div>

      {/* 3-column main */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Mobile sidebar overlay */}
        {mobileSidebarOpen && (
          <div className="md:hidden absolute inset-0 z-40 flex">
            <div className="flex-shrink-0 overflow-y-auto" style={{ background: "var(--bg-card)" }}>
              {/* Mobile drawer close button */}
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Sections</span>
                <button onClick={() => setMobileSidebarOpen(false)} style={{ color: "var(--text-secondary)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <TopicSidebar
                activeTopic={activeTopic}
                onSelect={(sId, label) => {
                  setActiveTopic(`${sId}:${label}`);
                  setMobileSidebarOpen(false);
                }}
              />
            </div>
            {/* Backdrop */}
            <div className="flex-1" style={{ background: "rgba(0,0,0,0.55)" }} onClick={() => setMobileSidebarOpen(false)} />
          </div>
        )}

        {/* Desktop sidebar (hidden on mobile) */}
        <div className="hidden md:flex flex-shrink-0">
          <TopicSidebar
            activeTopic={activeTopic}
            onSelect={(sId, label) => setActiveTopic(`${sId}:${label}`)}
          />
        </div>

        <TopicDetail topicKey={activeTopic} />

        {/* Right panel — hidden on mobile */}
        <div className="hidden lg:flex flex-shrink-0">
          <RightPanel />
        </div>
      </div>

      <Footer />
    </div>
  );
}

"use client";
import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import TopicSidebar from "../components/curriculum/TopicSidebar";
import TopicDetail from "../components/curriculum/TopicDetail";
import RightPanel from "../components/curriculum/RightPanel";

export default function CurriculumPage() {
  const [activeTopic, setActiveTopic] = useState("chem:Enzyme Kinetics");

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      {/* Sub-header: search + filter */}
      <div
        className="px-6 py-3 flex items-center gap-4"
        style={{ borderBottom: "1px solid var(--border)", background: "rgba(13,17,23,0.8)" }}
      >
        <div className="flex-1 max-w-md relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2"
            width="14" height="14" viewBox="0 0 14 14" fill="none"
          >
            <circle cx="6" cy="6" r="4.5" stroke="var(--text-muted)" strokeWidth="1.3" />
            <path d="M10 10l2.5 2.5" stroke="var(--text-muted)" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search topics, formulas, concepts..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-sm"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              outline: "none",
            }}
          />
        </div>
        <button
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium"
          style={{ background: "rgba(45,106,224,0.2)", color: "#6eaeff", border: "1px solid rgba(45,106,224,0.35)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          Weak Topics (3)
        </button>
      </div>

      {/* 3-column main */}
      <div className="flex flex-1 overflow-hidden">
        <TopicSidebar
          activeTopic={activeTopic}
          onSelect={(sId, label) => setActiveTopic(`${sId}:${label}`)}
        />
        <TopicDetail topicKey={activeTopic} />
        <RightPanel />
      </div>

      <Footer />
    </div>
  );
}

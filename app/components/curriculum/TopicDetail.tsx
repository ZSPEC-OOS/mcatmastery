"use client";
import { useEffect, useState } from "react";

const tabs = ["Summary", "Formulas", "Key Concepts", "Examples"];

const SECTION_LABELS: Record<string, string> = {
  chem: "Chem/Phys", cars: "CARS", bio: "Bio/Biochem", psych: "Psych/Soc",
};

type Props = { topicKey: string };

export default function TopicDetail({ topicKey }: Props) {
  const [activeTab, setActiveTab] = useState("Summary");
  const [accuracy, setAccuracy]   = useState<number | null>(null);
  const [attempted, setAttempted] = useState<number>(0);

  const [sectionId, topicLabel] = topicKey.split(":") as [string, string];
  const sectionLabel = SECTION_LABELS[sectionId] ?? sectionId;

  useEffect(() => {
    setActiveTab("Summary");
    setAccuracy(null);
    setAttempted(0);
    fetch("/api/curriculum")
      .then(r => r.json())
      .then((data: { topicAccuracy: { topic: string; accuracy: number; attempted: number }[] }) => {
        const match = data.topicAccuracy?.find(t => t.topic === topicLabel);
        if (match) {
          setAccuracy(match.accuracy);
          setAttempted(match.attempted);
        }
      })
      .catch(() => {});
  }, [topicKey, topicLabel]);

  const isWeak = accuracy !== null && accuracy < 60;

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6 min-w-0">
      {/* Breadcrumb */}
      <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
        {sectionLabel} / {topicLabel}
      </p>

      {/* Title row */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            {topicLabel}
          </h1>
          {isWeak && (
            <span
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "rgba(240,100,0,0.15)", color: "#f07030", border: "1px solid rgba(240,100,0,0.3)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              Weak Topic
            </span>
          )}
        </div>
        <a
          href={`/practice?topic=${encodeURIComponent(topicLabel)}`}
          className="px-4 py-2 rounded text-sm font-semibold"
          style={{ background: "var(--accent-blue)", color: "#fff", textDecoration: "none" }}
        >
          Start Practice
        </a>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 mb-5 text-sm" style={{ color: "var(--text-secondary)" }}>
        {accuracy !== null ? (
          <>
            <span>Your Accuracy: <strong style={{ color: isWeak ? "#e05c5c" : "#4ade80" }}>{accuracy}%</strong></span>
            <span style={{ color: "var(--border)" }}>|</span>
            <span>Questions Attempted: <strong style={{ color: "var(--text-primary)" }}>{attempted}</strong></span>
          </>
        ) : (
          <span style={{ color: "var(--text-muted)" }}>No attempts yet for this topic.</span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-6" style={{ borderBottom: "1px solid var(--border)" }}>
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className="px-4 pb-2.5 text-sm font-medium transition-colors"
            style={{
              color: activeTab === t ? "var(--text-primary)" : "var(--text-secondary)",
              borderBottom: activeTab === t ? "2px solid var(--accent-blue)" : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex flex-col items-center justify-center py-16 rounded-xl gap-4" style={{ border: "1px solid var(--border)" }}>
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="rgba(45,106,224,0.1)" />
          <path d="M12 20h16M20 12v16" stroke="#5b9cf6" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {activeTab} content for {topicLabel}
        </p>
        <p className="text-xs text-center max-w-xs" style={{ color: "var(--text-muted)" }}>
          Practice questions to build your knowledge. Your mistakes and notes will appear here as you study.
        </p>
        <a
          href={`/practice?topic=${encodeURIComponent(topicLabel)}`}
          className="px-5 py-2 rounded text-sm font-semibold"
          style={{ background: "var(--accent-blue)", color: "#fff", textDecoration: "none" }}
        >
          Start Practicing
        </a>
      </div>
    </div>
  );
}

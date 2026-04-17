"use client";
import { useState } from "react";
import MichaelisCurve from "./MichaelisCurve";

const tabs = ["Summary", "Formulas", "Key Concepts", "Examples"];

const summaryPoints = [
  "Enzymes lower activation energy (Ea)",
  "Km = [S] when reaction rate = ½ Vmax",
  "Lower Km = higher affinity",
  "Competitive inhibitors ↑ apparent Km, no change in Vmax",
  "Noncompetitive inhibitors ↓ Vmax, Km unchanged",
  "Allosteric enzymes show sigmoidal, not hyperbolic curves",
];

const workedOptions = [
  { id: "A", label: "0.25 Vmax" },
  { id: "B", label: "0.50 Vmax" },
  { id: "C", label: "0.75 Vmax" },
  { id: "D", label: "1.00 Vmax" },
];

const relatedTopics = ["Michaelis-Menten", "Substrate Inhibition", "Allosteric Regulation", "Reaction Mechanisms"];

const sectionLabels: Record<string, string> = {
  chem: "Chem/Phys",
  cars: "CARS",
  bio: "Bio/Biochem",
  psych: "Psych/Soc",
};

// Topics with accuracy < 60% are flagged as weak
const weakTopics = new Set(["Enzyme Kinetics", "Kinematics", "Identity"]);

type Props = { topicKey: string };

export default function TopicDetail({ topicKey }: Props) {
  const [activeTab, setActiveTab] = useState("Summary");
  const [workedAnswer, setWorkedAnswer] = useState("B");

  const [sectionId, topicLabel] = topicKey.split(":") as [string, string];
  const sectionLabel = sectionLabels[sectionId] ?? "Chem/Phys";
  const isWeak = weakTopics.has(topicLabel);

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
        <button
          className="px-4 py-2 rounded text-sm font-semibold"
          style={{ background: "var(--accent-blue)", color: "#fff" }}
        >
          Start Practice (12)
        </button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 mb-5 text-sm" style={{ color: "var(--text-secondary)" }}>
        <span>Your Accuracy: <strong style={{ color: "#e05c5c" }}>45%</strong></span>
        <span style={{ color: "var(--border)" }}>|</span>
        <span>Questions Attempted: <strong style={{ color: "var(--text-primary)" }}>32</strong></span>
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

      {/* Summary tab */}
      {activeTab === "Summary" && (
        <div className="space-y-7">
          {/* High-Yield Summary */}
          <section>
            <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text-primary)" }}>
              High-Yield Summary
            </h2>
            <ul className="space-y-2">
              {summaryPoints.map((pt) => (
                <li key={pt} className="flex items-start gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <span
                    className="w-4 h-4 rounded flex-shrink-0 mt-0.5 flex items-center justify-center"
                    style={{ background: "rgba(45,106,224,0.25)" }}
                  >
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1.5 4l1.8 1.8L6.5 2.5" stroke="#5b9cf6" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  </span>
                  {pt}
                </li>
              ))}
            </ul>
          </section>

          {/* Key Graph */}
          <section>
            <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text-primary)" }}>
              Key Graph
            </h2>
            <div
              className="rounded-xl p-4"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}
            >
              <MichaelisCurve />
            </div>
          </section>

          {/* Worked Example */}
          <section>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                Worked Example
              </h2>
              <span
                className="text-xs px-2 py-0.5 rounded"
                style={{ background: "rgba(45,106,224,0.2)", color: "#6eaeff", border: "1px solid rgba(45,106,224,0.3)" }}
              >
                From Your Mistakes ▾
              </span>
            </div>

            <div
              className="rounded-xl p-5"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}
            >
              <p className="text-sm mb-4" style={{ color: "var(--text-primary)" }}>
                If K<sub>m</sub> = 10 mM and [S] = 10 mM, what is v relative to V<sub>max</sub>?
              </p>
              <div className="flex flex-col md:flex-row gap-6">
                {/* Options */}
                <div className="space-y-2.5 flex-1">
                  {workedOptions.map((opt) => {
                    const sel = workedAnswer === opt.id;
                    return (
                      <label key={opt.id} className="flex items-center gap-2.5 cursor-pointer">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
                          style={{
                            border: sel ? "none" : "1.5px solid var(--border)",
                            background: sel ? "var(--accent-blue)" : "transparent",
                          }}
                          onClick={() => setWorkedAnswer(opt.id)}
                        >
                          {sel && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <span
                          className="text-sm"
                          style={{ color: sel ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: sel ? 600 : 400 }}
                        >
                          {opt.id}. {opt.label}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {/* Explanation */}
                <div className="flex-1">
                  <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Explanation</p>
                  <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
                    When [S] = K<sub>m</sub>, the reaction rate v = ½ V<sub>max</sub>.
                  </p>
                  <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
                    This comes directly from the Michaelis-Menten equation:
                  </p>
                  <div
                    className="rounded px-3 py-2 text-xs font-mono"
                    style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-primary)" }}
                  >
                    v = V<sub>max</sub>[S] / (K<sub>m</sub> + [S]) = V<sub>max</sub> / 2
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Related Topics */}
          <section
            className="rounded-xl p-5"
            style={{ border: "1px solid var(--border)" }}
          >
            <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text-primary)" }}>
              Related Topics to Review
            </h2>
            <div className="flex flex-wrap gap-2">
              {relatedTopics.map((t) => (
                <span
                  key={t}
                  className="text-xs px-3 py-1.5 rounded-full cursor-pointer"
                  style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                >
                  {t} ×
                </span>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Placeholder for other tabs */}
      {activeTab !== "Summary" && (
        <div className="flex items-center justify-center h-48 rounded-xl" style={{ border: "1px solid var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{activeTab} content coming soon</p>
        </div>
      )}
    </div>
  );
}

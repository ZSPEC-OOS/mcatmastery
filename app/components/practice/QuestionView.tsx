"use client";
import { useState } from "react";

type AnswerId = "A" | "B" | "C" | "D";

interface AnswerOptionProps {
  id: AnswerId;
  normalPts: string;
  inhibitorPts: string;
  selected: boolean;
  onClick: () => void;
}

function AnswerOption({ id, normalPts, inhibitorPts, selected, onClick }: AnswerOptionProps) {
  return (
    <div
      className="rounded-xl p-3 cursor-pointer"
      style={{
        background: "var(--bg-card)",
        border: selected ? "2px solid var(--accent-blue)" : "1px solid var(--border)",
      }}
      onClick={onClick}
    >
      {/* Radio + label */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: selected ? "var(--accent-blue)" : "transparent",
            border: selected ? "none" : "2px solid var(--border)",
          }}
        >
          {selected && (
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: "#fff" }}
            />
          )}
        </div>
        <span
          className="text-xs font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          {id}
        </span>
      </div>

      {/* SVG Graph */}
      <svg viewBox="0 0 180 110" width="100%" style={{ display: "block" }}>
        <rect width="180" height="110" fill="transparent" />
        {/* x-axis */}
        <line x1="18" y1="100" x2="175" y2="100" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        {/* y-axis */}
        <line x1="18" y1="5" x2="18" y2="100" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        {/* Normal curve */}
        <polyline
          points={normalPts}
          fill="none"
          stroke="#4ade80"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Inhibitor curve */}
        <polyline
          points={inhibitorPts}
          fill="none"
          stroke="#60a5fa"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* X-axis label */}
        <text x="90" y="115" textAnchor="middle" fontSize="7" fill="var(--text-muted)">
          Substrate Concentration [S]
        </text>
        {/* Y-axis label */}
        <text
          x="8"
          y="60"
          textAnchor="middle"
          fontSize="7"
          fill="var(--text-muted)"
          transform="rotate(-90, 8, 60)"
        >
          Reaction Rate (V)
        </text>
        {/* Legend */}
        <circle cx="100" cy="96" r="3" fill="#4ade80" />
        <text x="105" y="99" fontSize="6.5" fill="var(--text-muted)">No Inhibitor</text>
        <circle cx="100" cy="104" r="3" fill="#60a5fa" />
        <text x="105" y="107" fontSize="6.5" fill="var(--text-muted)">Competitive Inhibitor</text>
      </svg>
    </div>
  );
}

const NORMAL_PTS = "0,88 15,62 35,44 60,32 90,24 130,19 160,17";

const OPTIONS: { id: AnswerId; normalPts: string; inhibitorPts: string }[] = [
  {
    id: "A",
    normalPts: NORMAL_PTS,
    inhibitorPts: "0,88 15,79 35,68 60,55 90,43 130,34 160,29",
  },
  {
    id: "B",
    normalPts: NORMAL_PTS,
    inhibitorPts: "0,88 15,72 35,60 60,52 90,48 130,45 160,44",
  },
  {
    id: "C",
    normalPts: NORMAL_PTS,
    inhibitorPts: "0,88 15,55 35,38 60,27 90,20 130,15 160,13",
  },
  {
    id: "D",
    normalPts: NORMAL_PTS,
    inhibitorPts: "0,88 15,61 35,43 60,31 90,23 130,18 160,16",
  },
];

export default function QuestionView() {
  const [selected, setSelected] = useState<AnswerId>("A");

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col">
      {/* Header row */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          Chemical and Physical Foundations of Biological Systems
        </span>
        <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
          1 / 20
        </span>
      </div>

      {/* Question */}
      <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--text-primary)" }}>
        1.&nbsp; Which of the following graphs most accurately depicts the binding affinity of an enzyme with a competitive inhibitor present?
      </p>

      {/* Answer options grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {OPTIONS.map((opt) => (
          <AnswerOption
            key={opt.id}
            id={opt.id}
            normalPts={opt.normalPts}
            inhibitorPts={opt.inhibitorPts}
            selected={selected === opt.id}
            onClick={() => setSelected(opt.id)}
          />
        ))}
      </div>

      {/* Spacer to push bottom bar to bottom */}
      <div className="flex-1" />

      {/* Bottom bar */}
      <div
        className="sticky bottom-0 px-4 py-3"
        style={{
          borderTop: "1px solid var(--border)",
          background: "rgba(13,17,23,0.95)",
        }}
      >
        {/* Row 1 */}
        <div className="flex items-center">
          {/* Left: explanation */}
          <div className="flex items-center">
            <LightbulbIcon />
            <span className="text-sm ml-2" style={{ color: "var(--text-muted)" }}>
              Explanation
            </span>
          </div>
          {/* Center */}
          <span
            className="text-xs mx-auto"
            style={{ color: "var(--text-muted)" }}
          >
            Q1 of 20
          </span>
          {/* Right: Submit */}
          <button
            className="px-5 py-1.5 rounded text-sm font-semibold"
            style={{ background: "var(--accent-blue)", color: "#fff" }}
          >
            Submit
          </button>
        </div>

        {/* Row 2 */}
        <div className="flex items-center justify-end gap-2 mt-2">
          <button
            className="text-sm"
            style={{ color: "var(--text-secondary)", background: "transparent", border: "none" }}
          >
            Previous
          </button>
          <button
            className="w-7 h-7 flex items-center justify-center rounded text-sm"
            style={{ border: "1px solid var(--border)", color: "var(--text-secondary)", background: "transparent" }}
          >
            ‹
          </button>
          <button
            className="text-sm"
            style={{ color: "var(--text-secondary)", background: "transparent", border: "none" }}
          >
            Next
          </button>
          <button
            className="w-7 h-7 flex items-center justify-center rounded text-sm"
            style={{ border: "1px solid var(--border)", color: "var(--text-secondary)", background: "transparent" }}
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}

function LightbulbIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3.3 6H8.3C6.3 13.7 5 11.5 5 9a7 7 0 0 1 7-7z" />
    </svg>
  );
}

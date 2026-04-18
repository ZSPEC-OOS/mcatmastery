"use client";
import { useEffect, useState } from "react";

type Topic = { label: string; pct: number };
type Section = { id: string; label: string; color: string; topics: Topic[] };

const SECTIONS: Section[] = [
  {
    id: "chem",
    label: "Chem/Phys",
    color: "#5b9cf6",
    topics: [
      { label: "Kinematics", pct: 0 },
      { label: "Fluids", pct: 0 },
      { label: "Circuits", pct: 0 },
      { label: "Thermodynamics", pct: 0 },
      { label: "Enzyme Kinetics", pct: 0 },
      { label: "Electrochemistry", pct: 0 },
      { label: "Optics & Waves", pct: 0 },
      { label: "Atomic Structure", pct: 0 },
    ],
  },
  {
    id: "cars",
    label: "CARS",
    color: "#f0a500",
    topics: [
      { label: "Passage Strategy", pct: 0 },
      { label: "Inference", pct: 0 },
      { label: "Main Idea", pct: 0 },
      { label: "Tone & Attitude", pct: 0 },
    ],
  },
  {
    id: "bio",
    label: "Bio/Biochem",
    color: "#4ade80",
    topics: [
      { label: "Amino Acids", pct: 0 },
      { label: "Metabolism", pct: 0 },
      { label: "Cell Biology", pct: 0 },
      { label: "Enzyme Kinetics", pct: 0 },
    ],
  },
  {
    id: "psych",
    label: "Psych/Soc",
    color: "#a78bfa",
    topics: [
      { label: "Learning", pct: 0 },
      { label: "Memory", pct: 0 },
      { label: "Identity", pct: 0 },
      { label: "Behavior", pct: 0 },
    ],
  },
];

function pctColor(pct: number) {
  if (pct < 60) return "#e05c5c";
  if (pct < 70) return "#f0a500";
  return "var(--text-muted)";
}

type Props = {
  activeTopic: string;
  onSelect: (sectionId: string, topicLabel: string) => void;
};

export default function TopicSidebar({ activeTopic, onSelect }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ chem: true, cars: true, bio: true, psych: true });
  const [accMap, setAccMap] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch("/api/curriculum")
      .then(r => r.json())
      .then((data: { topicAccuracy: { topic: string; accuracy: number }[] }) => {
        if (data.topicAccuracy?.length > 0) {
          const m: Record<string, number> = {};
          for (const t of data.topicAccuracy) m[t.topic] = t.accuracy;
          setAccMap(m);
        }
      })
      .catch(() => {});
  }, []);

  function toggle(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div
      className="overflow-y-auto py-4"
      style={{
        width: 220,
        minWidth: 220,
        borderRight: "1px solid var(--border)",
        background: "var(--bg-card)",
      }}
    >
      <p className="px-4 mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
        Sections
      </p>

      {SECTIONS.map((sec) => (
        <div key={sec.id}>
          <button
            className="w-full flex items-center justify-between px-4 py-2 text-left"
            onClick={() => toggle(sec.id)}
          >
            <div className="flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d={expanded[sec.id] ? "M3 4.5l3 3 3-3" : "M4.5 3l3 3-3 3"}
                  stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round"
                />
              </svg>
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {sec.label}
              </span>
            </div>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M4.5 3l3 3-3 3" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          {expanded[sec.id] && (
            <div className="mb-1">
              {sec.topics.map((t) => {
                const isActive = activeTopic === `${sec.id}:${t.label}`;
                const pct = accMap[t.label] ?? t.pct;
                return (
                  <button
                    key={t.label}
                    onClick={() => onSelect(sec.id, t.label)}
                    className="w-full flex items-center px-4 py-1.5 text-left"
                    style={{
                      background: isActive ? "rgba(27,58,107,0.12)" : "transparent",
                      borderLeft: isActive ? "2px solid var(--accent-blue)" : "2px solid transparent",
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full mr-2.5 flex-shrink-0"
                      style={{ background: isActive ? "var(--accent-blue)" : sec.color, opacity: isActive ? 1 : 0.7 }}
                    />
                    <span
                      className="flex-1 text-xs"
                      style={{ color: isActive ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: isActive ? 600 : 400 }}
                    >
                      {t.label}
                    </span>
                    <span
                      className="text-xs font-semibold ml-2"
                      style={{ color: isActive ? "var(--accent-blue)" : pct > 0 ? pctColor(pct) : "var(--text-muted)" }}
                    >
                      {pct > 0 ? `${pct}%` : "—"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

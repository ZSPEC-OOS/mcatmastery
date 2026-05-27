"use client";
import { useEffect, useState } from "react";
import { CURRICULUM_SECTIONS } from "../../../lib/curriculum-sections";

function countColor(n: number) {
  if (n === 0) return "var(--text-muted)";
  if (n < 4)   return "#f59e0b";
  if (n < 10)  return "var(--accent-blue)";
  return "#4ade80";
}

// Selection key formats:
// "section:sectionId"           – whole section
// "group:sectionId:groupName"   – one topic group
// "topic:sectionId:topicLabel"  – one topic

type Props = {
  activeKey: string;
  onSelect: (key: string) => void;
};

export default function TopicSidebar({ activeKey, onSelect }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    { chem: true, cars: true, bio: true, psych: true }
  );
  type TopicCount = { total: number; discrete: number; sets: number; passageQs: number; easy: number; medium: number; hard: number };
  const [countMap, setCountMap] = useState<Record<string, TopicCount>>({});

  useEffect(() => {
    fetch("/api/curriculum")
      .then((r) => r.json())
      .then((data: { topicCounts: { topic: string; count: number; discrete: number; sets: number; passageQs: number; easy: number; medium: number; hard: number }[] }) => {
        if (data.topicCounts?.length > 0) {
          const m: Record<string, TopicCount> = {};
          for (const t of data.topicCounts) {
            m[t.topic] = { total: t.count, discrete: t.discrete ?? t.count, sets: t.sets ?? 0, passageQs: t.passageQs ?? 0, easy: t.easy ?? 0, medium: t.medium ?? 0, hard: t.hard ?? 0 };
          }
          setCountMap(m);
        }
      })
      .catch(() => {});
  }, []);

  function toggle(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const isSectionActive = (sId: string) => activeKey === `section:${sId}`;
  const isGroupActive   = (sId: string, grp: string) => activeKey === `group:${sId}:${grp}`;
  const isTopicActive   = (sId: string, label: string) => activeKey === `topic:${sId}:${label}`;

  return (
    <div
      className="overflow-y-auto py-4"
      style={{ width: 220, minWidth: 220, borderRight: "1px solid var(--border)", background: "var(--bg-card)" }}
    >
      <p className="px-4 mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
        Sections
      </p>

      {CURRICULUM_SECTIONS.map((sec) => (
        <div key={sec.id}>
          {/* Section header */}
          <div className="flex items-center">
            {/* Expand/collapse arrow */}
            <button
              onClick={() => toggle(sec.id)}
              className="flex-shrink-0 pl-3 pr-1 py-2"
              style={{ color: "var(--text-muted)" }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d={expanded[sec.id] ? "M3 4.5l3 3 3-3" : "M4.5 3l3 3-3 3"}
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                />
              </svg>
            </button>
            {/* Section label — clickable to view all questions */}
            <button
              className="flex-1 flex items-center justify-between pr-4 py-2 text-left"
              onClick={() => onSelect(`section:${sec.id}`)}
              style={{
                background: isSectionActive(sec.id) ? "rgba(27,58,107,0.12)" : "transparent",
                borderLeft: isSectionActive(sec.id) ? "2px solid var(--accent-blue)" : "2px solid transparent",
              }}
            >
              <span
                className="text-sm font-semibold"
                style={{ color: isSectionActive(sec.id) ? "var(--text-primary)" : "var(--text-secondary)" }}
              >
                {sec.label}
              </span>
              {/* total count for section */}
              {(() => {
                const sectionTopics = sec.groups.flatMap((g) => g.topics);
                const total = sectionTopics.reduce((s, t) => s + (countMap[t]?.total ?? 0), 0);
                return total > 0 ? (
                  <span className="text-xs font-semibold tabular-nums" style={{ color: isSectionActive(sec.id) ? "var(--accent-blue)" : countColor(total) }}>
                    {total}
                  </span>
                ) : null;
              })()}
            </button>
          </div>

          {expanded[sec.id] && (
            <div className="mb-1">
              {sec.groups.map((grp) => {
                const grpActive = isGroupActive(sec.id, grp.group);
                const grpTotal  = grp.topics.reduce((s, t) => s + (countMap[t]?.total ?? 0), 0);
                return (
                  <div key={grp.group}>
                    {/* Group header — clickable */}
                    <button
                      className="w-full px-4 pt-2 pb-1 text-left flex items-center justify-between"
                      onClick={() => onSelect(`group:${sec.id}:${grp.group}`)}
                      style={{
                        background: grpActive ? "rgba(27,58,107,0.08)" : "transparent",
                      }}
                    >
                      <span
                        className="text-xs font-semibold uppercase tracking-wider"
                        style={{ color: grpActive ? "var(--accent-blue)" : sec.color, opacity: grpActive ? 1 : 0.85 }}
                      >
                        {grp.group}
                      </span>
                      {grpTotal > 0 && (
                        <span className="text-xs font-semibold tabular-nums" style={{ color: grpActive ? "var(--accent-blue)" : countColor(grpTotal) }}>
                          {grpTotal}
                        </span>
                      )}
                    </button>

                    {/* Individual topics */}
                    {grp.topics.map((label) => {
                      const isActive = isTopicActive(sec.id, label);
                      const tc = countMap[label];
                      const total  = tc?.total  ?? 0;
                      const easy   = tc?.easy   ?? 0;
                      const medium = tc?.medium ?? 0;
                      const hard   = tc?.hard   ?? 0;
                      return (
                        <button
                          key={label}
                          onClick={() => onSelect(`topic:${sec.id}:${label}`)}
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
                            {label}
                          </span>
                          {/* Difficulty labels: E# M# H# */}
                          <div className="flex items-center ml-1 gap-0.5 flex-shrink-0">
                            {total === 0 ? (
                              <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--text-muted)" }}>—</span>
                            ) : (
                              <>
                                {easy > 0 && (
                                  <span className="text-xs font-semibold tabular-nums leading-none" style={{ color: isActive ? "var(--accent-blue)" : "#4ade80" }}>E{easy}</span>
                                )}
                                {medium > 0 && (
                                  <span className="text-xs font-semibold tabular-nums leading-none" style={{ color: isActive ? "var(--accent-blue)" : "#f0a500" }}>M{medium}</span>
                                )}
                                {hard > 0 && (
                                  <span className="text-xs font-semibold tabular-nums leading-none" style={{ color: isActive ? "var(--accent-blue)" : "#e05c5c" }}>H{hard}</span>
                                )}
                              </>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

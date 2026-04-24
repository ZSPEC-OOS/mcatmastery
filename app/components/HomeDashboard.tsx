"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface DashStats {
  lastFL: number | null;
  sectionMap: Record<string, { correct: number; total: number }>;
  weakTopics: Array<{ topic: string; section: string; accuracy: number }>;
  recentAcc: number | null;
}

const SECTIONS = [
  {
    key: "Chem/Phys",
    label: "Chem / Phys",
    color: "#6366f1",
    desc: "Gen chem · Physics · Biochem · Orgo",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3h6M10 3v5.5L6 17a1 1 0 0 0 .9 1.5h10.2A1 1 0 0 0 18 17l-4-8.5V3" />
        <line x1="6.5" y1="14" x2="17.5" y2="14" />
      </svg>
    ),
  },
  {
    key: "CARS",
    label: "CARS",
    color: "#f0a500",
    desc: "Comprehension · Reasoning · Analysis",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  {
    key: "Bio/Biochem",
    label: "Bio / Biochem",
    color: "#4ade80",
    desc: "Biology · Biochemistry · Cell biology",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M4 3c2 2 2 5 0 7s-2 5 0 7" />
        <path d="M20 3c-2 2-2 5 0 7s2 5 0 7" />
        <path d="M4 7h16M4 13h16" />
      </svg>
    ),
  },
  {
    key: "Psych/Soc",
    label: "Psych / Soc",
    color: "#a78bfa",
    desc: "Psychology · Sociology · Behavior",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3.3 6l-.7 3H9l-.7-3A7 7 0 0 1 12 5z" />
        <line x1="9" y1="18" x2="15" y2="18" />
        <line x1="12" y1="5" x2="12" y2="2" />
      </svg>
    ),
  },
];

const QUICK_LINKS = [
  {
    label: "Review Mistakes",
    href: "/review",
    desc: "See what you got wrong and why",
    color: "#e05c5c",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="18" x2="12" y2="12" />
        <line x1="9" y1="15" x2="15" y2="15" />
      </svg>
    ),
  },
  {
    label: "Analytics",
    href: "/analytics",
    desc: "Track accuracy trends over time",
    color: "#6366f1",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6"  y1="20" x2="6"  y2="14" />
        <line x1="2"  y1="20" x2="22" y2="20" />
      </svg>
    ),
  },
  {
    label: "Curriculum",
    href: "/curriculum",
    desc: "Browse topics and study materials",
    color: "#4ade80",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    ),
  },
];

const EMPTY: DashStats = {
  lastFL: null,
  sectionMap: { "Chem/Phys": { correct: 0, total: 0 }, CARS: { correct: 0, total: 0 }, "Bio/Biochem": { correct: 0, total: 0 }, "Psych/Soc": { correct: 0, total: 0 } },
  weakTopics: [],
  recentAcc: null,
};

export default function HomeDashboard() {
  const [stats, setStats] = useState<DashStats>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(r => r.json())
      .then((d: DashStats) => { if (d.sectionMap) setStats(d); })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const totalAnswered = Object.values(stats.sectionMap).reduce((s, v) => s + v.total, 0);
  const totalCorrect  = Object.values(stats.sectionMap).reduce((s, v) => s + v.correct, 0);
  const overallAcc    = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : null;

  return (
    <main className="flex-1">
      {/* ── Top stat bar ── */}
      <div style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex flex-wrap gap-4 items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Your MCAT Dashboard</h1>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <StatPill label="Overall accuracy" value={overallAcc !== null ? `${overallAcc}%` : "—"} loaded={loaded} />
            <StatPill label="Last full length" value={stats.lastFL !== null ? `${stats.lastFL} / 528` : "—"} loaded={loaded} />
            <StatPill label="Questions answered" value={totalAnswered > 0 ? String(totalAnswered) : "—"} loaded={loaded} />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-8">

        {/* ── Section cards ── */}
        <div>
          <h2 className="text-sm font-semibold mb-4 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Practice by Section
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {SECTIONS.map(sec => {
              const v   = stats.sectionMap[sec.key] ?? { correct: 0, total: 0 };
              const acc = v.total > 0 ? Math.round((v.correct / v.total) * 100) : null;
              const weak = stats.weakTopics.find(t => t.section === sec.key);
              return (
                <div
                  key={sec.key}
                  className="rounded-xl p-5 flex flex-col gap-3"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderTop: `3px solid ${sec.color}`,
                  }}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span style={{ color: sec.color }}>{sec.icon}</span>
                        <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{sec.label}</span>
                      </div>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{sec.desc}</p>
                    </div>
                  </div>

                  {/* Accuracy */}
                  <div>
                    <div className="flex items-baseline gap-1.5 mb-1.5">
                      <span className="text-3xl font-bold" style={{ color: acc !== null ? sec.color : "var(--text-muted)" }}>
                        {acc !== null ? `${acc}%` : "—"}
                      </span>
                      {v.total > 0 && (
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{v.total} answered</span>
                      )}
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: acc !== null ? `${acc}%` : "0%", background: sec.color }}
                      />
                    </div>
                  </div>

                  {/* Weak topic badge */}
                  {weak ? (
                    <p className="text-xs px-2 py-1 rounded-md" style={{ background: `${sec.color}15`, color: sec.color }}>
                      Weak: {weak.topic} ({weak.accuracy}%)
                    </p>
                  ) : (
                    <p className="text-xs" style={{ color: "var(--text-muted)", minHeight: "1.5rem" }}>
                      {loaded && v.total === 0 ? "No questions answered yet" : ""}
                    </p>
                  )}

                  {/* Practice button */}
                  <Link
                    href={`/practice?section=${encodeURIComponent(sec.key)}`}
                    className="mt-auto text-center py-2 rounded-lg text-sm font-semibold"
                    style={{
                      background: `${sec.color}18`,
                      color: sec.color,
                      border: `1px solid ${sec.color}40`,
                      textDecoration: "none",
                    }}
                  >
                    Practice →
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Quick links ── */}
        <div>
          <h2 className="text-sm font-semibold mb-4 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Tools
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {QUICK_LINKS.map(link => (
              <Link
                key={link.label}
                href={link.href}
                className="rounded-xl p-5 flex items-center gap-4 transition-all"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  textDecoration: "none",
                }}
              >
                <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${link.color}15`, color: link.color }}>
                  {link.icon}
                </span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{link.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{link.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}

function StatPill({ label, value, loaded }: { label: string; value: string; loaded: boolean }) {
  return (
    <div className="px-4 py-2 rounded-lg" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="text-base font-bold" style={{ color: loaded ? "var(--text-primary)" : "var(--text-muted)" }}>{value}</p>
    </div>
  );
}

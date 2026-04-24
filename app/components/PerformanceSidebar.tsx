"use client";
import { useEffect, useState } from "react";

interface DashStats {
  lastFL: number | null;
  sectionMap: Record<string, { correct: number; total: number }>;
  weakTopics: Array<{ topic: string; section: string; accuracy: number }>;
  recentAcc: number | null;
}

const SECTION_ORDER = ["Chem/Phys", "CARS", "Bio/Biochem", "Psych/Soc"];
const SECTION_SHORT: Record<string, string> = {
  "Chem/Phys": "Chem", "CARS": "CARS", "Bio/Biochem": "Bio", "Psych/Soc": "Psych",
};

const EMPTY: DashStats = {
  lastFL: null,
  sectionMap: {
    "Chem/Phys":   { correct: 0, total: 0 },
    "CARS":        { correct: 0, total: 0 },
    "Bio/Biochem": { correct: 0, total: 0 },
    "Psych/Soc":   { correct: 0, total: 0 },
  },
  weakTopics: [],
  recentAcc: null,
};

export default function PerformanceSidebar() {
  const [stats, setStats]   = useState<DashStats>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(r => r.json())
      .then((data: DashStats) => {
        if (data.lastFL !== undefined) setStats(data);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const hasSection  = loaded && SECTION_ORDER.some(s => (stats.sectionMap[s]?.total ?? 0) > 0);
  const hasActivity = stats.recentAcc !== null;

  const sectionBars = SECTION_ORDER.map(sec => {
    const v   = stats.sectionMap[sec] ?? { correct: 0, total: 0 };
    const pct = v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0;
    return { label: SECTION_SHORT[sec], pct };
  });
  const maxPct = Math.max(...sectionBars.map(s => s.pct), 1);
  const minPct = Math.min(...sectionBars.map(s => s.pct));

  const sparkData = [0, 0, 0, 0, 0, 0, stats.recentAcc ?? 0];
  const w = 200, h = 60, padX = 8, padY = 8;
  const minV = Math.min(...sparkData) - 5;
  const maxV = Math.max(...sparkData) + 5;
  const range = maxV - minV || 1;
  const pts = sparkData.map((v, i) => {
    const x = padX + (i / (sparkData.length - 1)) * (w - padX * 2);
    const y = padY + ((maxV - v) / range) * (h - padY * 2);
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-secondary)" }}>
          Performance Snapshot
        </h3>

        <div className="flex items-baseline gap-3 mb-4">
          <span className="text-4xl font-bold" style={{ color: "var(--text-primary)" }}>
            {stats.lastFL ?? "—"}
          </span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>/ 528</span>
        </div>

        <div className="mb-4">
          {!hasSection ? (
            <p className="text-xs py-2" style={{ color: "var(--text-muted)" }}>
              Answer questions to see section breakdown.
            </p>
          ) : (
            <>
              <div className="flex items-end justify-between gap-1.5 h-16">
                {sectionBars.map(s => {
                  const barPct = s.pct > 0 ? ((s.pct - minPct + 10) / (maxPct - minPct + 10)) * 100 : 10;
                  const isHigh = s.pct === maxPct;
                  const isLow  = s.pct === minPct;
                  return (
                    <div key={s.label} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full rounded-sm overflow-hidden flex flex-col justify-end" style={{ height: "48px" }}>
                        <div className="w-full rounded-sm"
                          style={{
                            height: `${barPct}%`,
                            background: isLow ? "rgba(100,149,237,0.5)" : isHigh ? "#6eaeff" : "rgba(100,149,237,0.75)",
                            transition: "height 0.5s ease",
                          }} />
                      </div>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{minPct}%</span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{maxPct}%</span>
              </div>
            </>
          )}
        </div>

        <div className="mb-4">
          <h4 className="text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>Weakest Topics</h4>
          {stats.weakTopics.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>No weak topics identified yet.</p>
          ) : (
            <div className="space-y-1.5">
              {stats.weakTopics.map(t => (
                <div key={t.topic} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "var(--text-primary)" }}>{t.topic}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold" style={{ color: "#e05c5c" }}>{t.accuracy}%</span>
                    <TrendDown />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h4 className="text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>Last 7 Days Accuracy</h4>
          {!hasActivity ? (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>No activity yet this week.</p>
          ) : (
            <>
              <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
                <defs>
                  <linearGradient id="accGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(27,58,107,0.3)" />
                    <stop offset="100%" stopColor="rgba(27,58,107,0)" />
                  </linearGradient>
                </defs>
                {[0, 0.5, 1].map(t => (
                  <line key={t} x1={padX} y1={padY + t * (h - padY * 2)} x2={w - padX} y2={padY + t * (h - padY * 2)}
                    stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                ))}
                <polygon points={`${padX},${h - padY} ${pts} ${w - padX},${h - padY}`} fill="url(#accGrad2)" />
                <polyline points={pts} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                {sparkData.map((v, i) => {
                  const x = padX + (i / (sparkData.length - 1)) * (w - padX * 2);
                  const y = padY + ((maxV - v) / range) * (h - padY * 2);
                  return <circle key={i} cx={x} cy={y} r="3" fill="#6366f1" stroke="var(--bg-card)" strokeWidth="1.5" />;
                })}
              </svg>
              <div className="flex justify-between mt-1">
                {["S","M","T","W","T","F","S"].map((d, i) => (
                  <span key={i} className="text-xs" style={{ color: "var(--text-muted)" }}>{d}</span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TrendDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 10L4 5h6L7 10z" fill="#e05c5c" />
    </svg>
  );
}

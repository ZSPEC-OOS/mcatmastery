import { type Analytics, type Section } from "../../../lib/api-client";

const COLORS: Record<Section, string> = {
  "Chem/Phys": "#6366f1", "CARS": "#f0a500", "Bio/Biochem": "#4ade80", "Psych/Soc": "#a78bfa",
};

interface Props { sections: Analytics["sections"]; }

export default function SectionBreakdownCard({ sections }: Props) {
  return (
    <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <h3 className="font-bold text-base mb-4" style={{ color: "var(--text-primary)" }}>Section Breakdown</h3>
      <div className="space-y-4">
        {(Object.entries(sections) as [Section, { correct: number; total: number }][]).map(([sec, v]) => {
          const pct = v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0;
          return (
            <div key={sec}>
              <div className="flex justify-between text-xs mb-1.5">
                <span style={{ color: "var(--text-secondary)" }}>{sec}</span>
                <span style={{ color: pct >= 70 ? "#4ade80" : pct >= 55 ? "#f0a500" : "#f87171", fontWeight: 600 }}>
                  {pct}% <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({v.total} qs)</span>
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: COLORS[sec] }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

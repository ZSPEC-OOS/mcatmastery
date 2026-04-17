const topics = [
  { rank: 1, label: "Enzyme Kinetics",     pct: 45 },
  { rank: 2, label: "Kinematics",          pct: 56 },
  { rank: 3, label: "Experimental Design", pct: 60 },
  { rank: 4, label: "Psych/Soc Definitions", pct: 61 },
];

function pctColor(pct: number) {
  if (pct < 55) return "#e05c5c";
  if (pct < 65) return "#f0a500";
  return "var(--text-secondary)";
}

export default function WeakTopicsCard() {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <h3 className="font-bold text-base mb-0.5" style={{ color: "var(--text-primary)" }}>
        Weakest Topics
      </h3>
      <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
        Topics requiring the most improvement.
      </p>

      <div className="space-y-3">
        {topics.map((t) => (
          <div key={t.rank} className="flex items-center gap-3">
            <span className="text-xs font-semibold w-5 text-right" style={{ color: "var(--text-muted)" }}>
              #{t.rank}
            </span>
            <span className="text-sm flex-1" style={{ color: "var(--text-primary)" }}>
              {t.label}
            </span>
            <span className="text-sm font-semibold w-10 text-right" style={{ color: pctColor(t.pct) }}>
              {t.pct}%
            </span>
            <button
              className="text-xs px-3 py-1 rounded"
              style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            >
              Practice
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

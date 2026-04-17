const sections = [
  { label: "Chem/Phys", pct: 66, color: "#5b9cf6" },
  { label: "CARS",      pct: 70, color: "#f0a500" },
  { label: "Bio/Biochem", pct: 67, color: "#4ade80" },
  { label: "Psych/Soc", pct: 72, color: "#a78bfa" },
];

export default function SectionBreakdownCard() {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <h3 className="font-bold text-base mb-0.5" style={{ color: "var(--text-primary)" }}>
        Section Breakdown
      </h3>
      <p className="text-xs mb-5" style={{ color: "var(--text-secondary)" }}>
        Accuracy and time per question by section.
      </p>

      <div className="space-y-4">
        {sections.map((s) => (
          <div key={s.label}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                <span className="text-sm" style={{ color: "var(--text-primary)" }}>{s.label}</span>
              </div>
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {s.pct}%
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${s.pct}%`, background: s.color, opacity: 0.85 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

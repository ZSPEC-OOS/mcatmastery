const rows = [
  {
    barColors: ["#5b9cf6", "#f0a500"],
    barWidths: [55, 25],
    time: "1:52 min",
    pct: "65%",
    time2: "1:45 min",
  },
  {
    barColors: ["#5b9cf6", "#4ade80"],
    barWidths: [45, 35],
    time: "1:55 min",
    pct: "79%",
    time2: "2:05 min",
  },
];

export default function TimePerQuestionCard() {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-start justify-between mb-0.5">
        <h3 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>
          Time Per Question
        </h3>
        <span className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
          1:45 min
        </span>
      </div>
      <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
        Average answer time by section.
      </p>

      {/* Column headers */}
      <div className="grid grid-cols-4 gap-2 mb-2 px-1">
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>Section</span>
        <span className="text-xs text-center" style={{ color: "var(--text-muted)" }}>Chem/Phys</span>
        <span className="text-xs text-center" style={{ color: "var(--text-muted)" }}>CARS</span>
        <span className="text-xs text-center" style={{ color: "var(--text-muted)" }}>Bio/Biochem</span>
      </div>

      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-4 gap-2 items-center mb-3 px-1">
          {/* Bar */}
          <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5" style={{ background: "rgba(255,255,255,0.06)" }}>
            {r.barColors.map((c, j) => (
              <div key={j} className="h-full" style={{ width: `${r.barWidths[j]}%`, background: c }} />
            ))}
          </div>
          <span className="text-xs text-center" style={{ color: "var(--text-secondary)" }}>{r.time}</span>
          <span className="text-xs text-center font-semibold" style={{ color: "var(--text-primary)" }}>{r.pct}</span>
          <span className="text-xs text-center" style={{ color: "var(--text-secondary)" }}>{r.time2}</span>
        </div>
      ))}
    </div>
  );
}

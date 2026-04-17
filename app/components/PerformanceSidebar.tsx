const sectionScores = [
  { label: "Chem", score: 127, max: 132 },
  { label: "Phys", score: 128, max: 132 },
  { label: "CARS", score: 125, max: 132 },
  { label: "Soc", score: 129, max: 132 },
  { label: "Psych", score: 130, max: 132 },
];

const weakTopics = [
  { label: "Enzyme Kinetics" },
  { label: "Kinematics" },
  { label: "Scientific Reasoning" },
  { label: "Psych/Soc" },
];

const accuracy7Days = [15, 22, 28, 36, 44, 50, 54];

export default function PerformanceSidebar() {
  const maxScore = Math.max(...sectionScores.map((s) => s.score));
  const minScore = Math.min(...sectionScores.map((s) => s.score));

  // Build SVG polyline for accuracy chart
  const w = 200;
  const h = 60;
  const padX = 8;
  const padY = 8;
  const minAcc = Math.min(...accuracy7Days) - 5;
  const maxAcc = Math.max(...accuracy7Days) + 5;
  const points = accuracy7Days
    .map((v, i) => {
      const x = padX + (i / (accuracy7Days.length - 1)) * (w - padX * 2);
      const y = padY + ((maxAcc - v) / (maxAcc - minAcc)) * (h - padY * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="space-y-4">
      {/* Main snapshot card */}
      <div
        className="rounded-xl p-5"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-secondary)" }}>
          Performance Snapshot
        </h3>

        {/* Big score */}
        <div className="flex items-baseline gap-3 mb-4">
          <span className="text-4xl font-bold" style={{ color: "var(--text-primary)" }}>
            509
          </span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            / 528
          </span>
        </div>

        {/* Section bar chart */}
        <div className="mb-4">
          <div className="flex items-end justify-between gap-1.5 h-16">
            {sectionScores.map((s) => {
              const pct = ((s.score - 120) / (s.max - 120)) * 100;
              const isHigh = s.score === maxScore;
              const isLow = s.score === minScore;
              return (
                <div key={s.label} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-sm overflow-hidden flex flex-col justify-end" style={{ height: "48px" }}>
                    <div
                      className="w-full rounded-sm transition-all"
                      style={{
                        height: `${pct}%`,
                        background: isLow
                          ? "rgba(100,149,237,0.5)"
                          : isHigh
                          ? "#6eaeff"
                          : "rgba(100,149,237,0.75)",
                      }}
                    />
                  </div>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Score range labels */}
          <div className="flex justify-between mt-1">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {minScore}
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {maxScore}
            </span>
          </div>
        </div>

        {/* Weakest topics */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
            Weakest Topics
          </h4>
          <div className="space-y-1.5">
            {weakTopics.map((t) => (
              <div key={t.label} className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "var(--text-primary)" }}>
                  {t.label}
                </span>
                <TrendArrows />
              </div>
            ))}
          </div>
        </div>

        {/* 7-day accuracy line chart */}
        <div>
          <h4 className="text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
            Last 7 Days Accuracy
          </h4>
          <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
            {/* Gridlines */}
            {[0, 0.5, 1].map((t) => (
              <line
                key={t}
                x1={padX}
                y1={padY + t * (h - padY * 2)}
                x2={w - padX}
                y2={padY + t * (h - padY * 2)}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1"
              />
            ))}
            {/* Area fill */}
            <defs>
              <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(45,106,224,0.3)" />
                <stop offset="100%" stopColor="rgba(45,106,224,0)" />
              </linearGradient>
            </defs>
            <polygon
              points={`${padX},${h - padY} ${points} ${w - padX},${h - padY}`}
              fill="url(#accGrad)"
            />
            {/* Line */}
            <polyline
              points={points}
              fill="none"
              stroke="#5b9cf6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Dots */}
            {accuracy7Days.map((v, i) => {
              const x = padX + (i / (accuracy7Days.length - 1)) * (w - padX * 2);
              const y = padY + ((maxAcc - v) / (maxAcc - minAcc)) * (h - padY * 2);
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="3"
                  fill="#5b9cf6"
                  stroke="var(--bg-card)"
                  strokeWidth="1.5"
                />
              );
            })}
          </svg>

          {/* Day labels */}
          <div className="flex justify-between mt-1">
            {["S", "M", "T", "T", "S", "S", "7"].map((d, i) => (
              <span key={i} className="text-xs" style={{ color: "var(--text-muted)" }}>
                {d}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TrendArrows() {
  return (
    <div className="flex items-center gap-1">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 10L4 5h6L7 10z" fill="#e05c5c" />
      </svg>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path
          d="M7 3 L7 11 M4 8 L7 11 L10 8"
          stroke="var(--text-muted)"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

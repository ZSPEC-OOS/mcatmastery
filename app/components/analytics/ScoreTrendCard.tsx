// Score data: index maps to label; y-range 508–522 so trend is visible
const scores = [511, 511, 512, 513, 513, 514, 517, 520];
const labels = ["S", "M", "T", "W", "T", "F", "23", "6/23"];

const W = 300, H = 130;
const padX = 38, padY = 18, chartW = W - padX - 12, chartH = H - padY - 28;
const yMin = 508, yMax = 522;

function sx(i: number) {
  return padX + (i / (scores.length - 1)) * chartW;
}
function sy(v: number) {
  return padY + chartH - ((v - yMin) / (yMax - yMin)) * chartH;
}

const pts = scores.map((s, i) => `${sx(i).toFixed(1)},${sy(s).toFixed(1)}`).join(" ");
const target = sy(515);
const areaBase = padY + chartH;
const area = `${sx(0).toFixed(1)},${areaBase} ${pts} ${sx(scores.length - 1).toFixed(1)},${areaBase}`;

const yTicks = [510, 513, 516, 519];

export default function ScoreTrendCard() {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      {/* Card header */}
      <h3 className="font-bold text-base mb-0.5" style={{ color: "var(--text-primary)" }}>
        Score Trend
      </h3>
      <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
        Track your full-length practice test progress over time.
      </p>

      {/* Legend row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: "#5b9cf6" }} />
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Full-Length Exams</span>
        </div>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>Target Score: 515</span>
      </div>

      {/* Chart */}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%">
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(91,156,246,0.25)" />
            <stop offset="100%" stopColor="rgba(91,156,246,0)" />
          </linearGradient>
        </defs>

        {/* Y gridlines */}
        {yTicks.map((v) => (
          <line
            key={v}
            x1={padX} y1={sy(v).toFixed(1)}
            x2={W - 12} y2={sy(v).toFixed(1)}
            stroke="rgba(255,255,255,0.07)" strokeWidth="1"
          />
        ))}

        {/* Y labels */}
        {yTicks.map((v) => (
          <text key={v} x={padX - 4} y={sy(v) + 3} textAnchor="end" fontSize="8" fill="var(--text-muted)">
            {v}
          </text>
        ))}

        {/* Target dashed line */}
        <line
          x1={padX} y1={target} x2={W - 12} y2={target}
          stroke="rgba(240,165,0,0.45)" strokeWidth="1.2" strokeDasharray="5 4"
        />

        {/* Area fill */}
        <polygon points={area} fill="url(#scoreGrad)" />

        {/* Score line */}
        <polyline
          points={pts}
          fill="none" stroke="#5b9cf6" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
        />

        {/* Dots */}
        {scores.map((s, i) => (
          <circle
            key={i}
            cx={sx(i)} cy={sy(s)}
            r="3.5" fill="#5b9cf6" stroke="var(--bg-card)" strokeWidth="1.5"
          />
        ))}

        {/* X labels */}
        {labels.map((l, i) => (
          <text
            key={i}
            x={sx(i)} y={H - 6}
            textAnchor="middle" fontSize="8" fill="var(--text-muted)"
          >
            {l}
          </text>
        ))}
      </svg>
    </div>
  );
}

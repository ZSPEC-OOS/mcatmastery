// Michaelis-Menten curve: v = [S] / (Km + [S]), Km=30, Vmax normalized to 1
// SVG viewBox "0 0 300 190"
const W = 300, H = 190;
const padX = 42, padY = 18, chartW = W - padX - 20, chartH = H - padY - 32;

// Curve points (x_data from 0 to 150, step 10)
const curveData: [number, number][] = [];
for (let s = 0; s <= 150; s += 8) {
  const v = s / (30 + s);
  const px = padX + (s / 150) * chartW;
  const py = padY + chartH - v * chartH;
  curveData.push([px, py]);
}
const curvePts = curveData.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

// Key reference lines
const yVmax = padY;                           // v=1 → top
const yHalf = padY + chartH - 0.5 * chartH;  // v=0.5 Vmax
const xKm = padX + (30 / 150) * chartW;      // [S]=Km=30

const axisBottom = padY + chartH;
const axisRight = padX + chartW;

export default function MichaelisCurve() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: "visible" }}>
      {/* Axes */}
      <line x1={padX} y1={padY} x2={padX} y2={axisBottom} stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
      <line x1={padX} y1={axisBottom} x2={axisRight + 10} y2={axisBottom} stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />

      {/* Axis arrows */}
      <polygon points={`${padX},${padY - 2} ${padX - 3},${padY + 7} ${padX + 3},${padY + 7}`} fill="rgba(255,255,255,0.25)" />
      <polygon points={`${axisRight + 12},${axisBottom} ${axisRight + 4},${axisBottom - 3} ${axisRight + 4},${axisBottom + 3}`} fill="rgba(255,255,255,0.25)" />

      {/* Vmax dashed line */}
      <line
        x1={padX} y1={yVmax} x2={axisRight} y2={yVmax}
        stroke="rgba(240,165,0,0.55)" strokeWidth="1.2" strokeDasharray="5 4"
      />
      <text x={axisRight - 2} y={yVmax - 4} textAnchor="end" fontSize="9" fill="#f0a500">Vmax</text>

      {/* ½ Vmax dashed line (horizontal, only to curve) */}
      <line
        x1={padX} y1={yHalf.toFixed(1)} x2={xKm.toFixed(1)} y2={yHalf.toFixed(1)}
        stroke="rgba(240,165,0,0.35)" strokeWidth="1" strokeDasharray="4 3"
      />
      <text x={padX + 3} y={yHalf - 3} fontSize="8" fill="var(--text-muted)">½ Vmax</text>

      {/* Km dashed vertical line */}
      <line
        x1={xKm.toFixed(1)} y1={yHalf.toFixed(1)} x2={xKm.toFixed(1)} y2={axisBottom}
        stroke="rgba(240,165,0,0.35)" strokeWidth="1" strokeDasharray="4 3"
      />
      <text x={xKm} y={axisBottom + 12} textAnchor="middle" fontSize="8" fill="var(--text-muted)">Km</text>

      {/* Area fill under curve */}
      <defs>
        <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(91,156,246,0.15)" />
          <stop offset="100%" stopColor="rgba(91,156,246,0.01)" />
        </linearGradient>
      </defs>
      <polygon
        points={`${padX},${axisBottom} ${curvePts} ${axisRight},${axisBottom}`}
        fill="url(#curveGrad)"
      />

      {/* Curve */}
      <polyline
        points={curvePts}
        fill="none" stroke="#5b9cf6" strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round"
      />

      {/* Y-axis label */}
      <text
        x={padX - 26} y={padY + chartH / 2}
        textAnchor="middle" fontSize="9" fill="var(--text-muted)"
        transform={`rotate(-90, ${padX - 26}, ${padY + chartH / 2})`}
      >
        Reaction Rate (v)
      </text>

      {/* X-axis label */}
      <text x={padX + chartW / 2} y={H - 2} textAnchor="middle" fontSize="9" fill="var(--text-muted)">
        Substrate Concentration [S]
      </text>
    </svg>
  );
}

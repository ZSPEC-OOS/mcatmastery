// Bar chart: time per question by section
const bars = [
  { label: "Chem",    value: 112, color: "#5b9cf6" },
  { label: "CARS",    value: 135, color: "#f0a500" },
  { label: "BioBack", value: 85,  color: "#4ade80" },
  { label: "Psych/Soc", value: 95, color: "#a78bfa" },
];
const maxVal = Math.max(...bars.map((b) => b.value));

const W = 260, H = 80;
const padX = 32, padY = 8, chartH = H - padY - 20;
const barW = 28, gap = (W - padX - bars.length * barW) / (bars.length + 1);

export default function TimeBarCard() {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <h3 className="font-bold text-base mb-0.5" style={{ color: "var(--text-primary)" }}>
        Time Per Question
      </h3>
      <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
        Average answer time by section.
      </p>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%">
        {/* Gridlines */}
        {[0, 0.5, 1].map((t) => (
          <line
            key={t}
            x1={padX} y1={padY + (1 - t) * chartH}
            x2={W} y2={padY + (1 - t) * chartH}
            stroke="rgba(255,255,255,0.06)" strokeWidth="1"
          />
        ))}

        {/* Bars */}
        {bars.map((b, i) => {
          const bh = (b.value / maxVal) * chartH;
          const bx = padX + gap + i * (barW + gap);
          const by = padY + chartH - bh;
          return (
            <g key={b.label}>
              <rect x={bx} y={by} width={barW} height={bh} rx="3" fill={b.color} opacity="0.8" />
              <text x={bx + barW / 2} y={H - 6} textAnchor="middle" fontSize="8" fill="var(--text-muted)">
                {b.label}
              </text>
            </g>
          );
        })}

        {/* Y labels */}
        <text x={padX - 4} y={padY + 4} textAnchor="end" fontSize="8" fill="var(--text-muted)">1:25</text>
        <text x={padX - 4} y={padY + chartH / 2 + 4} textAnchor="end" fontSize="8" fill="var(--text-muted)">1:35</text>
      </svg>

      {/* Bottom summary row */}
      <div
        className="flex items-center gap-4 mt-2 pt-3 text-xs"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}
      >
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center"
          style={{ border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 10 }}
        >
          i
        </div>
        <span className="font-semibold" style={{ color: "var(--text-primary)" }}>1:45 min</span>
        <span style={{ color: "var(--text-muted)" }}>3.95 · All sections</span>
        <span className="font-semibold ml-auto" style={{ color: "#4ade80" }}>65</span>
        <span>1:35 min</span>
      </div>
    </div>
  );
}

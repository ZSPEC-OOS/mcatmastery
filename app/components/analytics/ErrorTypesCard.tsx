const segments = [
  { label: "Content Gap",       pct: 32, color: "#5b9cf6" },
  { label: "Misread Question",  pct: 26, color: "#f0a500" },
  { label: "Logic Error",       pct: 23, color: "#4ade80" },
  { label: "Timing",            pct: 19, color: "#a78bfa" },
];

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function slicePath(cx: number, cy: number, r: number, a1: number, a2: number) {
  const s = polar(cx, cy, r, a1);
  const e = polar(cx, cy, r, a2);
  const large = a2 - a1 > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${s.x.toFixed(1)} ${s.y.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(1)} ${e.y.toFixed(1)} Z`;
}

function sliceLabel(cx: number, cy: number, r: number, a1: number, a2: number, txt: string) {
  const mid = (a1 + a2) / 2;
  const p = polar(cx, cy, r * 0.65, mid);
  return { x: p.x, y: p.y, txt };
}

export default function ErrorTypesCard() {
  const cx = 90, cy = 90, r = 72;
  let angle = 0;
  const slices = segments.map((s) => {
    const sweep = (s.pct / 100) * 360;
    const a1 = angle, a2 = angle + sweep;
    angle += sweep;
    return { ...s, a1, a2 };
  });

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <h3 className="font-bold text-base mb-0.5" style={{ color: "var(--text-primary)" }}>
        Error Types
      </h3>
      <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
        Breakdown of your missed question types.
      </p>

      <div className="flex items-center gap-5">
        {/* Pie */}
        <svg viewBox="0 0 180 180" width="160" height="160" className="flex-shrink-0">
          {slices.map((s) => (
            <path key={s.label} d={slicePath(cx, cy, r, s.a1, s.a2)} fill={s.color} opacity="0.85" />
          ))}
          {/* Percentage labels inside slices */}
          {slices.map((s) => {
            const lbl = sliceLabel(cx, cy, r, s.a1, s.a2, `${s.pct}%`);
            return (
              <text
                key={s.label}
                x={lbl.x} y={lbl.y + 4}
                textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff"
              >
                {lbl.txt}
              </text>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="space-y-2.5">
          {segments.map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {s.label}{" "}
                <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{s.pct}%</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom actions */}
      <div
        className="flex items-center gap-4 mt-4 pt-3 text-xs"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)", color: "var(--text-muted)" }}
      >
        <button className="flex items-center gap-1 hover:text-text-primary transition-colors">
          ☆ Mark Reviewed
        </button>
        <button className="flex items-center gap-1">
          ▢ Add to Flashcards
        </button>
        <button className="flex items-center gap-1 ml-auto">
          ≡ Re-Queue for Practice
        </button>
      </div>
    </div>
  );
}

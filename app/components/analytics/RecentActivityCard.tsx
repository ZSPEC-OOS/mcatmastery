// Sparkline: 7 points trending upward
const sparkPts = "0,35 26,28 53,22 80,15 106,11 133,8 160,8";
const days = ["M", "T", "W", "T", "F", "S"];

export default function RecentActivityCard() {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <h3 className="font-bold text-base mb-0.5" style={{ color: "var(--text-primary)" }}>
        Recent Activity
      </h3>
      <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
        Questions completed last 7 days.
      </p>

      <div className="flex items-start justify-between gap-4">
        {/* Stats */}
        <div className="space-y-2">
          <div>
            <span className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>420</span>
            <span className="text-xs ml-2" style={{ color: "var(--text-secondary)" }}>Questions completed</span>
          </div>
          <div>
            <span className="text-lg font-semibold" style={{ color: "#4ade80" }}>62%</span>
            <span className="text-xs ml-2" style={{ color: "var(--text-secondary)" }}>Last 7 days accuracy</span>
          </div>
        </div>

        {/* Sparkline */}
        <div className="flex-1">
          <svg viewBox="0 0 160 44" width="100%">
            <defs>
              <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(91,156,246,0.2)" />
                <stop offset="100%" stopColor="rgba(91,156,246,0)" />
              </linearGradient>
            </defs>
            <polygon points={`0,44 ${sparkPts} 160,44`} fill="url(#sparkGrad)" />
            <polyline
              points={sparkPts}
              fill="none" stroke="#5b9cf6" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round"
            />
            {sparkPts.split(" ").map((pt, i) => {
              const [x, y] = pt.split(",");
              return <circle key={i} cx={x} cy={y} r="2.5" fill="#5b9cf6" stroke="var(--bg-card)" strokeWidth="1" />;
            })}
          </svg>
          {/* Day labels */}
          <div className="flex justify-between mt-1">
            {days.map((d) => (
              <span key={d} className="text-xs" style={{ color: "var(--text-muted)" }}>{d}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="flex items-center gap-4 mt-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>Last · day</span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>31 · 20m</span>
      </div>
    </div>
  );
}

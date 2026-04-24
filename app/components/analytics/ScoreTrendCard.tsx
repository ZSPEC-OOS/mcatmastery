import { type FLScore } from "../../../lib/api-client";

interface Props { flScores: FLScore[]; }

export default function ScoreTrendCard({ flScores }: Props) {
  const scores = flScores.map(s => s.total);
  const labels = flScores.map(s =>
    new Date(s.takenAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  );

  if (scores.length < 2) return (
    <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <h3 className="font-bold text-base mb-2" style={{ color: "var(--text-primary)" }}>Score Trend</h3>
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Add full-length exam scores to see your trend.
      </p>
    </div>
  );

  const W = 300, H = 130, padX = 38, padY = 18;
  const chartW = W - padX - 12, chartH = H - padY - 28;
  const yMin = Math.min(...scores) - 2, yMax = Math.max(...scores) + 2;
  const sx = (i: number) => padX + (i / (scores.length - 1)) * chartW;
  const sy = (v: number) => padY + chartH - ((v - yMin) / (yMax - yMin)) * chartH;
  const pts = scores.map((s, i) => `${sx(i).toFixed(1)},${sy(s).toFixed(1)}`).join(" ");
  const area = `${sx(0)},${padY + chartH} ${pts} ${sx(scores.length - 1)},${padY + chartH}`;
  const target = sy(515);

  return (
    <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <h3 className="font-bold text-base mb-0.5" style={{ color: "var(--text-primary)" }}>Score Trend</h3>
      <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>Full-length practice test scores</p>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#6366f1" }} />
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>FL Scores</span>
        </div>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>Target: 515</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%">
        <defs>
          <linearGradient id="sg2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(91,156,246,0.25)" />
            <stop offset="100%" stopColor="rgba(91,156,246,0)" />
          </linearGradient>
        </defs>
        {yMin <= 515 && 515 <= yMax && (
          <line x1={padX} y1={target} x2={W - 12} y2={target}
            stroke="rgba(240,165,0,0.5)" strokeWidth="1.2" strokeDasharray="5 4" />
        )}
        <polygon points={area} fill="url(#sg2)" />
        <polyline points={pts} fill="none" stroke="#6366f1" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" />
        {scores.map((s, i) => (
          <circle key={i} cx={sx(i)} cy={sy(s)} r="3.5" fill="#6366f1"
            stroke="var(--bg-card)" strokeWidth="1.5" />
        ))}
        {labels.map((l, i) => (
          <text key={i} x={sx(i)} y={H - 6} textAnchor="middle" fontSize="8" fill="var(--text-muted)">{l}</text>
        ))}
        {scores.map((s, i) => (
          <text key={i} x={sx(i)} y={sy(s) - 6} textAnchor="middle" fontSize="7.5" fill="var(--text-secondary)">{s}</text>
        ))}
      </svg>
    </div>
  );
}

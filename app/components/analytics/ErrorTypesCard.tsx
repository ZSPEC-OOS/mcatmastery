import { type Analytics, type ErrorType } from "../../../lib/api-client";
interface Props { errorTypes: Analytics["errorTypes"]; }

const COLORS: Record<ErrorType, string> = {
  "Content Gap": "#5b9cf6", "Logic Error": "#f0a500",
  "Misread Question": "#a78bfa", "Timing": "#f87171",
};

export default function ErrorTypesCard({ errorTypes }: Props) {
  const total = Object.values(errorTypes).reduce((a, b) => a + b, 0);
  return (
    <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <h3 className="font-bold text-base mb-4" style={{ color: "var(--text-primary)" }}>Error Types</h3>
      {total === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No errors logged yet.</p>
      ) : (
        <div className="space-y-3">
          {(Object.entries(errorTypes) as [ErrorType, number][])
            .sort(([, a], [, b]) => b - a)
            .map(([type, count]) => {
              const pct = Math.round((count / total) * 100);
              return (
                <div key={type}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: "var(--text-secondary)" }}>{type}</span>
                    <span style={{ color: COLORS[type], fontWeight: 600 }}>{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: COLORS[type] }} />
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

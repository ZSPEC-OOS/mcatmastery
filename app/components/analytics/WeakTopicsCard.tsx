import { type Analytics } from "../../../lib/api-client";
interface Props { weakTopics: Analytics["weakTopics"]; }

export default function WeakTopicsCard({ weakTopics }: Props) {
  return (
    <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <h3 className="font-bold text-base mb-4" style={{ color: "var(--text-primary)" }}>Weakest Topics</h3>
      {weakTopics.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Answer more questions to identify weak topics.</p>
      ) : (
        <div className="space-y-3">
          {weakTopics.map((t, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-sm font-bold w-5 text-center" style={{ color: "var(--text-muted)" }}>
                {i + 1}
              </span>
              <div className="flex-1">
                <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{t.label}</div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>{t.section}</div>
              </div>
              <span className="text-sm font-bold" style={{ color: t.accuracy < 55 ? "#f87171" : "#f0a500" }}>
                {t.accuracy}%
              </span>
              <a href="/practice" className="text-xs px-2 py-1 rounded"
                style={{ border: "1px solid var(--border)", color: "var(--text-secondary)", textDecoration: "none" }}>
                Practice
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

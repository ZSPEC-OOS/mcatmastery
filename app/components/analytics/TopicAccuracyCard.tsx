// Heatmap cell colors per topic row (7 cells each, low→high accuracy)
const topics = [
  {
    label: "Enzyme Kinetics",
    pct: 45,
    cells: ["#c03", "#b03", "#c03", "#a03", "#b14", "#c03", "#a03"],
  },
  {
    label: "Circuits",
    pct: 64,
    cells: ["#c8a030", "#b8901e", "#d4a840", "#c09028", "#b07818", "#d4a840", "#c09028"],
  },
  {
    label: "Amino Acids",
    pct: 79,
    cells: ["#2a7a40", "#3a8a50", "#4a9a60", "#2a7a40", "#3a8a50", "#4a9a60", "#5aaa70"],
  },
];

export default function TopicAccuracyCard() {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <h3 className="font-bold text-base mb-0.5" style={{ color: "var(--text-primary)" }}>
        Topic Accuracy
      </h3>
      <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
        Accuracy percentage by topic area.
      </p>

      {/* Table header */}
      <div
        className="flex items-center px-3 py-1.5 rounded-t"
        style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid var(--border)" }}
      >
        <span className="text-xs font-semibold flex-1" style={{ color: "var(--text-muted)" }}>
          Topic
        </span>
        <span className="text-xs font-semibold w-12 text-right" style={{ color: "var(--text-muted)" }}>
          %
        </span>
        <span className="text-xs font-semibold w-32 text-right" style={{ color: "var(--text-muted)" }}>
          &nbsp;
        </span>
      </div>

      {/* Rows */}
      {topics.map((t) => (
        <div
          key={t.label}
          className="flex items-center px-3 py-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
        >
          <span className="text-sm flex-1" style={{ color: "var(--text-primary)" }}>
            {t.label}
          </span>
          <span className="text-sm font-semibold w-12 text-right" style={{ color: "var(--text-secondary)" }}>
            {t.pct}%
          </span>
          {/* Heatmap cells */}
          <div className="flex gap-1 ml-4">
            {t.cells.map((c, i) => (
              <div
                key={i}
                className="rounded-sm"
                style={{ width: 14, height: 14, background: c, opacity: 0.9 }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

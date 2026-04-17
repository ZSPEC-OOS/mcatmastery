const mistakes = [
  { label: "Misread graph axis",    sub: "Chem/Phys • Q#01834", date: "4/22" },
  { label: "Confused Vmax vs Km",   sub: "Chem/Phys • Q#01159", date: "4/16" },
  { label: "Incorrect inhibitor type", sub: "Bio/Biochem • Q#01398", date: "4/10" },
];

const quickActions = [
  { icon: "▤", label: "Practice 12 Questions" },
  { icon: "⇄", label: "Review Mistakes" },
  { icon: "▢", label: "Add Flashcards (8)" },
  { icon: "✓", label: "Mark as Reviewed" },
];

const calDays = [
  { label: "Mon", value: "✓", sub: "Easy",   active: false, done: true },
  { label: "Tue", value: "✓", sub: "Good",   active: false, done: true },
  { label: "Wed", value: "8",  sub: "Review", active: true,  done: false },
  { label: "Thu", value: "12", sub: "New",    active: false, done: false },
  { label: "Fri", value: "5",  sub: "Today",  active: false, done: false },
];

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl p-4 ${className}`}
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      {children}
    </div>
  );
}

export default function RightPanel() {
  return (
    <div
      className="overflow-y-auto py-6 px-4 space-y-4"
      style={{ width: 272, minWidth: 272, borderLeft: "1px solid var(--border)" }}
    >
      {/* Equation box */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
            Michaelis–Menten Equation
          </span>
          <button className="text-xs" style={{ color: "var(--accent-blue)" }}>View All</button>
        </div>

        {/* Formula display */}
        <div
          className="flex items-center justify-center py-4 mb-3 rounded-lg"
          style={{ background: "rgba(255,255,255,0.03)" }}
        >
          <span className="text-xl font-serif italic" style={{ color: "var(--text-primary)" }}>
            v =&nbsp;
          </span>
          <div className="flex flex-col items-center mx-1">
            <span className="text-base font-serif italic border-b pb-0.5" style={{ color: "var(--text-primary)", borderColor: "var(--text-primary)" }}>
              V<sub>max</sub>[S]
            </span>
            <span className="text-base font-serif italic pt-0.5" style={{ color: "var(--text-primary)" }}>
              K<sub>m</sub> + [S]
            </span>
          </div>
        </div>

        {/* Variable defs */}
        <div className="space-y-1">
          {[
            ["v", "reaction rate"],
            ["Vmax", "maximum rate"],
            ["Km", "substrate conc. at ½ Vmax"],
            ["[S]", "substrate concentration"],
          ].map(([sym, def]) => (
            <div key={sym} className="flex items-center gap-2 text-xs">
              <span className="font-mono w-10" style={{ color: "var(--text-primary)" }}>{sym}</span>
              <span style={{ color: "var(--text-muted)" }}>= {def}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Common Inhibitor Effects */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
            Common Inhibitor Effects
          </span>
          <button className="text-xs" style={{ color: "var(--text-secondary)" }}>View All ▾</button>
        </div>
        <div className="space-y-3">
          {mistakes.map((m) => (
            <div key={m.label} className="flex items-start gap-2">
              <div
                className="w-3.5 h-3.5 rounded-sm flex-shrink-0 mt-0.5"
                style={{ border: "1px solid var(--border)" }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs" style={{ color: "var(--text-primary)" }}>{m.label}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{m.sub}</p>
              </div>
              <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>{m.date}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Quick Actions */}
      <Card>
        <p className="text-xs font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
          Quick Actions
        </p>
        <div className="space-y-1">
          {quickActions.map((a) => (
            <button
              key={a.label}
              className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors"
              style={{ color: "var(--text-secondary)" }}
            >
              <span className="text-base w-5 text-center" style={{ color: "var(--text-muted)" }}>{a.icon}</span>
              <span className="flex-1 text-xs">{a.label}</span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>→</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Spaced Repetition */}
      <Card>
        <p className="text-xs font-semibold mb-0.5" style={{ color: "var(--text-primary)" }}>
          Spaced Repetition
        </p>
        <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
          Next review in: <strong style={{ color: "var(--text-primary)" }}>2 days</strong>
        </p>
        <div className="grid grid-cols-5 gap-1 text-center">
          {calDays.map((d) => (
            <div key={d.label} className="flex flex-col items-center gap-1">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{d.label}</span>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                style={{
                  background: d.done
                    ? "var(--accent-blue)"
                    : d.active
                    ? "rgba(45,106,224,0.35)"
                    : "rgba(255,255,255,0.06)",
                  color: d.done || d.active ? "#fff" : "var(--text-secondary)",
                  border: d.active ? "1px solid var(--accent-blue)" : "none",
                }}
              >
                {d.value}
              </div>
              <span className="text-xs" style={{ color: d.active ? "var(--text-primary)" : "var(--text-muted)" }}>
                {d.sub}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default function PassagePanel() {
  const questionNums = Array.from({ length: 16 }, (_, i) => i + 1);

  const getButtonStyle = (n: number): React.CSSProperties => {
    if (n === 1) {
      return { background: "var(--accent-blue)", color: "#fff" };
    }
    if ([2, 5, 8].includes(n)) {
      return { background: "rgba(45,106,224,0.25)", color: "var(--text-primary)" };
    }
    return { background: "rgba(255,255,255,0.05)", color: "var(--text-muted)" };
  };

  return (
    <div
      className="overflow-y-auto"
      style={{
        width: "240px",
        minWidth: "240px",
        background: "var(--bg-card)",
        borderRight: "1px solid var(--border)",
      }}
    >
      <div className="px-4 py-5">
        {/* Title */}
        <h2
          className="font-bold text-base mb-3"
          style={{ color: "var(--text-primary)" }}
        >
          Enzyme Kinetics
        </h2>

        {/* Paragraph 1 */}
        <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--text-secondary)" }}>
          Enzymes catalyze reactions by forming an enzyme-substrate (ES) complex. The substrate binds at the active site, lowering the activation energy required to form products.
        </p>

        {/* Equation block */}
        <div
          className="italic font-medium text-sm my-3 px-2 py-1 rounded"
          style={{
            color: "var(--text-primary)",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          E + S ⇌ ES ⇌ E + P
        </div>

        {/* Paragraph 2 */}
        <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--text-secondary)" }}>
          The Michaelis constant (K<sub>m</sub>) is defined as (k₋₁ + k₂) / k₁. It represents the substrate concentration at which the reaction rate is half of V<sub>max</sub>.
        </p>

        {/* Km formula block */}
        <div
          className="italic font-medium text-sm my-3 px-2 py-1 rounded"
          style={{
            color: "var(--text-primary)",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          K<sub>m</sub> = (k₋₁ + k₂) / k₁
        </div>

        {/* Vmax formula block */}
        <div
          className="italic font-medium text-sm my-3 px-2 py-1 rounded"
          style={{
            color: "var(--text-primary)",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          V<sub>max</sub> = [E<sub>t</sub>] · k₂
        </div>

        {/* Paragraph 3 */}
        <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--text-secondary)" }}>
          A lower K<sub>m</sub> indicates tighter enzyme-substrate binding. V<sub>max</sub> is the theoretical maximum rate when all enzyme molecules are saturated.
        </p>

        {/* View Full Passage button */}
        <button
          className="w-full text-xs py-1.5 rounded mt-3"
          style={{
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
            background: "transparent",
          }}
        >
          View Full Passage
        </button>

        {/* Divider */}
        <hr className="my-4" style={{ borderColor: "var(--border)" }} />

        {/* Question navigation grid */}
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: "repeat(6, 1fr)" }}
        >
          {questionNums.map((n) => (
            <button
              key={n}
              className="text-xs rounded py-1 font-medium"
              style={getButtonStyle(n)}
            >
              {n}
            </button>
          ))}
        </div>

        {/* End Practice button */}
        <button
          className="w-full text-xs mt-4 py-1.5 rounded"
          style={{
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
            background: "transparent",
          }}
        >
          End Practice
        </button>
      </div>
    </div>
  );
}

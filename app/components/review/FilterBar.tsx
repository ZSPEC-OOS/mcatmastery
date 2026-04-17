"use client";

const selectStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  color: "var(--text-secondary)",
  fontSize: "0.75rem",
  padding: "4px 8px",
  borderRadius: "6px",
};

export default function FilterBar() {
  return (
    <div className="flex items-center gap-4 py-3 mb-2">
      {/* Left group */}
      <div className="flex items-center gap-3">
        {/* Section */}
        <label className="flex items-center gap-2">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Section
          </span>
          <select style={selectStyle}>
            <option>All Sections</option>
            <option>Chem/Phys</option>
            <option>CARS</option>
            <option>Bio/Biochem</option>
            <option>Psych/Soc</option>
          </select>
        </label>

        {/* Topic */}
        <label className="flex items-center gap-2">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Topic
          </span>
          <select style={selectStyle}>
            <option>All Topics</option>
            <option>Enzyme Kinetics</option>
            <option>Amino Acids</option>
            <option>Inference Questions</option>
            <option>Thermodynamics</option>
            <option>Kinematics</option>
          </select>
        </label>

        {/* Type */}
        <select style={selectStyle}>
          <option>All Types</option>
          <option>Content Gap</option>
          <option>Logic Error</option>
          <option>Misread Question</option>
          <option>Timing</option>
        </select>
      </div>

      {/* Right group */}
      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          Status
        </span>
        <div className="flex">
          <button
            className="px-3 py-1.5 text-sm"
            style={{
              border: "1px solid var(--border)",
              borderRight: "none",
              color: "var(--text-secondary)",
              background: "transparent",
              borderRadius: "6px 0 0 6px",
            }}
          >
            All
          </button>
          <button
            className="px-2 py-1.5 text-sm"
            style={{
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              background: "transparent",
              borderRadius: "0 6px 6px 0",
            }}
          >
            ▼
          </button>
        </div>
      </div>
    </div>
  );
}

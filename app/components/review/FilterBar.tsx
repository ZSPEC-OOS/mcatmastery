"use client";

const selectStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  color: "var(--text-secondary)",
  fontSize: "0.75rem",
  padding: "4px 8px",
  borderRadius: "6px",
};

interface Props {
  section: string;    onSection: (v: string) => void;
  errorType: string;  onErrorType: (v: string) => void;
  status: string;     onStatus: (v: string) => void;
}

export default function FilterBar({ section, onSection, errorType, onErrorType, status, onStatus }: Props) {
  return (
    <div className="flex items-center gap-4 py-3 mb-2">
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Section</span>
          <select style={selectStyle} value={section} onChange={e => onSection(e.target.value)}>
            <option value="">All Sections</option>
            <option>Chem/Phys</option>
            <option>CARS</option>
            <option>Bio/Biochem</option>
            <option>Psych/Soc</option>
          </select>
        </label>

        <label className="flex items-center gap-2">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Type</span>
          <select style={selectStyle} value={errorType} onChange={e => onErrorType(e.target.value)}>
            <option value="">All Types</option>
            <option>Content Gap</option>
            <option>Logic Error</option>
            <option>Misread Question</option>
            <option>Timing</option>
          </select>
        </label>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>Status</span>
        <div className="flex">
          {["", "pending", "reviewed"].map((s, i) => (
            <button
              key={s}
              onClick={() => onStatus(s)}
              className="px-3 py-1.5 text-xs"
              style={{
                border: "1px solid var(--border)",
                borderRight: i < 2 ? "none" : undefined,
                color: status === s ? "var(--text-primary)" : "var(--text-secondary)",
                background: status === s ? "rgba(45,106,224,0.15)" : "transparent",
                borderRadius: i === 0 ? "6px 0 0 6px" : i === 2 ? "0 6px 6px 0" : "0",
              }}
            >
              {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

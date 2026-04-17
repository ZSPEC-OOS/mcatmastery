"use client";

interface Props {
  selectedId: string;
  onSelect: (id: string) => void;
}

const sectionColors: Record<string, string> = {
  "Chem/Phys": "#5b9cf6",
  "CARS": "#f0a500",
  "Bio/Biochem": "#4ade80",
  "Psych/Soc": "#a78bfa",
};

type ErrorType = "Content Gap" | "Logic Error" | "Misread Question" | "Timing";

const errorBadgeStyles: Record<ErrorType, React.CSSProperties> = {
  "Content Gap": {
    background: "rgba(45,106,224,0.2)",
    color: "#6eaeff",
    border: "1px solid rgba(45,106,224,0.35)",
  },
  "Logic Error": {
    background: "rgba(240,165,0,0.2)",
    color: "#f0c060",
    border: "1px solid rgba(240,165,0,0.35)",
  },
  "Misread Question": {
    background: "rgba(168,85,247,0.2)",
    color: "#c084fc",
    border: "1px solid rgba(168,85,247,0.35)",
  },
  "Timing": {
    background: "rgba(74,222,128,0.2)",
    color: "#4ade80",
    border: "1px solid rgba(74,222,128,0.35)",
  },
};

const rows = [
  { id: "01834", section: "Chem/Phys", topic: "Enzyme Kinetics", yourAnswer: "C", correct: "B", errorType: "Content Gap" as ErrorType, date: "6/24/2024" },
  { id: "01367", section: "CARS", topic: "Inference Questions", yourAnswer: "A", correct: "C", errorType: "Logic Error" as ErrorType, date: "4/22/2024" },
  { id: "01432", section: "Bio/Biochem", topic: "Amino Acids", yourAnswer: "D", correct: "C", errorType: "Misread Question" as ErrorType, date: "4/10/2024" },
  { id: "01398", section: "Psych/Soc", topic: "Self Identity Development", yourAnswer: "C", correct: "H", errorType: "Misread Question" as ErrorType, date: "6/11/2024" },
  { id: "01159", section: "Chem/Phys", topic: "Thermodynamics", yourAnswer: "A", correct: "D", errorType: "Timing" as ErrorType, date: "4/16/2024" },
];

export default function MistakeTable({ selectedId, onSelect }: Props) {
  return (
    <div
      className="rounded-xl overflow-hidden mb-6"
      style={{ border: "1px solid var(--border)" }}
    >
      {/* Header row */}
      <div
        className="grid text-xs px-4 py-2"
        style={{
          background: "rgba(22,27,34,0.8)",
          color: "var(--text-muted)",
          gridTemplateColumns: "80px 110px 1fr 90px 80px 130px 90px 90px",
        }}
      >
        <span>#</span>
        <span>Section</span>
        <span>Topic</span>
        <span>Your Answer</span>
        <span>Answer</span>
        <span>Error Type</span>
        <span>Date ↓</span>
        <span>Status</span>
      </div>

      {/* Data rows */}
      {rows.map((row) => {
        const isSelected = row.id === selectedId;
        return (
          <div
            key={row.id}
            className="grid items-center cursor-pointer"
            style={{
              gridTemplateColumns: "80px 110px 1fr 90px 80px 130px 90px 90px",
              background: isSelected ? "rgba(45,106,224,0.08)" : "var(--bg-card)",
              borderLeft: isSelected ? "2px solid var(--accent-blue)" : "2px solid transparent",
              borderTop: "1px solid var(--border)",
            }}
            onClick={() => onSelect(row.id)}
          >
            <span className="px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
              # {row.id}
            </span>
            <span className="px-4 py-3 text-sm flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: sectionColors[row.section] ?? "var(--text-muted)" }}
              />
              <span style={{ color: "var(--text-primary)" }}>{row.section}</span>
            </span>
            <span className="px-4 py-3 text-sm" style={{ color: "var(--text-primary)" }}>
              {row.topic}
            </span>
            <span className="px-4 py-3 text-sm flex items-center gap-1" style={{ color: "#f87171" }}>
              ✗ {row.yourAnswer}
            </span>
            <span className="px-4 py-3 text-sm flex items-center gap-1" style={{ color: "#4ade80" }}>
              ✓ {row.correct}
            </span>
            <span className="px-4 py-3">
              <span
                className="text-xs px-2 py-0.5 rounded"
                style={errorBadgeStyles[row.errorType]}
              >
                {row.errorType}
              </span>
            </span>
            <span className="px-4 py-3 text-sm" style={{ color: "var(--text-muted)" }}>
              {row.date}
            </span>
            <span className="px-4 py-3 text-sm flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: "#4ade80" }} />
              <span style={{ color: "#4ade80" }}>Reviewed</span>
            </span>
          </div>
        );
      })}

      {/* Pagination row */}
      <div
        className="px-4 py-3 flex justify-between items-center"
        style={{ borderTop: "1px solid var(--border)", background: "var(--bg-card)" }}
      >
        <div className="flex items-center gap-1">
          {[1, 2, 3].map((p) => (
            <button
              key={p}
              className="w-7 h-7 flex items-center justify-center rounded text-sm"
              style={{
                background: p === 1 ? "var(--accent-blue)" : "transparent",
                color: p === 1 ? "#fff" : "var(--text-secondary)",
                border: p === 1 ? "none" : "1px solid var(--border)",
              }}
            >
              {p}
            </button>
          ))}
          <button
            className="px-2 py-1 text-sm"
            style={{ color: "var(--text-secondary)", background: "transparent", border: "none" }}
          >
            Next›
          </button>
        </div>
        <div className="flex items-center gap-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          <span>1</span>
          <span>2</span>
          <span>3</span>
          <span>Next</span>
        </div>
      </div>
    </div>
  );
}

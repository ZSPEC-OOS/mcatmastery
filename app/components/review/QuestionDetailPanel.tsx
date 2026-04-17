"use client";

interface Props {
  id: string;
  onClose: () => void;
}

export default function QuestionDetailPanel({ id, onClose }: Props) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border: "1px solid var(--border)",
        background: "var(--bg-card)",
      }}
    >
      {/* Header bar */}
      <div
        className="px-4 py-3 flex items-center gap-3"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <span className="font-mono text-sm" style={{ color: "var(--text-primary)" }}>
          # {id}
        </span>
        <span
          className="px-2 py-0.5 rounded text-xs"
          style={{
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          Passage 3
        </span>
        <div className="ml-auto flex items-center gap-2">
          <ClockIcon />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            4n ago
          </span>
          <button
            className="px-3 py-1 rounded text-xs"
            style={{
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              background: "transparent",
            }}
          >
            Select
          </button>
          <button
            className="p-1 rounded"
            style={{
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              background: "transparent",
            }}
          >
            <FilterIcon />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col lg:flex-row">
        {/* LEFT panel */}
        <div className="p-5 flex-1">
          {/* Question */}
          <p className="text-sm mb-4" style={{ color: "var(--text-primary)" }}>
            Given the data, which of the following is the most likely value for k<sub>m</sub>?
          </p>

          {/* Radio options */}
          <div className="space-y-2">
            {[
              { label: "A", text: "0.06 mM", selected: false },
              { label: "B", text: "0.5 mM", selected: false },
              { label: "C", text: "10 mM", selected: true },
              { label: "D", text: "111 mM", selected: false },
            ].map((opt) => (
              <div key={opt.label} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: opt.selected ? "var(--accent-blue)" : "transparent",
                    border: opt.selected ? "none" : "2px solid var(--border)",
                  }}
                >
                  {opt.selected && (
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#fff" }} />
                  )}
                </div>
                <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                  {opt.label}. {opt.text}
                </span>
              </div>
            ))}
          </div>

          {/* Passage reference box */}
          <div
            className="mt-4 p-3 rounded-lg"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="flex items-center gap-2">
              <FolderIcon />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                Website Passage 3
              </span>
            </div>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
              An MCAT student studied the enzyme kinetics of a...
            </p>
            <button
              className="text-xs mt-2 px-2 py-1 rounded"
              style={{
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
                background: "transparent",
              }}
            >
              View Passage
            </button>
          </div>

          {/* Metadata */}
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <GridIcon />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                Question ID
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Toggle off */}
              <div
                className="w-8 h-4 rounded-full flex items-center px-0.5 flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.1)" }}
              >
                <div className="w-3 h-3 rounded-full" style={{ background: "var(--text-muted)" }} />
              </div>
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Didn&apos;t understand Km definition
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Unchecked checkbox */}
              <div
                className="w-4 h-4 rounded flex-shrink-0"
                style={{ border: "1px solid var(--border)", background: "transparent" }}
              />
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Correct Answer: Km at the [S] at ½ Vmax
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT panel */}
        <div
          className="p-5 w-full lg:w-96"
          style={{
            borderLeft: "1px solid var(--border)",
            background: "rgba(255,255,255,0.01)",
          }}
        >
          {/* Explanation heading */}
          <p
            className="text-xs font-semibold uppercase mb-2"
            style={{ color: "var(--text-muted)" }}
          >
            Explanation
          </p>

          {/* Content Gap badge */}
          <span
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded"
            style={{
              background: "rgba(45,106,224,0.2)",
              color: "#6eaeff",
              border: "1px solid rgba(45,106,224,0.35)",
            }}
          >
            Content Gap ▾
          </span>

          {/* Italic explanation */}
          <p
            className="text-xs italic mt-2"
            style={{ color: "var(--text-secondary)" }}
          >
            The Michaelis constant K<sub>m</sub> is defined as the substrate concentration at which the reaction rate equals ½ V<sub>max</sub>.
          </p>

          {/* Formula block */}
          <div
            className="px-3 py-2 mt-2 rounded text-sm font-mono"
            style={{
              background: "rgba(255,255,255,0.04)",
              color: "var(--text-primary)",
            }}
          >
            Km = (k₋₁ + k₂) / k₁
          </div>

          {/* Explanation text */}
          <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
            When [S] = Km, reaction rate = ½ Vmax. The data shows the half-maximal rate occurs between 1 and 10 mM, making C (10 mM) the closest answer.
          </p>

          {/* Badge row */}
          <div className="flex gap-2 mt-3">
            <span
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded"
              style={{
                background: "rgba(45,106,224,0.2)",
                color: "#6eaeff",
                border: "1px solid rgba(45,106,224,0.35)",
              }}
            >
              Content Gap ▾
            </span>
            <span
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded"
              style={{
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
                background: "transparent",
              }}
            >
              Content n Personere ▾
            </span>
          </div>

          {/* Your Notes */}
          <p className="text-xs mt-3 mb-1" style={{ color: "var(--text-muted)" }}>
            Your Notes
          </p>
          <textarea
            className="w-full p-2 rounded text-xs"
            rows={2}
            defaultValue="Didn't understand Km definition"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              resize: "vertical",
            }}
          />
        </div>
      </div>

      {/* Footer bar */}
      <div
        className="px-4 py-3"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        {/* Row 1 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <CheckboxIcon />
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Key Takeaway
            </span>
          </div>
          <div className="ml-auto flex gap-4">
            <button
              className="text-xs"
              style={{ color: "var(--text-secondary)", background: "transparent", border: "none" }}
            >
              Mark Reviewed
            </button>
            <button
              className="text-xs flex items-center gap-1"
              style={{ color: "var(--text-secondary)", background: "transparent", border: "none" }}
            >
              <FolderIcon />
              Add to Flashcards
            </button>
            <button
              className="text-xs flex items-center gap-1"
              style={{ color: "var(--text-secondary)", background: "transparent", border: "none" }}
            >
              <ListIcon />
              Re-Queue for Practice
            </button>
          </div>
        </div>

        {/* Row 2 */}
        <div className="flex justify-end gap-3 mt-3">
          <button
            className="px-4 py-1.5 rounded text-sm"
            style={{
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              background: "transparent",
            }}
            onClick={onClose}
          >
            Close
          </button>
          <button
            className="px-4 py-1.5 rounded text-sm font-semibold"
            style={{
              background: "var(--accent-blue)",
              color: "#fff",
              border: "none",
            }}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function CheckboxIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

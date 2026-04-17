export default function HeroBanner() {
  return (
    <div
      className="relative overflow-hidden px-8 py-10"
      style={{
        background: "linear-gradient(135deg, #0f1b2d 0%, #0d1117 60%, #111827 100%)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(var(--text-primary) 1px, transparent 1px), linear-gradient(90deg, var(--text-primary) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative max-w-6xl mx-auto flex flex-col md:flex-row md:items-start md:justify-between gap-8">
        {/* Left: plan info */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <span
              className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
              style={{ background: "rgba(45,106,224,0.2)", color: "#6eaeff", border: "1px solid rgba(45,106,224,0.35)" }}
            >
              12-Week Standard
            </span>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>WK 4 / 12</span>
          </div>

          <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
            Study Plan Configuration
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
            Choose a focused plan that matches your schedule, diagnostic results.
          </p>

          <button
            className="px-6 py-2.5 rounded font-semibold text-sm transition-all"
            style={{
              background: "var(--accent-blue)",
              color: "#fff",
              boxShadow: "0 0 20px rgba(45,106,224,0.4)",
            }}
          >
            Continue Today&apos;s Work
          </button>
        </div>

        {/* Right: performance snapshot card */}
        <div
          className="md:w-72 rounded-xl p-5"
          style={{
            background: "rgba(22,27,34,0.85)",
            border: "1px solid var(--border)",
            backdropFilter: "blur(12px)",
          }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-secondary)" }}>
            Performance Snapshot
          </h3>
          <div className="space-y-3">
            <SnapshotRow label="Last Full-Length score" value="509" highlight />
            <SnapshotRow label="Target score" value="515" />
            <SnapshotRow label="Week progress" value="August 17, 2024" small />
          </div>
        </div>
      </div>
    </div>
  );
}

function SnapshotRow({
  label,
  value,
  highlight,
  small,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  small?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
        {label}
      </span>
      <span
        className={small ? "text-sm" : "font-bold"}
        style={{
          color: highlight ? "var(--text-primary)" : "var(--text-secondary)",
          fontSize: highlight ? "1.4rem" : undefined,
        }}
      >
        {value}
      </span>
    </div>
  );
}

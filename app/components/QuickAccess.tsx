const tiles = [
  {
    label: "Resume Last Lesson",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="4" width="24" height="24" rx="3" stroke="currentColor" strokeWidth="1.6" />
        <path d="M10 10h12M10 15h8M10 20h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M22 20l4-2.5-4-2.5V20z" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: "Open Question Bank",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="6" width="18" height="22" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M22 10h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H10" stroke="currentColor" strokeWidth="1.6" />
        <path d="M10 12h8M10 16h8M10 20h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Review Mistake Log",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="6" y="4" width="20" height="24" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M11 11h10M11 16h7M11 21h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="22" cy="22" r="5" fill="#e05c5c" />
        <path d="M20 22h4M22 20v4" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Start Timed Section",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="17" r="11" stroke="currentColor" strokeWidth="1.6" />
        <path d="M16 10v7l4 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13 4h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function QuickAccess() {
  return (
    <section className="max-w-6xl mx-auto px-6 pb-12">
      <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
        Quick Access
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tiles.map((tile) => (
          <button
            key={tile.label}
            className="rounded-xl p-6 flex flex-col items-center gap-4 text-sm font-medium transition-all group"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            <span
              className="transition-colors"
              style={{ color: "rgba(100,149,237,0.8)" }}
            >
              {tile.icon}
            </span>
            <span style={{ color: "var(--text-primary)" }}>{tile.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

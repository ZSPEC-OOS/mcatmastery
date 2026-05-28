export default function Footer() {
  return (
    <footer
      className="mt-auto px-6 py-5"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-5">
          <a href="#" className="text-xs transition-colors" style={{ color: "var(--text-muted)" }}>
            Privacy
          </a>
          <a href="#" className="text-xs transition-colors" style={{ color: "var(--text-muted)" }}>
            Terms
          </a>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            © 2026 MCAT
          </span>
        </div>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          © 2026 MCAT Mastery. All rights reserved.
        </span>
      </div>
    </footer>
  );
}

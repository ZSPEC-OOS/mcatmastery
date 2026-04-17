"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navLinks = [
  { label: "Dashboard", href: "/" },
  { label: "Practice", href: "/practice" },
  { label: "Review", href: "/review" },
  { label: "Analytics", href: "/analytics" },
  { label: "Curriculum", href: "/curriculum" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <nav
        style={{ background: "rgba(13,17,23,0.92)", borderBottom: "1px solid var(--border)" }}
        className="sticky top-0 z-50 backdrop-blur-sm"
      >
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1 font-bold text-lg tracking-tight">
            <span style={{ color: "var(--text-primary)" }}>MCAT</span>
            <span style={{ color: "var(--text-secondary)" }}>&nbsp;Mastery</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="px-4 py-1.5 rounded text-sm font-medium transition-colors"
                style={{
                  color: isActive(link.href) ? "var(--text-primary)" : "var(--text-secondary)",
                  background: isActive(link.href) ? "rgba(45,106,224,0.18)" : "transparent",
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Icon buttons — desktop only */}
            <div className="hidden md:flex items-center gap-3">
              <button className="w-8 h-8 flex items-center justify-center rounded-full" style={{ color: "var(--text-secondary)" }} title="Timer">
                <ClockIcon />
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-full" style={{ color: "var(--text-secondary)" }} title="Bookmarks">
                <BookmarkIcon />
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-full" style={{ color: "var(--text-secondary)" }} title="Settings">
                <SettingsIcon />
              </button>
            </div>

            {/* Hamburger — mobile only */}
            <button
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg"
              style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <XIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div
          className="md:hidden sticky top-14 z-40 w-full"
          style={{ background: "rgba(13,17,23,0.98)", borderBottom: "1px solid var(--border)" }}
        >
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center px-5 py-3.5 text-sm font-medium"
              style={{
                color: isActive(link.href) ? "var(--text-primary)" : "var(--text-secondary)",
                borderLeft: isActive(link.href) ? "2px solid var(--accent-blue)" : "2px solid transparent",
                background: isActive(link.href) ? "rgba(45,106,224,0.06)" : "transparent",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

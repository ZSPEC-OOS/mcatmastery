"use client";
import Link from "next/link";
import { useState } from "react";

const navLinks = [
  { label: "Dashboard", href: "/" },
  { label: "Curriculum", href: "/curriculum" },
  { label: "Practice", href: "/practice" },
  { label: "Analytics", href: "/analytics" },
];

export default function Navbar() {
  const [active, setActive] = useState("Dashboard");

  return (
    <nav
      style={{ background: "rgba(13,17,23,0.92)", borderBottom: "1px solid var(--border)" }}
      className="sticky top-0 z-50 backdrop-blur-sm"
    >
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1 font-bold text-lg tracking-tight">
          <span style={{ color: "var(--text-primary)" }}>MCAT</span>
          <span style={{ color: "var(--text-secondary)" }}>&nbsp;Mastery</span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setActive(link.label)}
              className="px-4 py-1.5 rounded text-sm font-medium transition-colors"
              style={{
                color: active === link.label ? "var(--text-primary)" : "var(--text-secondary)",
                background: active === link.label ? "rgba(45,106,224,0.18)" : "transparent",
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Icon buttons */}
        <div className="flex items-center gap-3">
          <button
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
            style={{ color: "var(--text-secondary)" }}
            title="Timer"
          >
            <ClockIcon />
          </button>
          <button
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
            style={{ color: "var(--text-secondary)" }}
            title="Bookmarks"
          >
            <BookmarkIcon />
          </button>
          <button
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
            style={{ color: "var(--text-secondary)" }}
            title="Settings"
          >
            <SettingsIcon />
          </button>
        </div>
      </div>
    </nav>
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

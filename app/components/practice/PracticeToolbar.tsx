"use client";
import { useState, useEffect } from "react";

interface Props { onTogglePassage?: () => void }

export default function PracticeToolbar({ onTogglePassage }: Props) {
  const [seconds, setSeconds] = useState(1005);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const display = `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  return (
    <div
      className="sticky top-14 z-40 h-11 flex items-center justify-between px-4"
      style={{
        background: "rgba(13,17,23,0.97)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* Left: Passage tab — tappable on mobile to show passage overlay */}
      <button
        onClick={onTogglePassage}
        className="text-xs font-semibold px-3 py-1 rounded"
        style={{
          background: "rgba(45,106,224,0.12)",
          borderLeft: "2px solid var(--accent-blue)",
          color: "var(--text-primary)",
        }}
      >
        PASSAGE
      </button>

      {/* Right: timer + buttons */}
      <div className="flex items-center gap-3">
        {/* Timer */}
        <span
          className="font-bold"
          style={{
            color: "#f0a500",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {display}
        </span>

        {/* Flag button */}
        <button
          className="flex items-center gap-1 text-xs px-2 py-1 rounded"
          style={{
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
            background: "transparent",
          }}
        >
          <FlagIcon />
          Flag
        </button>

        {/* Confidence button */}
        <button
          className="flex items-center gap-1 text-xs px-2 py-1 rounded"
          style={{
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
            background: "transparent",
          }}
        >
          <LockIcon />
          Confidence
        </button>
      </div>
    </div>
  );
}

function FlagIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

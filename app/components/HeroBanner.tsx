"use client";
import { useEffect, useState } from "react";

interface DashStats {
  lastFL: number | null;
  recentAcc: number | null;
  totalAnswered: number;
}

export default function HeroBanner() {
  const [stats, setStats] = useState<DashStats | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(r => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const lastFL    = stats?.lastFL ?? null;
  const target    = 515;
  const weekLabel = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div
      className="relative overflow-hidden px-4 py-7 md:px-8 md:py-10"
      style={{
        background: "linear-gradient(135deg, #0f1b2d 0%, #0d1117 60%, #111827 100%)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(var(--text-primary) 1px, transparent 1px), linear-gradient(90deg, var(--text-primary) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="relative max-w-6xl mx-auto flex flex-col md:flex-row md:items-start md:justify-between gap-8">
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
          <a
            href="/practice"
            className="inline-block px-6 py-2.5 rounded font-semibold text-sm"
            style={{ background: "var(--accent-blue)", color: "#fff", boxShadow: "0 0 20px rgba(45,106,224,0.4)", textDecoration: "none" }}
          >
            Continue Today&apos;s Work
          </a>
        </div>

        <div
          className="md:w-72 rounded-xl p-5"
          style={{ background: "rgba(22,27,34,0.85)", border: "1px solid var(--border)", backdropFilter: "blur(12px)" }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-secondary)" }}>
            Performance Snapshot
          </h3>
          <div className="space-y-3">
            <Row label="Last Full-Length score" value={lastFL !== null ? String(lastFL) : "—"} highlight />
            <Row label="Target score"           value={String(target)} />
            <Row label="Week progress"          value={weekLabel} small />
            {stats?.recentAcc != null && (
              <Row label="7-day accuracy" value={`${stats.recentAcc}%`} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, highlight, small }: { label: string; value: string; highlight?: boolean; small?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{label}</span>
      <span
        className={small ? "text-sm" : "font-bold"}
        style={{ color: highlight ? "var(--text-primary)" : "var(--text-secondary)", fontSize: highlight ? "1.4rem" : undefined }}
      >
        {value}
      </span>
    </div>
  );
}

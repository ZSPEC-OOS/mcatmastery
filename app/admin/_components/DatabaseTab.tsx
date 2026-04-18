"use client";
import { useState, useEffect } from "react";
import { SECTION_COLORS, DIFF_COLORS } from "./shared";

type RecentQ = { id: string; section: string; topic: string; stem: string; difficulty: string; createdAt: string };
type Stats = {
  total: number;
  bySection: Record<string, number>;
  byDifficulty: Record<string, number>;
  recent: RecentQ[];
};

export default function DatabaseTab() {
  const [stats, setStats]       = useState<Stats | null>(null);
  const [loading, setLoading]   = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d: Stats) => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    setDeleting(id);
    await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
    setStats((prev) =>
      prev ? { ...prev, total: prev.total - 1, recent: prev.recent.filter((q) => q.id !== id) } : prev
    );
    setDeleting(null);
  }

  const fmtDate = (s: string) =>
    new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  if (loading) return <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading stats…</p>;
  if (!stats) return null;

  return (
    <div>
      {/* Section stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {(["Chem/Phys", "CARS", "Bio/Biochem", "Psych/Soc"] as const).map((s) => (
          <div
            key={s}
            className="rounded-xl px-4 py-3"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: `3px solid ${SECTION_COLORS[s]}` }}
          >
            <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{stats.bySection[s] ?? 0}</div>
            <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{s}</div>
          </div>
        ))}
      </div>

      {/* Total + difficulty row */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div
          className="rounded-lg px-4 py-2 text-sm font-semibold"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        >
          {stats.total} total questions
        </div>
        {(["easy", "medium", "hard"] as const).map((d) => (
          <span
            key={d}
            className="px-3 py-1.5 rounded-full text-xs font-semibold capitalize"
            style={{ background: `${DIFF_COLORS[d]}18`, color: DIFF_COLORS[d], border: `1px solid ${DIFF_COLORS[d]}40` }}
          >
            {stats.byDifficulty[d] ?? 0} {d}
          </span>
        ))}
      </div>

      {/* Recent questions table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <div className="px-5 py-3" style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Recent Questions ({stats.recent.length})
          </h2>
        </div>

        {/* Desktop header */}
        <div
          className="hidden md:grid text-xs px-4 py-2"
          style={{ gridTemplateColumns: "110px 1fr 80px 110px 60px", background: "var(--bg-elevated)", color: "var(--text-muted)" }}
        >
          <span>Section</span><span>Stem</span><span>Difficulty</span><span>Date</span><span />
        </div>

        {stats.recent.length === 0 && (
          <div className="px-5 py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            No questions in the database yet. Use the Generation tab to create some.
          </div>
        )}

        {stats.recent.map((q) => (
          <div key={q.id}>
            {/* Desktop row */}
            <div
              className="hidden md:grid items-center"
              style={{
                gridTemplateColumns: "110px 1fr 80px 110px 60px",
                borderTop: "1px solid var(--border)",
                background: "var(--bg-card)",
              }}
            >
              <span className="px-4 py-3 text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: SECTION_COLORS[q.section] }} />
                <span style={{ color: "var(--text-secondary)" }}>{q.section}</span>
              </span>
              <span className="px-4 py-3 text-xs" style={{ color: "var(--text-primary)" }}>
                {q.stem.length > 90 ? q.stem.slice(0, 90) + "…" : q.stem}
              </span>
              <span className="px-4 py-3">
                <span
                  className="px-2 py-0.5 rounded text-xs font-semibold capitalize"
                  style={{ background: `${DIFF_COLORS[q.difficulty]}18`, color: DIFF_COLORS[q.difficulty] }}
                >
                  {q.difficulty}
                </span>
              </span>
              <span className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>{fmtDate(q.createdAt)}</span>
              <span className="px-4 py-3">
                <button
                  onClick={() => handleDelete(q.id)}
                  disabled={deleting === q.id}
                  className="text-xs px-2 py-1 rounded"
                  style={{
                    background: "rgba(224,92,92,0.1)",
                    color: "#e05c5c",
                    border: "1px solid rgba(224,92,92,0.25)",
                    opacity: deleting === q.id ? 0.5 : 1,
                  }}
                >
                  {deleting === q.id ? "…" : "Delete"}
                </button>
              </span>
            </div>

            {/* Mobile card */}
            <div className="md:hidden p-4" style={{ borderTop: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full" style={{ background: SECTION_COLORS[q.section] }} />
                  <span style={{ color: "var(--text-secondary)" }}>{q.section}</span>
                  <span style={{ color: "var(--text-muted)" }}>· {q.topic}</span>
                </span>
                <button
                  onClick={() => handleDelete(q.id)}
                  disabled={deleting === q.id}
                  className="text-xs px-2 py-1 rounded"
                  style={{ background: "rgba(224,92,92,0.1)", color: "#e05c5c", border: "1px solid rgba(224,92,92,0.25)" }}
                >
                  {deleting === q.id ? "…" : "Delete"}
                </button>
              </div>
              <p className="text-xs" style={{ color: "var(--text-primary)" }}>
                {q.stem.length > 100 ? q.stem.slice(0, 100) + "…" : q.stem}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

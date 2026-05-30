"use client";
import { useState, useEffect, useCallback } from "react";
import { SECTION_COLORS } from "./shared";
import { SECTION_SUBTYPES } from "../../../lib/subtypes";
import { SECTION_TOPICS } from "../../../lib/topics";

const SECTIONS = ["Chem/Phys", "CARS", "Bio/Biochem", "Psych/Soc"] as const;
const DIFFICULTIES = ["foundational", "easy", "medium", "hard"] as const;

interface RunRecord {
  id: string;
  triggeredBy: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  totalAttempted: number;
  totalSaved: number;
  totalSkipped: number;
  totalErrors: number;
  errorMessage: string | null;
}

interface SectionConfig {
  targetPerTopicSubtype: number;
  targetPerDifficulty: Record<string, number>;
}

interface AutomationConfig {
  enabled: boolean;
  scheduleUtcHour: number;
  dedupThreshold: number;
  concurrency: number;
  passageSetsEnabled: boolean;
  resumePreviousRun: boolean;
  sections: Record<string, SectionConfig>;
}

interface CoverageSlot { count: number; target: number; }
type SubtypeMap = Record<string, CoverageSlot>;
type TopicMap   = Record<string, SubtypeMap>;
type SectionMap = Record<string, TopicMap>;
type CoverageMatrix = Record<string, SectionMap>;

interface AutomationData {
  config: AutomationConfig;
  coverage: CoverageMatrix;
  recentRuns: RunRecord[];
  nextScheduledRun: string;
  totalQuestions: number;
}

function fillRate(slot: CoverageSlot): number {
  if (slot.target === 0) return 1;
  return Math.min(slot.count / slot.target, 1);
}

function heatColor(rate: number): string {
  if (rate >= 1)    return "rgba(74,222,128,0.25)";
  if (rate >= 0.8)  return "rgba(74,222,128,0.12)";
  if (rate >= 0.5)  return "rgba(240,165,0,0.2)";
  if (rate > 0)     return "rgba(224,92,92,0.2)";
  return "rgba(224,92,92,0.08)";
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    completed: "#4ade80",
    partial:   "#f0a500",
    running:   "#6366f1",
    failed:    "#e05c5c",
  };
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: `${colors[status] ?? "#888"}22`, color: colors[status] ?? "#888" }}
    >
      {status}
    </span>
  );
}

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export default function AutomationTab() {
  const [data, setData]         = useState<AutomationData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saveMsg, setSaveMsg]   = useState("");
  const [editCfg, setEditCfg]   = useState<AutomationConfig | null>(null);
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/automation");
      const json = await res.json() as AutomationData;
      setData(json);
      setEditCfg(json.config);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveConfig() {
    if (!editCfg) return;
    setSaving(true);
    setSaveMsg("");
    try {
      await fetch("/api/admin/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_config", config: editCfg }),
      });
      setSaveMsg("Saved");
      await load();
    } catch {
      setSaveMsg("Error saving");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 3000);
    }
  }

  function updateSectionTarget(section: string, diff: string, val: number) {
    if (!editCfg) return;
    setEditCfg({
      ...editCfg,
      sections: {
        ...editCfg.sections,
        [section]: {
          ...editCfg.sections[section],
          targetPerDifficulty: {
            ...editCfg.sections[section].targetPerDifficulty,
            [diff]: val,
          },
        },
      },
    });
  }

  if (loading) {
    return <div className="py-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>Loading…</div>;
  }

  if (!data || !editCfg) {
    return <div className="py-12 text-center text-sm" style={{ color: "#e05c5c" }}>Failed to load automation data.</div>;
  }

  const lastRun = data.recentRuns[0] ?? null;

  // Compute per-section total fill rate for summary
  const sectionFill = (section: string): { filled: number; total: number } => {
    const mat: TopicMap = data.coverage[section] ?? {};
    let filled = 0, total = 0;
    for (const topicData of Object.values(mat)) {
      for (const stData of Object.values(topicData)) {
        for (const slot of Object.values(stData)) {
          total  += slot.target;
          filled += Math.min(slot.count, slot.target);
        }
      }
    }
    return { filled, total };
  };

  return (
    <div className="space-y-8">

      {/* ── Status row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Last run */}
        <div className="rounded-xl p-4 space-y-1" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Last Run</div>
          {lastRun ? (
            <>
              <div className="flex items-center gap-2">{statusBadge(lastRun.status)}<span className="text-xs" style={{ color: "var(--text-muted)" }}>{fmt(lastRun.startedAt)}</span></div>
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Saved: <b>{lastRun.totalSaved}</b> &nbsp;|&nbsp; Skipped: {lastRun.totalSkipped} &nbsp;|&nbsp; Errors: {lastRun.totalErrors}
              </div>
              {lastRun.errorMessage && <div className="text-xs mt-1" style={{ color: "#e05c5c" }}>{lastRun.errorMessage.slice(0, 80)}</div>}
            </>
          ) : (
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>No runs yet</div>
          )}
        </div>

        {/* Next scheduled */}
        <div className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Next Scheduled Run</div>
          <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {editCfg.enabled ? fmt(data.nextScheduledRun) : "Disabled"}
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Via GitHub Actions cron (2 AM UTC)</div>
        </div>

        {/* Total questions */}
        <div className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Question Bank</div>
          <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{data.totalQuestions.toLocaleString()}</div>
          <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>total questions</div>
        </div>
      </div>

      {/* ── Section fill summary ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {SECTIONS.map((sec) => {
          const { filled, total } = sectionFill(sec);
          const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
          const color = SECTION_COLORS[sec] ?? "#888";
          return (
            <button
              key={sec}
              onClick={() => setActiveSection(sec)}
              className="rounded-xl p-3 text-left"
              style={{
                background: "var(--bg-card)",
                border: `1px solid ${activeSection === sec ? color : "var(--border)"}`,
              }}
            >
              <div className="text-xs font-semibold" style={{ color }}>{sec}</div>
              <div className="text-lg font-bold mt-1" style={{ color: "var(--text-primary)" }}>{pct}%</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>{filled}/{total} slots</div>
              <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Coverage heatmap ── */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-card)" }}>
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Coverage Heatmap</span>
          <div className="flex gap-3 ml-auto text-xs" style={{ color: "var(--text-muted)" }}>
            {SECTIONS.map((s) => (
              <button key={s} onClick={() => setActiveSection(s)}
                style={{ color: activeSection === s ? SECTION_COLORS[s] : "var(--text-muted)", fontWeight: activeSection === s ? 600 : 400 }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto p-4">
          {(() => {
            const sectionData = data.coverage[activeSection] ?? {};
            const subtypes = SECTION_SUBTYPES[activeSection] ?? [];
            const topics   = SECTION_TOPICS[activeSection] ?? [];

            return (
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="text-left pb-2 pr-3" style={{ color: "var(--text-muted)", minWidth: 160 }}>Topic</th>
                    {subtypes.map((st) => (
                      <th key={st.id} className="pb-2 px-1 text-center font-medium" style={{ color: "var(--text-muted)", maxWidth: 80 }}>
                        <div className="truncate max-w-20" title={st.label}>{st.label.split(" ").slice(0, 2).join(" ")}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topics.map((topic) => (
                    <tr key={topic}>
                      <td className="py-0.5 pr-3 font-medium" style={{ color: "var(--text-secondary)" }}>{topic}</td>
                      {subtypes.map((st) => {
                        const stData: SubtypeMap = (sectionData[topic]?.[st.id] ?? {}) as SubtypeMap;
                        const total  = Object.values(stData).reduce((s, sl) => s + sl.target, 0);
                        const filled = Object.values(stData).reduce((s, sl) => s + Math.min(sl.count, sl.target), 0);
                        const rate   = total > 0 ? filled / total : 0;
                        return (
                          <td key={st.id} className="py-0.5 px-1 text-center">
                            <div
                              className="rounded px-1 py-0.5 text-xs"
                              style={{ background: heatColor(rate), color: "var(--text-primary)" }}
                              title={`${filled}/${total} (${Math.round(rate * 100)}%)`}
                            >
                              {filled}/{total}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()}
        </div>

        {/* Legend */}
        <div className="px-4 pb-3 flex gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
          {[
            { label: "≥ 100%", color: heatColor(1) },
            { label: "80–99%", color: heatColor(0.85) },
            { label: "50–79%", color: heatColor(0.6) },
            { label: "< 50%",  color: heatColor(0.2) },
          ].map(({ label, color }) => (
            <span key={label} className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded" style={{ background: color }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Recent runs ── */}
      {data.recentRuns.length > 1 && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <div className="px-4 py-3 text-sm font-semibold" style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-primary)" }}>
            Recent Runs
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Started", "By", "Status", "Saved", "Skipped", "Errors", "Duration"].map((h) => (
                    <th key={h} className="px-4 py-2 text-left font-semibold" style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recentRuns.map((run) => {
                  const dur = run.completedAt
                    ? Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 60000)
                    : null;
                  return (
                    <tr key={run.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td className="px-4 py-2" style={{ color: "var(--text-secondary)" }}>{fmt(run.startedAt)}</td>
                      <td className="px-4 py-2" style={{ color: "var(--text-muted)" }}>{run.triggeredBy}</td>
                      <td className="px-4 py-2">{statusBadge(run.status)}</td>
                      <td className="px-4 py-2 font-medium" style={{ color: "#4ade80" }}>{run.totalSaved}</td>
                      <td className="px-4 py-2" style={{ color: "var(--text-muted)" }}>{run.totalSkipped}</td>
                      <td className="px-4 py-2" style={{ color: run.totalErrors > 0 ? "#e05c5c" : "var(--text-muted)" }}>{run.totalErrors}</td>
                      <td className="px-4 py-2" style={{ color: "var(--text-muted)" }}>{dur != null ? `${dur}m` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Config editor ── */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <div className="px-4 py-3 text-sm font-semibold" style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-primary)" }}>
          Automation Config
        </div>
        <div className="p-4 space-y-5">

          {/* Global toggles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={editCfg.enabled}
                onChange={(e) => setEditCfg({ ...editCfg, enabled: e.target.checked })}
                className="w-4 h-4" />
              <span className="text-sm" style={{ color: "var(--text-primary)" }}>Enabled</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={editCfg.passageSetsEnabled}
                onChange={(e) => setEditCfg({ ...editCfg, passageSetsEnabled: e.target.checked })}
                className="w-4 h-4" />
              <span className="text-sm" style={{ color: "var(--text-primary)" }}>Passage Sets</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={editCfg.resumePreviousRun}
                onChange={(e) => setEditCfg({ ...editCfg, resumePreviousRun: e.target.checked })}
                className="w-4 h-4" />
              <span className="text-sm" style={{ color: "var(--text-primary)" }}>Resume on Restart</span>
            </label>
          </div>

          {/* Numeric fields */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: "Schedule Hour (UTC)", key: "scheduleUtcHour", min: 0, max: 23 },
              { label: "Concurrency",         key: "concurrency",     min: 1, max: 10 },
              { label: "Dedup Threshold",     key: "dedupThreshold",  min: 0.3, max: 0.99, step: 0.01 },
            ].map(({ label, key, min, max, step }) => (
              <div key={key}>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</label>
                <input
                  type="number" min={min} max={max} step={step ?? 1}
                  value={(editCfg as Record<string, unknown>)[key] as number}
                  onChange={(e) => setEditCfg({ ...editCfg, [key]: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                />
              </div>
            ))}
          </div>

          {/* Per-section targets */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
              Target Questions per Difficulty (per Topic × Subtype slot)
            </div>
            <div className="space-y-3">
              {SECTIONS.map((section) => (
                <div key={section}>
                  <div className="text-xs font-medium mb-1.5" style={{ color: SECTION_COLORS[section] }}>{section}</div>
                  <div className="grid grid-cols-4 gap-2">
                    {DIFFICULTIES.map((diff) => (
                      <div key={diff}>
                        <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>{diff}</label>
                        <input
                          type="number" min={0} max={100}
                          value={editCfg.sections[section]?.targetPerDifficulty[diff] ?? 0}
                          onChange={(e) => updateSectionTarget(section, diff, parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 rounded-lg text-xs"
                          style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={saveConfig}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: "var(--accent-blue)", color: "#fff", opacity: saving ? 0.6 : 1 }}
            >
              {saving ? "Saving…" : "Save Config"}
            </button>
            {saveMsg && <span className="text-xs" style={{ color: saveMsg === "Saved" ? "#4ade80" : "#e05c5c" }}>{saveMsg}</span>}
            <span className="text-xs ml-auto" style={{ color: "var(--text-muted)" }}>
              Trigger manually via GitHub Actions → Run workflow
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

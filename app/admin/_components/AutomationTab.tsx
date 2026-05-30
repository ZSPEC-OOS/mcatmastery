"use client";
import { useState, useEffect, useCallback, useRef } from "react";
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
  totalQuestions: number;
  githubTokenSet: boolean;
}

function fillRate(slot: CoverageSlot): number {
  if (slot.target === 0) return 1;
  return Math.min(slot.count / slot.target, 1);
}

function heatColor(rate: number): string {
  if (rate >= 1)   return "rgba(74,222,128,0.25)";
  if (rate >= 0.8) return "rgba(74,222,128,0.12)";
  if (rate >= 0.5) return "rgba(240,165,0,0.2)";
  if (rate > 0)    return "rgba(224,92,92,0.2)";
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
    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: `${colors[status] ?? "#888"}22`, color: colors[status] ?? "#888" }}>
      {status}
    </span>
  );
}

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export default function AutomationTab() {
  const [data, setData]           = useState<AutomationData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saveMsg, setSaveMsg]     = useState("");
  const [editCfg, setEditCfg]     = useState<AutomationConfig | null>(null);
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0]);

  // Token setup
  const [tokenInput, setTokenInput] = useState("");
  const [tokenMsg, setTokenMsg]     = useState("");
  const [savingToken, setSavingToken] = useState(false);
  const [showTokenField, setShowTokenField] = useState(false);

  // Triggering
  const [triggering, setTriggering] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [refInput, setRefInput]     = useState("main");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res  = await fetch("/api/admin/automation");
      const json = await res.json() as AutomationData;
      setData(json);
      if (!editCfg) setEditCfg(json.config);
    } catch (e) {
      console.error(e);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [editCfg]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll every 15s if a run is active
  useEffect(() => {
    const hasActiveRun = data?.recentRuns.some((r) => r.status === "running");
    if (hasActiveRun && !pollRef.current) {
      pollRef.current = setInterval(() => load(true), 15_000);
    } else if (!hasActiveRun && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [data?.recentRuns, load]);

  async function saveConfig() {
    if (!editCfg) return;
    setSaving(true); setSaveMsg("");
    try {
      await fetch("/api/admin/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_config", config: editCfg }),
      });
      setSaveMsg("Saved");
      await load(true);
    } catch { setSaveMsg("Error saving"); }
    finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 3000);
    }
  }

  async function saveToken() {
    if (!tokenInput.trim()) return;
    setSavingToken(true); setTokenMsg("");
    try {
      const res = await fetch("/api/admin/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_token", token: tokenInput }),
      });
      const json = await res.json() as { success?: boolean; error?: string };
      if (json.success) {
        setTokenMsg("Token saved");
        setTokenInput("");
        setShowTokenField(false);
        await load(true);
      } else {
        setTokenMsg(json.error ?? "Error");
      }
    } catch { setTokenMsg("Error saving token"); }
    finally { setSavingToken(false); setTimeout(() => setTokenMsg(""), 4000); }
  }

  async function triggerRun() {
    setTriggering(true); setTriggerMsg(null);
    try {
      const res = await fetch("/api/admin/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trigger", ref: refInput || "main" }),
      });
      const json = await res.json() as { success?: boolean; error?: string };
      if (json.success) {
        setTriggerMsg({ text: "Run started — you can close this window. Check back here for progress.", ok: true });
        setTimeout(() => load(true), 3000);
      } else {
        setTriggerMsg({ text: json.error ?? "Failed to start run", ok: false });
      }
    } catch { setTriggerMsg({ text: "Network error", ok: false }); }
    finally { setTriggering(false); }
  }

  function updateSectionTarget(section: string, diff: string, val: number) {
    if (!editCfg) return;
    setEditCfg({
      ...editCfg,
      sections: {
        ...editCfg.sections,
        [section]: {
          ...editCfg.sections[section],
          targetPerDifficulty: { ...editCfg.sections[section].targetPerDifficulty, [diff]: val },
        },
      },
    });
  }

  const sectionFill = (section: string): { filled: number; total: number } => {
    const mat: TopicMap = data?.coverage[section] ?? {};
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

  if (loading) return <div className="py-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>Loading…</div>;
  if (!data || !editCfg) return <div className="py-12 text-center text-sm" style={{ color: "#e05c5c" }}>Failed to load.</div>;

  const activeRun  = data.recentRuns.find((r) => r.status === "running") ?? null;
  const lastRun    = data.recentRuns[0] ?? null;
  const tokenReady = data.githubTokenSet;

  return (
    <div className="space-y-6">

      {/* ── Start Run card ── */}
      <div className="rounded-xl p-5 space-y-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div>
          <div className="text-sm font-semibold mb-0.5" style={{ color: "var(--text-primary)" }}>Start Generation Run</div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            Kicks off a background job on GitHub Actions. Once started you can close this window — the run continues until all gaps are filled or your DeepSeek balance runs out.
          </div>
        </div>

        {/* Active run indicator */}
        {activeRun && (
          <div className="rounded-lg px-4 py-3 flex items-center gap-3" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)" }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#6366f1" }} />
            <div className="text-xs" style={{ color: "#6366f1" }}>
              Run in progress — started {fmt(activeRun.startedAt)} &nbsp;·&nbsp; {activeRun.totalSaved} saved so far &nbsp;·&nbsp; auto-refreshing every 15s
            </div>
          </div>
        )}

        {/* Token missing warning */}
        {!tokenReady && (
          <div className="rounded-lg px-4 py-3 text-xs" style={{ background: "rgba(240,165,0,0.1)", border: "1px solid rgba(240,165,0,0.3)", color: "#f0a500" }}>
            GitHub token not configured — add it below before starting a run.
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Branch</label>
            <input
              value={refInput}
              onChange={(e) => setRefInput(e.target.value)}
              placeholder="main"
              className="px-3 py-1.5 rounded-lg text-sm w-32"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </div>

          <div className="mt-4">
            <button
              onClick={triggerRun}
              disabled={triggering || !tokenReady || !!activeRun}
              className="px-5 py-2 rounded-lg text-sm font-semibold"
              style={{
                background: activeRun ? "var(--border)" : "var(--accent-blue)",
                color: "#fff",
                opacity: (triggering || !tokenReady || !!activeRun) ? 0.5 : 1,
                cursor: (triggering || !tokenReady || !!activeRun) ? "not-allowed" : "pointer",
              }}
            >
              {triggering ? "Starting…" : activeRun ? "Run in progress" : "Start Run"}
            </button>
          </div>
        </div>

        {triggerMsg && (
          <div className="text-xs rounded-lg px-3 py-2" style={{
            background: triggerMsg.ok ? "rgba(74,222,128,0.1)" : "rgba(224,92,92,0.1)",
            color: triggerMsg.ok ? "#4ade80" : "#e05c5c",
            border: `1px solid ${triggerMsg.ok ? "rgba(74,222,128,0.3)" : "rgba(224,92,92,0.3)"}`,
          }}>
            {triggerMsg.text}
          </div>
        )}

        {/* GitHub token setup */}
        <div className="pt-2 border-t" style={{ borderColor: "var(--border)" }}>
          {!showTokenField ? (
            <button onClick={() => setShowTokenField(true)} className="text-xs" style={{ color: "var(--text-muted)" }}>
              {tokenReady ? "Update GitHub token →" : "Set up GitHub token →"}
            </button>
          ) : (
            <div className="space-y-2">
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                Create a token at github.com → Settings → Developer settings → Personal access tokens → Fine-grained tokens.
                Grant <strong>Actions: Read and write</strong> on the mcatmastery repo.
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="github_pat_…"
                  className="flex-1 px-3 py-1.5 rounded-lg text-xs font-mono"
                  style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                />
                <button onClick={saveToken} disabled={savingToken || !tokenInput.trim()}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: "var(--accent-blue)", color: "#fff", opacity: savingToken ? 0.6 : 1 }}>
                  {savingToken ? "Saving…" : "Save"}
                </button>
                <button onClick={() => { setShowTokenField(false); setTokenInput(""); }}
                  className="px-3 py-1.5 rounded-lg text-xs"
                  style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                  Cancel
                </button>
              </div>
              {tokenMsg && <div className="text-xs" style={{ color: tokenMsg === "Token saved" ? "#4ade80" : "#e05c5c" }}>{tokenMsg}</div>}
            </div>
          )}
        </div>
      </div>

      {/* ── Last run summary ── */}
      {lastRun && !activeRun && (
        <div className="rounded-xl p-4 flex items-center gap-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Last Run</div>
            <div className="flex items-center gap-2">{statusBadge(lastRun.status)}<span className="text-xs" style={{ color: "var(--text-muted)" }}>{fmt(lastRun.startedAt)}</span></div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-lg font-bold" style={{ color: "#4ade80" }}>{lastRun.totalSaved}</div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>questions saved</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{lastRun.totalSkipped}</div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>skipped</div>
          </div>
          {lastRun.errorMessage && (
            <div className="text-xs max-w-xs" style={{ color: "#e05c5c" }}>{lastRun.errorMessage.slice(0, 80)}</div>
          )}
        </div>
      )}

      {/* ── Section fill bars ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {SECTIONS.map((sec) => {
          const { filled, total } = sectionFill(sec);
          const pct   = total > 0 ? Math.round((filled / total) * 100) : 0;
          const color = SECTION_COLORS[sec] ?? "#888";
          return (
            <button key={sec} onClick={() => setActiveSection(sec)} className="rounded-xl p-3 text-left"
              style={{ background: "var(--bg-card)", border: `1px solid ${activeSection === sec ? color : "var(--border)"}` }}>
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
          <div className="flex gap-3 ml-auto text-xs">
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
            const sectionData: TopicMap = data.coverage[activeSection] ?? {};
            const subtypes = SECTION_SUBTYPES[activeSection] ?? [];
            const topics   = SECTION_TOPICS[activeSection] ?? [];
            return (
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="text-left pb-2 pr-3" style={{ color: "var(--text-muted)", minWidth: 160 }}>Topic</th>
                    {subtypes.map((st) => (
                      <th key={st.id} className="pb-2 px-1 text-center font-medium" style={{ color: "var(--text-muted)" }}>
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
                        const stData: SubtypeMap = (sectionData[topic]?.[st.id] ?? {}) as unknown as SubtypeMap;
                        const total  = Object.values(stData).reduce((s, sl) => s + sl.target, 0);
                        const filled = Object.values(stData).reduce((s, sl) => s + Math.min(sl.count, sl.target), 0);
                        const rate   = total > 0 ? filled / total : 0;
                        return (
                          <td key={st.id} className="py-0.5 px-1 text-center">
                            <div className="rounded px-1 py-0.5 text-xs"
                              style={{ background: heatColor(rate), color: "var(--text-primary)" }}
                              title={`${filled}/${total} (${Math.round(rate * 100)}%)`}>
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

      {/* ── Run history ── */}
      {data.recentRuns.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <div className="px-4 py-3 text-sm font-semibold" style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-primary)" }}>
            Run History
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Started", "Status", "Saved", "Skipped", "Errors", "Duration"].map((h) => (
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
                      <td className="px-4 py-2">{statusBadge(run.status)}</td>
                      <td className="px-4 py-2 font-medium" style={{ color: "#4ade80" }}>{run.totalSaved}</td>
                      <td className="px-4 py-2" style={{ color: "var(--text-muted)" }}>{run.totalSkipped}</td>
                      <td className="px-4 py-2" style={{ color: run.totalErrors > 0 ? "#e05c5c" : "var(--text-muted)" }}>{run.totalErrors}</td>
                      <td className="px-4 py-2" style={{ color: "var(--text-muted)" }}>{dur != null ? `${dur}m` : "running…"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Config ── */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <div className="px-4 py-3 text-sm font-semibold" style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-primary)" }}>
          Generation Targets
        </div>
        <div className="p-4 space-y-5">

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: "Concurrency",     key: "concurrency",    min: 1,   max: 10,  step: 1 },
              { label: "Dedup Threshold", key: "dedupThreshold", min: 0.3, max: 0.99, step: 0.01 },
            ].map(({ label, key, min, max, step }) => (
              <div key={key}>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</label>
                <input type="number" min={min} max={max} step={step}
                  value={(editCfg as Record<string, unknown>)[key] as number}
                  onChange={(e) => setEditCfg({ ...editCfg, [key]: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                />
              </div>
            ))}

            <div className="flex items-center gap-2 mt-5">
              <input type="checkbox" checked={editCfg.passageSetsEnabled}
                onChange={(e) => setEditCfg({ ...editCfg, passageSetsEnabled: e.target.checked })}
                className="w-4 h-4" id="passage-sets" />
              <label htmlFor="passage-sets" className="text-sm cursor-pointer" style={{ color: "var(--text-primary)" }}>Passage Sets</label>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
              Target questions per difficulty (per topic × subtype slot)
            </div>
            <div className="space-y-3">
              {SECTIONS.map((section) => (
                <div key={section}>
                  <div className="text-xs font-medium mb-1.5" style={{ color: SECTION_COLORS[section] }}>{section}</div>
                  <div className="grid grid-cols-4 gap-2">
                    {DIFFICULTIES.map((diff) => (
                      <div key={diff}>
                        <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>{diff}</label>
                        <input type="number" min={0} max={100}
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
            <button onClick={saveConfig} disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: "var(--accent-blue)", color: "#fff", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Saving…" : "Save Targets"}
            </button>
            {saveMsg && <span className="text-xs" style={{ color: saveMsg === "Saved" ? "#4ade80" : "#e05c5c" }}>{saveMsg}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

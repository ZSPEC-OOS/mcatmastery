"use client";
import { useState, useEffect } from "react";
import { SECTION_COLORS, DIFF_COLORS } from "./shared";
import { SECTION_SUBTYPES, getSubTypeIdsByMode } from "../../../lib/subtypes";

type Section = "Chem/Phys" | "CARS" | "Bio/Biochem" | "Psych/Soc";
type GenEvent =
  | { type: "progress"; current: number; total: number; topic?: string }
  | { type: "question"; question: { id: string; section: string; topic: string; stem: string; difficulty: string; hasFigure?: boolean; passageGroupId?: string | null } }
  | { type: "skip"; reason: string; flags?: string[]; message?: string; index: number }
  | { type: "done"; generated: number };

interface CustomModel { id: string; name: string; modelId: string; baseUrl: string; apiKey: string; role?: string }


export default function GenerateTab() {
  const [section, setSection]           = useState<Section>("Bio/Biochem");
  const [subTypes, setSubTypes]         = useState<string[]>(() =>
    (SECTION_SUBTYPES["Bio/Biochem"] ?? []).filter(s => s.passageBased).map(s => s.id));
  const [count, setCount]               = useState(10);
  const [passageSets, setPassageSets]   = useState(3);
  const [dedupThreshold, setDedup]      = useState(0.75);
  const [running, setRunning]           = useState(false);
  const [events, setEvents]             = useState<GenEvent[]>([]);
  const [progress, setProgress]         = useState<{ current: number; total: number; topic?: string }>({ current: 0, total: 0 });
  const [customModels, setCustomModels] = useState<CustomModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [imageGenEnabled, setImageGen]  = useState(false);
  const [imageModelId, setImageModelId] = useState("");
  const [discreteOnlyMode, setDiscreteOnlyMode] = useState(false);
  const [difficulty, setDifficulty] = useState<"foundational" | "easy" | "medium" | "hard" | null>(null);

  useEffect(() => {
    fetch("/api/admin/models")
      .then((r) => r.json())
      .then((d: { models?: CustomModel[] }) => {
        setCustomModels(d.models ?? []);
      })
      .catch(() => {})
      .finally(() => setModelsLoading(false));
  }, []);

  const sectionSubtypes = SECTION_SUBTYPES[section] ?? [];
  const isPassageMode = subTypes.length > 0 &&
    subTypes.every(id => sectionSubtypes.find(s => s.id === id)?.passageBased ?? false);

  async function handleGenerate() {
    setRunning(true);
    setEvents([]);
    setProgress({ current: 0, total: isPassageMode ? passageSets : count });

    const res = await fetch("/api/admin/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section, subTypes, dedupThreshold,
        imageGeneration: imageGenEnabled,
        imageModelId:    imageGenEnabled ? imageModelId : undefined,
        ...(isPassageMode ? { passageSets } : { count }),
        ...(difficulty ? { difficulty } : {}),
      }),
    });

    if (!res.ok || !res.body) {
      const errText = await res.text().catch(() => `HTTP ${res.status}`);
      setEvents([{ type: "skip", reason: "request_failed", message: errText.slice(0, 300), index: 0 }]);
      setRunning(false);
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const ev: GenEvent = JSON.parse(line.slice(6));
          if (ev.type === "progress") setProgress({ current: ev.current, total: ev.total, topic: ev.topic });
          setEvents((prev) => [...prev, ev]);
        } catch { /* skip malformed */ }
      }
    }
    setRunning(false);
  }

  function changeSection(s: Section) {
    setSection(s);
    setSubTypes(getSubTypeIdsByMode(s, !discreteOnlyMode));
  }

  function toggleDiscreteOnly() {
    const next = !discreteOnlyMode;
    setSubTypes(getSubTypeIdsByMode(section, !next));
    setDiscreteOnlyMode(next);
  }

  function toggleSubType(id: string) {
    const clicked = sectionSubtypes.find(s => s.id === id);
    if (!clicked) return;
    setSubTypes(prev => {
      const prevIsPassage = prev.some(pId => sectionSubtypes.find(s => s.id === pId)?.passageBased);
      if (clicked.passageBased !== prevIsPassage) return [id]; // mode switch
      if (prev.includes(id)) return prev.length > 1 ? prev.filter(x => x !== id) : prev;
      return [...prev, id];
    });
  }

  const doneEv = events.find((e) => e.type === "done") as { type: "done"; generated: number } | undefined;

  return (
    <div>

      {/* Form + output */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* Left: settings form */}
        <div className="lg:w-80 flex-shrink-0 space-y-5">

          {/* Section */}
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Section</label>
            <div className="grid grid-cols-2 gap-2">
              {(["Chem/Phys", "CARS", "Bio/Biochem", "Psych/Soc"] as Section[]).map((s) => (
                <button
                  key={s}
                  onClick={() => changeSection(s)}
                  className="py-2 px-3 rounded-lg text-xs font-semibold text-left flex items-center gap-2"
                  style={{
                    background: section === s ? `${SECTION_COLORS[s]}22` : "var(--bg-card)",
                    border: `1px solid ${section === s ? SECTION_COLORS[s] : "var(--border)"}`,
                    color: section === s ? SECTION_COLORS[s] : "var(--text-secondary)",
                  }}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: SECTION_COLORS[s] }} />
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Discrete Only Mode toggle */}
          <div className="rounded-lg px-3 py-3" style={{ background: "var(--bg-card)", border: `1px solid ${discreteOnlyMode ? "#f59e0b" : "var(--border)"}` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold" style={{ color: discreteOnlyMode ? "#f59e0b" : "var(--text-primary)" }}>
                  Discrete Only Mode
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {discreteOnlyMode
                    ? `Standalone questions only · All ${section} topics covered evenly`
                    : "Generate standalone questions across all topics, no passages"}
                </p>
              </div>
              <button
                onClick={toggleDiscreteOnly}
                disabled={running}
                className="w-10 h-5 rounded-full relative transition-colors flex-shrink-0 ml-3"
                style={{
                  background: discreteOnlyMode ? "#f59e0b" : "var(--bg-input)",
                  border: `1px solid ${discreteOnlyMode ? "#f59e0b" : "var(--border)"}`,
                  opacity: running ? 0.5 : 1,
                }}
              >
                <span
                  className="absolute top-0.5 h-4 w-4 rounded-full transition-all"
                  style={{
                    background: "#fff",
                    left: discreteOnlyMode ? "calc(100% - 1.125rem)" : "0.125rem",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  }}
                />
              </button>
            </div>
          </div>

          {/* Sub Types */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Sub Types — <span style={{ color: isPassageMode ? "var(--accent-blue)" : "#f59e0b" }}>
                  {isPassageMode ? "passage mode" : "discrete mode"}
                </span>
              </label>
              <div className="flex gap-2">
                {(() => {
                  const ids = getSubTypeIdsByMode(section, discreteOnlyMode ? false : isPassageMode);
                  return (<>
                    <button onClick={() => setSubTypes(ids)} className="text-xs" style={{ color: "var(--accent-blue)" }}>All</button>
                    <button onClick={() => setSubTypes([ids[0]])} className="text-xs" style={{ color: "var(--text-muted)" }}>Clear</button>
                  </>);
                })()}
              </div>
            </div>
            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {(SECTION_SUBTYPES[section] ?? []).map(st => {
                const disabled = discreteOnlyMode && st.passageBased;
                const checked  = subTypes.includes(st.id);
                return (
                  <label key={st.id}
                    className="flex items-start gap-2"
                    style={{ cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.35 : 1 }}>
                    <input type="checkbox" checked={checked}
                      disabled={disabled}
                      onChange={() => toggleSubType(st.id)}
                      className="mt-0.5 flex-shrink-0"
                      style={{ accentColor: SECTION_COLORS[section] }} />
                    <span className="text-xs leading-snug"
                      style={{ color: checked && !disabled ? "var(--text-primary)" : "var(--text-secondary)" }}>
                      {st.label}
                      {disabled && (
                        <span className="ml-1" style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                          (passage-based)
                        </span>
                      )}
                      {!disabled && st.imageRecommended && (
                        <span className="ml-1" style={{ color: "var(--accent-blue)", fontStyle: "italic" }}>
                          (image-based recommended)
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Difficulty</label>
            <div className="flex gap-2">
              {([null, "foundational", "easy", "medium", "hard"] as const).map((d) => {
                const label  = d === null ? "Any" : d.charAt(0).toUpperCase() + d.slice(1);
                const color  = d === null ? "#6366f1" : d === "foundational" ? "#38bdf8" : d === "easy" ? "#4ade80" : d === "medium" ? "#f0a500" : "#f87171";
                const active = difficulty === d;
                return (
                  <button key={label} onClick={() => setDifficulty(d)}
                    disabled={running}
                    className="px-4 py-2 rounded-lg text-xs font-semibold"
                    style={{
                      background: active ? `${color}20` : "var(--bg-card)",
                      border: `1px solid ${active ? color : "var(--border)"}`,
                      color: active ? color : "var(--text-secondary)",
                      opacity: running ? 0.5 : 1,
                    }}>
                    {label}
                  </button>
                );
              })}
            </div>
            {difficulty === null && (
              <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>Auto-balances foundational / easy / medium / hard across generated questions.</p>
            )}
          </div>

          {/* Count / Passage Sets */}
          {isPassageMode ? (
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Passage Sets — <span style={{ color: "var(--text-primary)" }}>{passageSets}</span>
              </label>
              <input
                type="range" min={1} max={20} value={passageSets}
                onChange={(e) => setPassageSets(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs mt-1 mb-1.5" style={{ color: "var(--text-muted)" }}>
                <span>1</span><span>20</span>
              </div>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {passageSets} complete passage{passageSets !== 1 ? "s" : ""} ×{" "}
                {section === "CARS" ? "5–7" : "4–6"} questions each
                {" "}≈ <span style={{ color: "var(--text-primary)" }}>
                  {passageSets * (section === "CARS" ? 6 : 5)} questions
                </span> total
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Count — <span style={{ color: "var(--text-primary)" }}>{count}</span>
              </label>
              <input
                type="range" min={1} max={50} value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                <span>1</span><span>50</span>
              </div>
            </div>
          )}

          {/* Generation model — driven by role assignment in Custom Models */}
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Generation Model</label>
            {modelsLoading ? (
              <p className="text-xs py-2" style={{ color: "var(--text-muted)" }}>Loading…</p>
            ) : (() => {
              function hasGenRole(role: string | undefined): boolean {
                if (!role || role === "disabled") return false;
                if (role === "both") return true;
                return role.split(",").map(r => r.trim()).includes("generation");
              }
              const genModel = customModels.find((m) => hasGenRole(m.role)) ?? customModels.find((m) => m.role !== "disabled") ?? null;
              const isAssigned = genModel ? hasGenRole(genModel.role) : false;
              return genModel ? (
                <div className="px-3 py-2.5 rounded-lg flex items-center justify-between"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{genModel.name}</p>
                    <p className="text-xs font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>{genModel.modelId}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: "rgba(27,58,107,0.12)", color: "var(--accent-blue)", border: "1px solid rgba(27,58,107,0.25)" }}>
                    {isAssigned ? "Question Gen" : "Active"}
                  </span>
                </div>
              ) : (
                <div className="px-3 py-3 rounded-lg text-xs text-center"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                  No model configured.{" "}
                  <span style={{ color: "var(--accent-blue)" }}>Add one in Settings → Custom Models.</span>
                </div>
              );
            })()}
          </div>

          {/* Image Generation */}
          <div className="rounded-lg px-3 py-3 space-y-3" style={{ background: "var(--bg-card)", border: `1px solid ${imageGenEnabled ? "var(--accent-blue)" : "var(--border)"}` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Image Generation</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Generate questions with figures</p>
              </div>
              <button
                onClick={() => setImageGen((v) => !v)}
                className="w-10 h-5 rounded-full relative transition-colors flex-shrink-0"
                style={{ background: imageGenEnabled ? "var(--accent-blue)" : "var(--bg-input)", border: "1px solid var(--border)" }}
              >
                <span className="absolute top-0.5 h-4 w-4 rounded-full transition-all"
                  style={{ background: "#fff", left: imageGenEnabled ? "calc(100% - 1.125rem)" : "0.125rem", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
              </button>
            </div>
            {imageGenEnabled && (
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>Image Model (DALL-E / image generator)</label>
                {modelsLoading ? (
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Loading…</p>
                ) : customModels.length === 0 ? (
                  <p className="text-xs" style={{ color: "#e05c5c" }}>No models — add one in Settings.</p>
                ) : (
                  <div className="space-y-1">
                    {customModels.map((m) => (
                      <button key={m.id} onClick={() => setImageModelId(m.modelId)}
                        className="w-full px-3 py-1.5 rounded-lg text-xs text-left"
                        style={{
                          background: imageModelId === m.modelId ? "rgba(27,58,107,0.12)" : "var(--bg-input)",
                          border: `1px solid ${imageModelId === m.modelId ? "var(--accent-blue)" : "var(--border)"}`,
                          color: imageModelId === m.modelId ? "var(--accent-blue)" : "var(--text-secondary)",
                          fontWeight: imageModelId === m.modelId ? 600 : 400,
                        }}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dedup threshold */}
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Duplicate Filter — <span style={{ color: "var(--text-primary)" }}>{dedupThreshold.toFixed(2)}</span>
            </label>
            <input
              type="range" min={0.3} max={0.99} step={0.01} value={dedupThreshold}
              onChange={(e) => setDedup(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs mt-1 mb-2" style={{ color: "var(--text-muted)" }}>
              <span>0.30</span><span>0.99</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {dedupThreshold < 0.5
                ? "Very strict — blocks questions that share significant topic vocabulary, even if phrased differently."
                : dedupThreshold < 0.65
                ? "Strict — blocks questions with substantial word overlap. May reject legitimately different questions on the same topic."
                : dedupThreshold < 0.8
                ? "Balanced — blocks near-identical stems while allowing different questions on the same topic."
                : dedupThreshold < 0.9
                ? "Loose — only blocks questions that are almost word-for-word the same."
                : "Very loose — only blocks exact or near-exact copies."}
            </p>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={running || (imageGenEnabled && !imageModelId)}
            className="w-full py-2.5 rounded-lg text-sm font-semibold"
            style={{
              background: running ? "var(--bg-card)" : "var(--accent-blue)",
              color: running ? "var(--text-muted)" : "#fff",
              border: running ? "1px solid var(--border)" : "none",
              cursor: running ? "not-allowed" : "pointer",
            }}
          >
            {running
              ? `Generating ${progress.current} / ${progress.total}…`
              : isPassageMode
                ? `Generate ${passageSets} Passage Set${passageSets !== 1 ? "s" : ""}`
                : `Generate ${count} Question${count !== 1 ? "s" : ""}`}
          </button>
        </div>

        {/* Right: live output */}
        <div className="flex-1 min-w-0">
          {running && (
            <div className="mb-4">
              <div className="rounded-lg overflow-hidden h-2 mb-1.5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <div
                  className="h-full transition-all duration-300"
                  style={{ width: `${progress.total ? (progress.current / progress.total) * 100 : 0}%`, background: "var(--accent-blue)" }}
                />
              </div>
              {progress.topic && (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {isPassageMode
                    ? <>Passage {progress.current + 1} of {progress.total} — <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{progress.topic}</span></>
                    : <>Targeting: <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{progress.topic}</span></>
                  }
                </p>
              )}
            </div>
          )}

          {doneEv && !running && (
            <div
              className="mb-4 px-4 py-3 rounded-lg text-sm font-semibold"
              style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80" }}
            >
              ✓ Done — {doneEv.generated} question{doneEv.generated !== 1 ? "s" : ""} saved to database
            </div>
          )}

          {events.length === 0 && !running && (
            <div
              className="rounded-xl flex flex-col items-center justify-center py-16 text-center"
              style={{ border: "1px solid var(--border)" }}
            >
              <p className="text-sm mb-1" style={{ color: "var(--text-primary)" }}>No generation run yet</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Configure settings on the left and click Generate.</p>
            </div>
          )}

          <div className="space-y-2">
            {events.map((ev, i) => {
              if (ev.type === "progress" || ev.type === "done") return null;

              if (ev.type === "question") {
                return (
                  <div key={i} className="rounded-lg px-4 py-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: SECTION_COLORS[ev.question.section] }} />
                      <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{ev.question.section}</span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>·</span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{ev.question.topic}</span>
                      <span
                        className="ml-auto px-2 py-0.5 rounded text-xs font-semibold"
                        style={{ background: `${DIFF_COLORS[ev.question.difficulty]}20`, color: DIFF_COLORS[ev.question.difficulty] }}
                      >
                        {ev.question.difficulty}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                      {ev.question.stem.length > 140 ? ev.question.stem.slice(0, 140) + "…" : ev.question.stem}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      {ev.question.passageGroupId && (
                        <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                          passage {ev.question.passageGroupId.slice(0, 8)}
                        </span>
                      )}
                      {ev.question.hasFigure && (
                        <span className="text-xs" style={{ color: "var(--accent-blue)" }}>🖼 figure</span>
                      )}
                    </div>
                  </div>
                );
              }

              if (ev.type === "skip") {
                return (
                  <div
                    key={i}
                    className="px-3 py-2 rounded-lg text-xs space-y-1"
                    style={{ background: "rgba(224,92,92,0.08)", border: "1px solid rgba(224,92,92,0.2)", color: "#e05c5c" }}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>⊘ Skipped</span>
                      <span style={{ opacity: 0.7 }}>·</span>
                      <span style={{ color: "var(--text-muted)" }}>{ev.reason.replace(/_/g, " ")}</span>
                      {ev.flags && ev.flags.length > 0 && (
                        <span style={{ color: "var(--text-muted)" }}>— {ev.flags.join("; ")}</span>
                      )}
                    </div>
                    {ev.message && (
                      <p className="font-mono text-xs break-all" style={{ color: "#e05c5c", opacity: 0.85 }}>{ev.message}</p>
                    )}
                  </div>
                );
              }

              return null;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

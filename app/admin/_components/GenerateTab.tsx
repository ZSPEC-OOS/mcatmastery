"use client";
import { useState, useEffect } from "react";
import { SECTION_COLORS, DIFF_COLORS } from "./shared";
import { SECTION_SUBTYPES } from "../../../lib/subtypes";

type Section = "Chem/Phys" | "CARS" | "Bio/Biochem" | "Psych/Soc";
type GenEvent =
  | { type: "progress"; current: number; total: number }
  | { type: "question"; question: { id: string; section: string; topic: string; stem: string; difficulty: string; hasFigure?: boolean } }
  | { type: "skip"; reason: string; flags?: string[]; message?: string; index: number }
  | { type: "done"; generated: number };

interface CustomModel { id: string; name: string; modelId: string; baseUrl: string; apiKey: string }

const PIPELINE_STEPS = [
  { n: 1, title: "Input Config",       desc: "Section, subtypes, count, model, difficulty, and dedup threshold." },
  { n: 2, title: "Load Existing",      desc: "Last 100 questions from the same section fetched for dedup." },
  { n: 3, title: "Generate (Claude)",  desc: "GENERATION_SYSTEM_PROMPT + user request → model outputs JSON." },
  { n: 4, title: "Parse JSON",         desc: "Output parsed; regex extracts JSON block from model response." },
  { n: 5, title: "Jaccard Dedup",      desc: "Word-overlap similarity vs existing stems. Skip if > threshold." },
  { n: 6, title: "Quality Validation", desc: "Second Claude call checks accuracy, answer key, MCAT alignment." },
  { n: 7, title: "Apply Corrections",  desc: "Pass → keep original. Fail + corrected → use fix. Fail only → discard." },
  { n: 8, title: "Save to PostgreSQL", desc: "Persisted with all metadata: section, topic, options, difficulty." },
  { n: 9, title: "Stream via SSE",     desc: "Server-Sent Events push progress/question/skip/done to client." },
];

export default function GenerateTab() {
  const [section, setSection]           = useState<Section>("Bio/Biochem");
  const [subTypes, setSubTypes]         = useState<string[]>(() =>
    (SECTION_SUBTYPES["Bio/Biochem"] ?? []).map(s => s.id));
  const [count, setCount]               = useState(5);
  const [model, setModel]               = useState("");
  const [difficulty, setDifficulty]     = useState("mixed");
  const [dedupThreshold, setDedup]      = useState(0.75);
  const [running, setRunning]           = useState(false);
  const [events, setEvents]             = useState<GenEvent[]>([]);
  const [progress, setProgress]         = useState({ current: 0, total: 0 });
  const [pipelineOpen, setPipelineOpen] = useState(false);
  const [customModels, setCustomModels] = useState<CustomModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [imageGenEnabled, setImageGen]  = useState(false);
  const [imageModelId, setImageModelId] = useState("");

  useEffect(() => {
    fetch("/api/admin/models")
      .then((r) => r.json())
      .then((d: { models?: CustomModel[] }) => {
        const list = d.models ?? [];
        setCustomModels(list);
        if (list.length > 0) setModel(list[0].modelId);
      })
      .catch(() => {})
      .finally(() => setModelsLoading(false));
  }, []);

  async function handleGenerate() {
    setRunning(true);
    setEvents([]);
    setProgress({ current: 0, total: count });

    const res = await fetch("/api/admin/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section, subTypes, count, model, difficulty, dedupThreshold,
        imageGeneration: imageGenEnabled,
        imageModelId:    imageGenEnabled ? imageModelId : undefined,
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
          if (ev.type === "progress") setProgress({ current: ev.current, total: ev.total });
          setEvents((prev) => [...prev, ev]);
        } catch { /* skip malformed */ }
      }
    }
    setRunning(false);
  }

  function changeSection(s: Section) {
    setSection(s);
    setSubTypes((SECTION_SUBTYPES[s] ?? []).map(st => st.id));
  }

  function toggleSubType(id: string) {
    setSubTypes(prev =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter(x => x !== id) : prev
        : [...prev, id]
    );
  }

  const doneEv = events.find((e) => e.type === "done") as { type: "done"; generated: number } | undefined;

  return (
    <div>
      {/* Pipeline explanation */}
      <div className="rounded-xl mb-6" style={{ border: "1px solid var(--border)" }}>
        <button
          onClick={() => setPipelineOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-left"
        >
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Generation Pipeline — how it works
          </span>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"
            style={{ transform: pipelineOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {pipelineOpen && (
          <div
            className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-3 gap-3"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            {PIPELINE_STEPS.map((s) => (
              <div key={s.n} className="rounded-lg px-4 py-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(27,58,107,0.18)", color: "var(--accent-blue)" }}
                  >
                    {s.n}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{s.title}</span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>

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

          {/* Sub Types */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Sub Types ({subTypes.length}/{(SECTION_SUBTYPES[section] ?? []).length})
              </label>
              <div className="flex gap-2">
                <button onClick={() => setSubTypes((SECTION_SUBTYPES[section] ?? []).map(s => s.id))}
                  className="text-xs" style={{ color: "var(--accent-blue)" }}>All</button>
                <button onClick={() => setSubTypes([(SECTION_SUBTYPES[section] ?? [])[0]?.id].filter(Boolean))}
                  className="text-xs" style={{ color: "var(--text-muted)" }}>Clear</button>
              </div>
            </div>
            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {(SECTION_SUBTYPES[section] ?? []).map(st => {
                const checked = subTypes.includes(st.id);
                return (
                  <label key={st.id} className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" checked={checked}
                      onChange={() => toggleSubType(st.id)}
                      className="mt-0.5 flex-shrink-0"
                      style={{ accentColor: SECTION_COLORS[section] }} />
                    <span className="text-xs leading-snug"
                      style={{ color: checked ? "var(--text-primary)" : "var(--text-secondary)" }}>
                      {st.label}
                      {st.imageRecommended && (
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

          {/* Count */}
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

          {/* Model */}
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Model</label>
            {modelsLoading ? (
              <p className="text-xs py-2" style={{ color: "var(--text-muted)" }}>Loading models…</p>
            ) : customModels.length === 0 ? (
              <div className="px-3 py-3 rounded-lg text-xs text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                No models configured.{" "}
                <span style={{ color: "var(--accent-blue)" }}>Add one in Settings → Custom Models.</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {customModels.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setModel(m.modelId)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs"
                    style={{
                      background: model === m.modelId ? "rgba(27,58,107,0.12)" : "var(--bg-card)",
                      border: `1px solid ${model === m.modelId ? "var(--accent-blue)" : "var(--border)"}`,
                      color: "var(--text-secondary)",
                    }}
                  >
                    <span className="font-semibold" style={{ color: model === m.modelId ? "var(--accent-blue)" : "var(--text-primary)" }}>{m.name}</span>
                    <span className="font-mono truncate ml-2" style={{ color: "var(--text-muted)", maxWidth: "8rem" }}>{m.modelId}</span>
                  </button>
                ))}
              </div>
            )}
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

          {/* Difficulty */}
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Difficulty</label>
            <div className="flex gap-1.5 flex-wrap">
              {["easy", "medium", "hard", "mixed"].map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize"
                  style={{
                    background: difficulty === d ? "rgba(27,58,107,0.15)" : "var(--bg-card)",
                    border: `1px solid ${difficulty === d ? "var(--accent-blue)" : "var(--border)"}`,
                    color: difficulty === d ? "var(--accent-blue)" : "var(--text-secondary)",
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Dedup threshold */}
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Dedup Threshold — <span style={{ color: "var(--text-primary)" }}>{dedupThreshold.toFixed(2)}</span>
            </label>
            <input
              type="range" min={0.3} max={0.99} step={0.01} value={dedupThreshold}
              onChange={(e) => setDedup(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              <span>0.30 (strict)</span><span>0.99 (loose)</span>
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={running || !model || (imageGenEnabled && !imageModelId)}
            className="w-full py-2.5 rounded-lg text-sm font-semibold"
            style={{
              background: (running || !model) ? "var(--bg-card)" : "var(--accent-blue)",
              color: (running || !model) ? "var(--text-muted)" : "#fff",
              border: (running || !model) ? "1px solid var(--border)" : "none",
              cursor: (running || !model) ? "not-allowed" : "pointer",
            }}
          >
            {running ? `Generating ${progress.current} / ${progress.total}…` : `Generate ${count} Question${count !== 1 ? "s" : ""}`}
          </button>
        </div>

        {/* Right: live output */}
        <div className="flex-1 min-w-0">
          {running && (
            <div className="mb-4 rounded-lg overflow-hidden h-2" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div
                className="h-full transition-all duration-300"
                style={{ width: `${progress.total ? (progress.current / progress.total) * 100 : 0}%`, background: "var(--accent-blue)" }}
              />
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
                    {ev.question.hasFigure && (
                      <p className="text-xs mt-1" style={{ color: "var(--accent-blue)" }}>🖼 Figure generated</p>
                    )}
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

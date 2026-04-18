"use client";
import { useState } from "react";
import { SECTION_COLORS, DIFF_COLORS } from "./shared";

type Section = "Chem/Phys" | "CARS" | "Bio/Biochem" | "Psych/Soc";
type GenEvent =
  | { type: "progress"; current: number; total: number }
  | { type: "question"; question: { id: string; section: string; topic: string; stem: string; difficulty: string } }
  | { type: "skip"; reason: string; flags?: string[]; index: number }
  | { type: "done"; generated: number };

const MODELS = [
  { id: "claude-opus-4-7",           label: "Opus 4.7",   desc: "Highest quality" },
  { id: "claude-sonnet-4-6",         label: "Sonnet 4.6", desc: "Balanced" },
  { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5",  desc: "Fastest / cheapest" },
];

const PIPELINE_STEPS = [
  { n: 1, title: "Input Config",       desc: "Section, topic, count, model, difficulty, and dedup threshold." },
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
  const [topic, setTopic]               = useState("");
  const [count, setCount]               = useState(5);
  const [model, setModel]               = useState("claude-opus-4-7");
  const [difficulty, setDifficulty]     = useState("mixed");
  const [dedupThreshold, setDedup]      = useState(0.75);
  const [running, setRunning]           = useState(false);
  const [events, setEvents]             = useState<GenEvent[]>([]);
  const [progress, setProgress]         = useState({ current: 0, total: 0 });
  const [pipelineOpen, setPipelineOpen] = useState(false);

  async function handleGenerate() {
    setRunning(true);
    setEvents([]);
    setProgress({ current: 0, total: count });

    const res = await fetch("/api/admin/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section, topic: topic || undefined, count, model, difficulty, dedupThreshold }),
    });

    if (!res.ok || !res.body) { setRunning(false); return; }
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
                  onClick={() => setSection(s)}
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

          {/* Topic */}
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Topic (optional)</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Enzyme Kinetics"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }}
            />
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
            <div className="space-y-1.5">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setModel(m.id)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs"
                  style={{
                    background: model === m.id ? "rgba(27,58,107,0.12)" : "var(--bg-card)",
                    border: `1px solid ${model === m.id ? "var(--accent-blue)" : "var(--border)"}`,
                    color: "var(--text-secondary)",
                  }}
                >
                  <span className="font-semibold" style={{ color: model === m.id ? "var(--accent-blue)" : "var(--text-primary)" }}>{m.label}</span>
                  <span style={{ color: "var(--text-muted)" }}>{m.desc}</span>
                </button>
              ))}
            </div>
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
            disabled={running}
            className="w-full py-2.5 rounded-lg text-sm font-semibold"
            style={{
              background: running ? "var(--bg-card)" : "var(--accent-blue)",
              color: running ? "var(--text-muted)" : "#fff",
              border: running ? "1px solid var(--border)" : "none",
              cursor: running ? "not-allowed" : "pointer",
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
                  </div>
                );
              }

              if (ev.type === "skip") {
                return (
                  <div
                    key={i}
                    className="px-3 py-2 rounded-lg text-xs flex items-center gap-2"
                    style={{ background: "rgba(224,92,92,0.08)", border: "1px solid rgba(224,92,92,0.2)", color: "#e05c5c" }}
                  >
                    <span>⊘ Skipped</span>
                    <span style={{ opacity: 0.7 }}>·</span>
                    <span style={{ color: "var(--text-muted)" }}>{ev.reason.replace(/_/g, " ")}</span>
                    {ev.flags && ev.flags.length > 0 && (
                      <span style={{ color: "var(--text-muted)" }}>— {ev.flags.join("; ")}</span>
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

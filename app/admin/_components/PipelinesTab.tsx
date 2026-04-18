"use client";
import { useState, useRef } from "react";
import { SECTION_COLORS, DIFF_COLORS } from "./shared";

type SseEvent =
  | { type: "status";   message: string }
  | { type: "progress"; current: number; total: number }
  | { type: "question"; question: { id: string; section: string; topic: string; stem: string; difficulty: string }; source?: string }
  | { type: "skip";     reason: string; flags?: string[]; index: number; source?: string }
  | { type: "error";    message: string }
  | { type: "done";     generated: number; total: number };

async function readSse(
  res: Response,
  onEvent: (ev: SseEvent) => void,
): Promise<void> {
  if (!res.body) return;
  const reader  = res.body.getReader();
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
      try { onEvent(JSON.parse(line.slice(6)) as SseEvent); } catch { /* skip */ }
    }
  }
}

type Section = "Chem/Phys" | "CARS" | "Bio/Biochem" | "Psych/Soc";
const SECTIONS: Section[] = ["Chem/Phys", "CARS", "Bio/Biochem", "Psych/Soc"];
const MODELS = [
  { id: "claude-opus-4-7",           label: "Opus 4.7" },
  { id: "claude-sonnet-4-6",         label: "Sonnet 4.6" },
  { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5" },
];

type Pipeline = "ai" | "pdf" | "wisp";

const PIPELINES: { id: Pipeline; label: string; desc: string }[] = [
  { id: "ai",   label: "1 · AI Generation",    desc: "Claude generates questions from scratch using MCAT specs." },
  { id: "pdf",  label: "2 · PDF Book Extraction", desc: "Upload MCAT prep book pages — AI extracts or generates questions." },
  { id: "wisp", label: "3 · WISP Web Research", desc: "Search the web via WISP API for free question sets and refine them." },
];

export default function PipelinesTab() {
  const [active, setActive] = useState<Pipeline>("ai");

  return (
    <div className="space-y-6">

      {/* Pipeline selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {PIPELINES.map((p) => (
          <button
            key={p.id}
            onClick={() => setActive(p.id)}
            className="rounded-xl px-5 py-4 text-left transition-colors"
            style={{
              background:   active === p.id ? "rgba(27,58,107,0.1)" : "var(--bg-card)",
              border:       `1px solid ${active === p.id ? "var(--accent-blue)" : "var(--border)"}`,
            }}
          >
            <div className="text-sm font-semibold mb-1" style={{ color: active === p.id ? "var(--accent-blue)" : "var(--text-primary)" }}>
              {p.label}
            </div>
            <div className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{p.desc}</div>
          </button>
        ))}
      </div>

      {/* Pipeline detail */}
      {active === "ai"   && <AIPipeline />}
      {active === "pdf"  && <PDFPipeline />}
      {active === "wisp" && <WISPPipeline />}

    </div>
  );
}

function AIPipeline() {
  return (
    <div className="rounded-xl px-5 py-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Standard AI Generation</p>
      <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
        Configure and run this pipeline from the <strong>Question Generation</strong> tab. All dedup and verification steps are applied automatically.
      </p>
      <a
        href="/admin"
        onClick={(e) => { e.preventDefault(); (window as Window & { __adminSetTab?: (t: string) => void }).__adminSetTab?.("generate"); }}
        className="inline-block px-4 py-2 rounded-lg text-sm font-semibold"
        style={{ background: "var(--accent-blue)", color: "#fff", textDecoration: "none" }}
      >
        Go to Question Generation →
      </a>
    </div>
  );
}

function PDFPipeline() {
  const [section, setSection]   = useState<Section>("Bio/Biochem");
  const [count, setCount]       = useState(5);
  const [model, setModel]       = useState("claude-opus-4-7");
  const [dedup, setDedup]       = useState(0.75);
  const [file, setFile]         = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [running, setRunning]   = useState(false);
  const [events, setEvents]     = useState<SseEvent[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f?.type === "application/pdf") setFile(f);
  }

  async function handleExtract() {
    if (!file) return;
    setRunning(true);
    setEvents([]);
    setProgress({ current: 0, total: count });

    const fd = new FormData();
    fd.append("file", file);
    fd.append("section", section);
    fd.append("count", String(count));
    fd.append("model", model);
    fd.append("dedupThreshold", String(dedup));

    const res = await fetch("/api/admin/pipeline/pdf", { method: "POST", body: fd });
    if (!res.ok) {
      setEvents([{ type: "error", message: `Server error ${res.status}` }]);
      setRunning(false);
      return;
    }

    await readSse(res, (ev) => {
      if (ev.type === "progress") setProgress({ current: ev.current, total: ev.total });
      setEvents((prev) => [...prev, ev]);
    });
    setRunning(false);
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <div className="px-5 py-3.5" style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>PDF Book Extraction</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          Upload a chapter or excerpt (≤ 4 MB) from Princeton Review, Kaplan, or any MCAT prep book.
        </p>
      </div>

      <div className="px-5 py-5 space-y-5">

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className="rounded-xl flex flex-col items-center justify-center py-8 cursor-pointer transition-colors"
          style={{
            border: `2px dashed ${dragOver ? "var(--accent-blue)" : "var(--border)"}`,
            background: dragOver ? "rgba(27,58,107,0.06)" : "var(--bg-elevated)",
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }}
          />
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" className="mb-2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          {file ? (
            <p className="text-sm font-medium" style={{ color: "var(--accent-blue)" }}>{file.name}</p>
          ) : (
            <>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Drop PDF here or click to browse</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Max 4 MB · PDF only</p>
            </>
          )}
        </div>

        {/* Section */}
        <div>
          <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Section</label>
          <div className="grid grid-cols-2 gap-2">
            {SECTIONS.map((s) => (
              <button key={s} onClick={() => setSection(s)}
                className="py-2 px-3 rounded-lg text-xs font-semibold text-left flex items-center gap-2"
                style={{
                  background: section === s ? `${SECTION_COLORS[s]}22` : "var(--bg-elevated)",
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

        {/* Count + Model row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Count — <span style={{ color: "var(--text-primary)" }}>{count}</span>
            </label>
            <input type="range" min={1} max={30} value={count}
              onChange={(e) => setCount(Number(e.target.value))} className="w-full" />
            <div className="flex justify-between text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              <span>1</span><span>30</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Model</label>
            <div className="space-y-1">
              {MODELS.map((m) => (
                <button key={m.id} onClick={() => setModel(m.id)}
                  className="w-full px-3 py-1.5 rounded-lg text-xs text-left"
                  style={{
                    background: model === m.id ? "rgba(27,58,107,0.12)" : "var(--bg-elevated)",
                    border: `1px solid ${model === m.id ? "var(--accent-blue)" : "var(--border)"}`,
                    color: model === m.id ? "var(--accent-blue)" : "var(--text-secondary)",
                    fontWeight: model === m.id ? 600 : 400,
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dedup */}
        <div>
          <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Dedup Threshold — <span style={{ color: "var(--text-primary)" }}>{dedup.toFixed(2)}</span>
          </label>
          <input type="range" min={0.3} max={0.99} step={0.01} value={dedup}
            onChange={(e) => setDedup(Number(e.target.value))} className="w-full" />
          <div className="flex justify-between text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            <span>0.30 strict</span><span>0.99 loose</span>
          </div>
        </div>

        <button
          onClick={handleExtract}
          disabled={!file || running}
          className="w-full py-2.5 rounded-lg text-sm font-semibold"
          style={{
            background: file && !running ? "var(--accent-blue)" : "var(--bg-elevated)",
            color: file && !running ? "#fff" : "var(--text-muted)",
            border: file && !running ? "none" : "1px solid var(--border)",
            cursor: file && !running ? "pointer" : "not-allowed",
          }}
        >
          {running ? `Processing ${progress.current} / ${progress.total}…` : "Extract & Verify Questions"}
        </button>

        <LiveOutput events={events} running={running} progress={progress} />
      </div>
    </div>
  );
}

function WISPPipeline() {
  const [endpoint, setEndpoint] = useState("");
  const [apiKey, setApiKey]     = useState("");
  const [section, setSection]   = useState<Section>("Bio/Biochem");
  const [topic, setTopic]       = useState("");
  const [count, setCount]       = useState(5);
  const [model, setModel]       = useState("claude-opus-4-7");
  const [dedup, setDedup]       = useState(0.75);
  const [running, setRunning]   = useState(false);
  const [events, setEvents]     = useState<SseEvent[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const canRun = endpoint.length > 0 && !running;

  async function handleSearch() {
    if (!canRun) return;
    setRunning(true);
    setEvents([]);
    setProgress({ current: 0, total: count });

    const res = await fetch("/api/admin/pipeline/wisp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wispEndpoint: endpoint,
        wispApiKey:   apiKey || undefined,
        section,
        topic:        topic || undefined,
        count,
        model,
        dedupThreshold: dedup,
      }),
    });

    if (!res.ok) {
      setEvents([{ type: "error", message: `Server error ${res.status}` }]);
      setRunning(false);
      return;
    }

    await readSse(res, (ev) => {
      if (ev.type === "progress") setProgress({ current: ev.current, total: ev.total });
      setEvents((prev) => [...prev, ev]);
    });
    setRunning(false);
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <div className="px-5 py-3.5" style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>WISP Web Research</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          Searches the web via a self-hosted WISP API, extracts question material, then refines and verifies each question.
        </p>
      </div>

      <div className="px-5 py-5 space-y-5">

        {/* Endpoint + API key */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              WISP Endpoint URL
            </label>
            <input
              type="url"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://wisp.example.com"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              API Key <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Bearer token"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }}
            />
          </div>
        </div>

        {/* Section */}
        <div>
          <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Section</label>
          <div className="grid grid-cols-2 gap-2">
            {SECTIONS.map((s) => (
              <button key={s} onClick={() => setSection(s)}
                className="py-2 px-3 rounded-lg text-xs font-semibold text-left flex items-center gap-2"
                style={{
                  background: section === s ? `${SECTION_COLORS[s]}22` : "var(--bg-elevated)",
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
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Topic hint <span style={{ fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Enzyme Kinetics"
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }}
          />
        </div>

        {/* Count + Model */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Count — <span style={{ color: "var(--text-primary)" }}>{count}</span>
            </label>
            <input type="range" min={1} max={30} value={count}
              onChange={(e) => setCount(Number(e.target.value))} className="w-full" />
            <div className="flex justify-between text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              <span>1</span><span>30</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Model</label>
            <div className="space-y-1">
              {MODELS.map((m) => (
                <button key={m.id} onClick={() => setModel(m.id)}
                  className="w-full px-3 py-1.5 rounded-lg text-xs text-left"
                  style={{
                    background: model === m.id ? "rgba(27,58,107,0.12)" : "var(--bg-elevated)",
                    border: `1px solid ${model === m.id ? "var(--accent-blue)" : "var(--border)"}`,
                    color: model === m.id ? "var(--accent-blue)" : "var(--text-secondary)",
                    fontWeight: model === m.id ? 600 : 400,
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dedup */}
        <div>
          <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Dedup Threshold — <span style={{ color: "var(--text-primary)" }}>{dedup.toFixed(2)}</span>
          </label>
          <input type="range" min={0.3} max={0.99} step={0.01} value={dedup}
            onChange={(e) => setDedup(Number(e.target.value))} className="w-full" />
          <div className="flex justify-between text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            <span>0.30 strict</span><span>0.99 loose</span>
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={!canRun}
          className="w-full py-2.5 rounded-lg text-sm font-semibold"
          style={{
            background: canRun ? "var(--accent-blue)" : "var(--bg-elevated)",
            color: canRun ? "#fff" : "var(--text-muted)",
            border: canRun ? "none" : "1px solid var(--border)",
            cursor: canRun ? "pointer" : "not-allowed",
          }}
        >
          {running ? `Processing ${progress.current} / ${progress.total}…` : "Search & Extract Questions"}
        </button>

        <LiveOutput events={events} running={running} progress={progress} />
      </div>
    </div>
  );
}

function LiveOutput({ events, running, progress }: {
  events: SseEvent[];
  running: boolean;
  progress: { current: number; total: number };
}) {
  if (events.length === 0 && !running) return null;

  const done = events.find((e) => e.type === "done") as Extract<SseEvent, { type: "done" }> | undefined;
  const status = [...events].reverse().find((e) => e.type === "status") as Extract<SseEvent, { type: "status" }> | undefined;

  return (
    <div className="space-y-3 mt-1">
      {/* Progress bar */}
      {running && progress.total > 0 && (
        <div className="rounded-full overflow-hidden h-1.5" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${(progress.current / progress.total) * 100}%`, background: "var(--accent-blue)" }}
          />
        </div>
      )}

      {/* Status message */}
      {status && running && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{status.message}</p>
      )}

      {/* Done banner */}
      {done && !running && (
        <div className="px-4 py-3 rounded-lg text-sm font-semibold"
          style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80" }}>
          ✓ Done — {done.generated} of {done.total} question{done.generated !== 1 ? "s" : ""} saved
        </div>
      )}

      {/* Event cards */}
      <div className="space-y-2">
        {events.map((ev, i) => {
          if (ev.type === "question") return (
            <div key={i} className="rounded-lg px-4 py-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: SECTION_COLORS[ev.question.section] }} />
                <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{ev.question.section}</span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>· {ev.question.topic}</span>
                <span className="ml-auto px-2 py-0.5 rounded text-xs font-semibold"
                  style={{ background: `${DIFF_COLORS[ev.question.difficulty]}20`, color: DIFF_COLORS[ev.question.difficulty] }}>
                  {ev.question.difficulty}
                </span>
              </div>
              <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                {ev.question.stem.length > 140 ? ev.question.stem.slice(0, 140) + "…" : ev.question.stem}
              </p>
              {ev.source && (
                <p className="text-xs mt-1 truncate" style={{ color: "var(--text-muted)" }}>{ev.source}</p>
              )}
            </div>
          );
          if (ev.type === "skip") return (
            <div key={i} className="px-3 py-2 rounded-lg text-xs flex items-center gap-2"
              style={{ background: "rgba(224,92,92,0.08)", border: "1px solid rgba(224,92,92,0.2)", color: "#e05c5c" }}>
              <span>⊘ Skipped</span>
              <span style={{ opacity: 0.7 }}>·</span>
              <span style={{ color: "var(--text-muted)" }}>{ev.reason.replace(/_/g, " ")}</span>
              {ev.flags && ev.flags.length > 0 && (
                <span style={{ color: "var(--text-muted)" }}>— {ev.flags.join("; ")}</span>
              )}
            </div>
          );
          if (ev.type === "error") return (
            <div key={i} className="px-3 py-2 rounded-lg text-xs"
              style={{ background: "rgba(224,92,92,0.1)", border: "1px solid rgba(224,92,92,0.3)", color: "#e05c5c" }}>
              ✗ {ev.message}
            </div>
          );
          return null;
        })}
      </div>
    </div>
  );
}

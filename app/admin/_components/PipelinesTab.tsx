"use client";
import { useState } from "react";

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
  return (
    <div className="rounded-xl px-5 py-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>PDF Book Extraction</p>
      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Coming next step.</p>
    </div>
  );
}

function WISPPipeline() {
  return (
    <div className="rounded-xl px-5 py-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>WISP Web Research</p>
      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Coming next step.</p>
    </div>
  );
}

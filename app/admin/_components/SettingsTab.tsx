"use client";
import { useState, useEffect, useRef } from "react";

interface ModelConfig {
  id: string;
  name: string;
  modelId: string;
  baseUrl: string;
  apiKey: string;
  createdAt: string;
}

const EMPTY_FORM = { name: "", modelId: "", baseUrl: "", apiKey: "" };

const DEFAULT_GEN_PROMPT = `You are an expert MCAT question writer trained on AAMC content specifications.

Generate high-quality, MCAT-style multiple-choice questions that:
- Test the exact cognitive skills the MCAT assesses (knowledge recall, scientific reasoning, data interpretation, research methods)
- Reflect AAMC content weighting by section:
  • Chem/Phys: general chemistry 30%, physics 25%, biochemistry 25%, organic chemistry 15%, biology 5%
  • Bio/Biochem: biology 65%, biochemistry 35%
  • Psych/Soc: psychology 65%, sociology 30%, biology 5%
  • CARS: comprehension, reasoning, inference — no outside knowledge required
- Include a realistic passage (3–5 sentences) when relevant, or mark passage as null for discrete questions
- Write four plausible answer choices (A–D) with exactly one correct answer
- Provide a thorough explanation (3–6 sentences) covering why the correct answer is right and why each distractor is wrong
- Match real MCAT difficulty: medium (70% correct rate) by default

Output ONLY valid JSON in this exact shape:
{
  "section": "Chem/Phys" | "CARS" | "Bio/Biochem" | "Psych/Soc",
  "topic": "<specific topic>",
  "passage": "<passage text or null>",
  "stem": "<question stem>",
  "optionA": "<choice A>",
  "optionB": "<choice B>",
  "optionC": "<choice C>",
  "optionD": "<choice D>",
  "correctAnswer": "A" | "B" | "C" | "D",
  "explanation": "<detailed explanation>",
  "difficulty": "easy" | "medium" | "hard"
}`;

const DEFAULT_VAL_PROMPT = `You are an MCAT content auditor. Review the provided question for:
1. Factual accuracy — flag any scientific errors
2. Answer key correctness — verify the stated correct answer is actually correct
3. Distractor quality — flag if distractors are implausible or if multiple choices could be correct
4. MCAT alignment — flag if the question tests knowledge outside MCAT scope

Output ONLY valid JSON:
{
  "pass": true | false,
  "flags": ["<issue 1>", "<issue 2>"],
  "corrected_question": { <full corrected question JSON, identical shape to input, or null if pass=true> }
}`;

type EnvStatus = { anthropic: boolean; database: boolean; clerkPublishable: boolean; clerkSecret: boolean };

function EnvRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
      <span className="text-sm font-mono" style={{ color: "var(--text-secondary)" }}>{label}</span>
      <span
        className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
        style={{
          background: ok ? "rgba(74,222,128,0.12)" : "rgba(224,92,92,0.12)",
          color: ok ? "#4ade80" : "#e05c5c",
          border: `1px solid ${ok ? "rgba(74,222,128,0.3)" : "rgba(224,92,92,0.3)"}`,
        }}
      >
        {ok ? "✓ Set" : "✗ Missing"}
      </span>
    </div>
  );
}

export default function SettingsTab() {
  const [env, setEnv]                    = useState<EnvStatus | null>(null);
  const [firestoreEnabled, setFbEnabled] = useState(false);
  const [firestoreProject, setFbProject] = useState("");
  const [genPrompt, setGenPrompt]        = useState(DEFAULT_GEN_PROMPT);
  const [valPrompt, setValPrompt]        = useState(DEFAULT_VAL_PROMPT);
  const [saving, setSaving]              = useState<string | null>(null);
  const [saved, setSaved]                = useState<string | null>(null);

  const [models, setModels]           = useState<ModelConfig[]>([]);
  const [modelForm, setModelForm]     = useState(EMPTY_FORM);
  const [modelSaving, setModelSaving] = useState(false);
  const [modelError, setModelError]   = useState<string | null>(null);
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [showKey, setShowKey]         = useState<Record<string, boolean>>({});
  const apiKeyRef                     = useRef<HTMLInputElement>(null);

  const [firestoreTest, setFirestoreTest] = useState<{ ok: boolean; msg: string } | null>(null);
  const [firestoreTesting, setFirestoreTesting] = useState(false);
  const [modelTests, setModelTests]   = useState<Record<string, { ok: boolean; msg: string }>>({});
  const [testingId, setTestingId]     = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d: { env: EnvStatus; settings: Record<string, string> }) => {
        setEnv(d.env);
        if (d.settings.firestore_enabled) setFbEnabled(d.settings.firestore_enabled === "true");
        if (d.settings.firestore_project_id) setFbProject(d.settings.firestore_project_id);
        if (d.settings.generation_prompt) setGenPrompt(d.settings.generation_prompt);
        if (d.settings.validation_prompt) setValPrompt(d.settings.validation_prompt);
      })
      .catch(() => {});

    fetch("/api/admin/models")
      .then((r) => r.json())
      .then((d: { models?: ModelConfig[] }) => { if (d.models) setModels(d.models); })
      .catch(() => {});
  }, []);

  async function addModel() {
    if (!modelForm.name.trim() || !modelForm.modelId.trim()) {
      setModelError("Name and Model ID are required.");
      return;
    }
    setModelSaving(true);
    setModelError(null);
    try {
      const res = await fetch("/api/admin/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modelForm),
      });
      const data = await res.json() as { model?: ModelConfig; error?: string };
      if (!res.ok) { setModelError(data.error ?? "Failed to save"); return; }
      setModels((prev) => [...prev, data.model!]);
      setModelForm(EMPTY_FORM);
    } catch {
      setModelError("Network error");
    } finally {
      setModelSaving(false);
    }
  }

  async function removeModel(id: string) {
    setDeletingId(id);
    try {
      await fetch("/api/admin/models", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setModels((prev) => prev.filter((m) => m.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  async function testFirestore() {
    setFirestoreTesting(true);
    setFirestoreTest(null);
    try {
      const res = await fetch("/api/admin/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "firestore" }),
      });
      const d = await res.json() as { ok: boolean; error?: string };
      setFirestoreTest({ ok: d.ok, msg: d.ok ? "Connected" : (d.error ?? "Failed") });
    } catch {
      setFirestoreTest({ ok: false, msg: "Network error" });
    } finally {
      setFirestoreTesting(false);
    }
  }

  async function testModel(m: ModelConfig) {
    setTestingId(m.id);
    setModelTests((t) => { const n = { ...t }; delete n[m.id]; return n; });
    try {
      const res = await fetch("/api/admin/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "model", modelId: m.modelId, baseUrl: m.baseUrl, apiKey: m.apiKey }),
      });
      const d = await res.json() as { ok: boolean; error?: string };
      setModelTests((t) => ({ ...t, [m.id]: { ok: d.ok, msg: d.ok ? "Connected" : (d.error ?? "Failed") } }));
    } catch {
      setModelTests((t) => ({ ...t, [m.id]: { ok: false, msg: "Network error" } }));
    } finally {
      setTestingId(null);
    }
  }

  async function save(group: string, payload: Record<string, string>) {
    setSaving(group);
    try {
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSaved(group);
      setTimeout(() => setSaved(null), 2000);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-6">

      {/* Card 1: Environment Variables */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <div className="px-5 py-3.5" style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Environment Variables</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Set these in your <strong>Vercel dashboard → Settings → Environment Variables</strong>. Never commit keys to git.
          </p>
        </div>
        <div className="px-5 pb-1">
          {env ? (
            <>
              <EnvRow label="ANTHROPIC_API_KEY" ok={env.anthropic} />
              <EnvRow label="DATABASE_URL" ok={env.database} />
              <EnvRow label="NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" ok={env.clerkPublishable} />
              <EnvRow label="CLERK_SECRET_KEY" ok={env.clerkSecret} />
            </>
          ) : (
            <p className="text-xs py-4 text-center" style={{ color: "var(--text-muted)" }}>Loading…</p>
          )}
        </div>
      </div>

      {/* Card 2: Firestore Integration */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <div className="px-5 py-3.5" style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Firestore Integration</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Optionally sync questions and answers to Firebase Firestore in addition to PostgreSQL.
          </p>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Enable Firestore sync</span>
            <button
              onClick={() => setFbEnabled((v) => !v)}
              className="w-10 h-5 rounded-full relative transition-colors"
              style={{ background: firestoreEnabled ? "var(--accent-blue)" : "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <span
                className="absolute top-0.5 h-4 w-4 rounded-full transition-transform"
                style={{
                  background: "#fff",
                  left: firestoreEnabled ? "calc(100% - 1.125rem)" : "0.125rem",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                }}
              />
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Firebase Project ID
            </label>
            <input
              type="text"
              value={firestoreProject}
              onChange={(e) => setFbProject(e.target.value)}
              placeholder="my-project-12345"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }}
            />
          </div>

          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Service account key must be set as{" "}
            <code className="px-1 py-0.5 rounded" style={{ background: "var(--bg-card)" }}>FIREBASE_SERVICE_ACCOUNT</code>{" "}
            env var on Vercel (JSON, base64-encoded).
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => save("firestore", { firestore_enabled: String(firestoreEnabled), firestore_project_id: firestoreProject })}
              disabled={saving === "firestore"}
              className="px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: saved === "firestore" ? "rgba(74,222,128,0.15)" : "var(--accent-blue)", color: saved === "firestore" ? "#4ade80" : "#fff" }}
            >
              {saving === "firestore" ? "Saving…" : saved === "firestore" ? "Saved ✓" : "Save Firestore Config"}
            </button>
            <button
              onClick={testFirestore}
              disabled={firestoreTesting}
              className="px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            >
              {firestoreTesting ? "Testing…" : "Test Connection"}
            </button>
            {firestoreTest && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{
                  background: firestoreTest.ok ? "rgba(74,222,128,0.12)" : "rgba(224,92,92,0.12)",
                  color: firestoreTest.ok ? "#4ade80" : "#e05c5c",
                  border: `1px solid ${firestoreTest.ok ? "rgba(74,222,128,0.3)" : "rgba(224,92,92,0.3)"}`,
                }}
              >
                {firestoreTest.ok ? "✓ " : "✗ "}{firestoreTest.msg}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card 3: Custom Models */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <div className="px-5 py-3.5" style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Custom Models</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Configure additional AI models with their own API keys and base URLs. Stored in Firebase Firestore.
          </p>
        </div>
        <div className="px-5 py-4 space-y-4">

          {/* Existing models list */}
          {models.length > 0 && (
            <div className="space-y-2">
              {models.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                  style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{m.name}</p>
                    <p className="text-xs font-mono truncate" style={{ color: "var(--text-muted)" }}>{m.modelId}</p>
                    {m.baseUrl && (
                      <p className="text-xs font-mono truncate" style={{ color: "var(--text-muted)" }}>{m.baseUrl}</p>
                    )}
                    {m.apiKey && (
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                          {showKey[m.id] ? m.apiKey : `${"•".repeat(Math.min(16, m.apiKey.length - 4))}${m.apiKey.slice(-4)}`}
                        </p>
                        <button
                          onClick={() => setShowKey((s) => ({ ...s, [m.id]: !s[m.id] }))}
                          className="text-xs"
                          style={{ color: "var(--accent-blue)" }}
                        >
                          {showKey[m.id] ? "hide" : "show"}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="ml-3 flex flex-col items-end gap-1.5 flex-shrink-0">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => testModel(m)}
                        disabled={testingId === m.id}
                        className="px-2.5 py-1 rounded text-xs font-semibold"
                        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                      >
                        {testingId === m.id ? "…" : "Test"}
                      </button>
                      <button
                        onClick={() => removeModel(m.id)}
                        disabled={deletingId === m.id}
                        className="px-2.5 py-1 rounded text-xs font-semibold"
                        style={{ background: "rgba(224,92,92,0.12)", color: "#e05c5c", border: "1px solid rgba(224,92,92,0.3)" }}
                      >
                        {deletingId === m.id ? "…" : "Remove"}
                      </button>
                    </div>
                    {modelTests[m.id] && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: modelTests[m.id].ok ? "rgba(74,222,128,0.12)" : "rgba(224,92,92,0.12)",
                          color: modelTests[m.id].ok ? "#4ade80" : "#e05c5c",
                          border: `1px solid ${modelTests[m.id].ok ? "rgba(74,222,128,0.3)" : "rgba(224,92,92,0.3)"}`,
                        }}
                      >
                        {modelTests[m.id].ok ? "✓ " : "✗ "}{modelTests[m.id].msg}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {models.length === 0 && (
            <p className="text-xs text-center py-2" style={{ color: "var(--text-muted)" }}>No custom models configured yet.</p>
          )}

          {/* Add model form */}
          <div className="space-y-3 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider pt-2" style={{ color: "var(--text-muted)" }}>Add Model</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Name <span style={{ color: "#e05c5c" }}>*</span></label>
                <input
                  type="text"
                  value={modelForm.name}
                  onChange={(e) => setModelForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="GPT-4o"
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }}
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Model ID <span style={{ color: "#e05c5c" }}>*</span></label>
                <input
                  type="text"
                  value={modelForm.modelId}
                  onChange={(e) => setModelForm((f) => ({ ...f, modelId: e.target.value }))}
                  placeholder="gpt-4o"
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Base URL</label>
              <input
                type="text"
                value={modelForm.baseUrl}
                onChange={(e) => setModelForm((f) => ({ ...f, baseUrl: e.target.value }))}
                placeholder="https://api.openai.com/v1"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }}
              />
            </div>

            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>API Key</label>
              <input
                ref={apiKeyRef}
                type="password"
                value={modelForm.apiKey}
                onChange={(e) => setModelForm((f) => ({ ...f, apiKey: e.target.value }))}
                placeholder="sk-..."
                className="w-full px-3 py-2 rounded-lg text-sm font-mono"
                style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }}
              />
            </div>

            {modelError && (
              <p className="text-xs" style={{ color: "#e05c5c" }}>{modelError}</p>
            )}

            <button
              onClick={addModel}
              disabled={modelSaving}
              className="px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: "var(--accent-blue)", color: "#fff" }}
            >
              {modelSaving ? "Saving…" : "Add Model"}
            </button>
          </div>
        </div>
      </div>

      {/* Card 4: Custom Prompts */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <div className="px-5 py-3.5" style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Custom Generation Prompts</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Override the system prompts used by the admin generate pipeline. Saved to the database; leave blank to use hardcoded defaults.
          </p>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Generation Prompt (GENERATION_SYSTEM_PROMPT)
            </label>
            <textarea
              value={genPrompt}
              onChange={(e) => setGenPrompt(e.target.value)}
              rows={10}
              className="w-full px-3 py-2 rounded-lg text-xs font-mono resize-y"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Validation Prompt (VALIDATION_SYSTEM_PROMPT)
            </label>
            <textarea
              value={valPrompt}
              onChange={(e) => setValPrompt(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 rounded-lg text-xs font-mono resize-y"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }}
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => save("prompts", { generation_prompt: genPrompt, validation_prompt: valPrompt })}
              disabled={saving === "prompts"}
              className="px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: saved === "prompts" ? "rgba(74,222,128,0.15)" : "var(--accent-blue)", color: saved === "prompts" ? "#4ade80" : "#fff" }}
            >
              {saving === "prompts" ? "Saving…" : saved === "prompts" ? "Saved ✓" : "Save Prompts"}
            </button>
            <button
              onClick={() => {
                setGenPrompt(DEFAULT_GEN_PROMPT);
                setValPrompt(DEFAULT_VAL_PROMPT);
                save("prompts", { generation_prompt: DEFAULT_GEN_PROMPT, validation_prompt: DEFAULT_VAL_PROMPT });
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

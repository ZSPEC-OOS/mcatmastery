import { anthropic } from "./anthropic";
import { getModels } from "./firestore";
import type { ModelConfig } from "./firestore";

// ── Active model resolution ───────────────────────────────────────────────────
// Caches the first configured custom model for 30 seconds to avoid a Firestore
// round-trip on every request.

let _cached: ModelConfig | null | undefined = undefined;
let _expiry = 0;

export async function getActiveModel(): Promise<ModelConfig | null> {
  if (_cached !== undefined && Date.now() < _expiry) return _cached;
  try {
    const models = await getModels();
    _cached  = models[0] ?? null;
    _expiry  = Date.now() + 30_000;
    return _cached;
  } catch {
    return null;
  }
}

// ── Shared model caller ───────────────────────────────────────────────────────
// All AI calls in the app go through here so that whichever model is attached
// via the admin Settings page is used everywhere automatically.
//
// Admin routes pass explicit modelId/baseUrl/apiKey when the user picks a
// specific model. All other routes (practice, pipelines) omit those fields and
// get the active model resolved automatically.

export async function callModel(opts: {
  system:      string;
  userContent: string;
  maxTokens:   number;
  modelId?:    string;   // explicit override (admin routes)
  baseUrl?:    string;
  apiKey?:     string;
}): Promise<string> {
  // If no explicit config was passed, resolve the active model from Firestore
  let { modelId, baseUrl, apiKey } = opts;
  if (!modelId) {
    const active = await getActiveModel();
    if (active) {
      modelId = active.modelId;
      baseUrl  = active.baseUrl  || undefined;
      apiKey   = active.apiKey   || undefined;
    }
  }

  // Custom OpenAI-compatible endpoint
  if (baseUrl) {
    const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
    const res = await fetch(url, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model:    modelId,
        messages: [
          { role: "system", content: opts.system },
          { role: "user",   content: opts.userContent },
        ],
        max_tokens: opts.maxTokens,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Model API error ${res.status}: ${text.slice(0, 200)}`);
    }
    const data = await res.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices?.[0]?.message?.content ?? "";
  }

  // Anthropic SDK fallback
  const msg = await anthropic.messages.create({
    model:      modelId ?? "claude-opus-4-7",
    max_tokens: opts.maxTokens,
    system:     opts.system,
    messages:   [{ role: "user", content: opts.userContent }],
  });
  return msg.content[0].type === "text" ? msg.content[0].text : "";
}

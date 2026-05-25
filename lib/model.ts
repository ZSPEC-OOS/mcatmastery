import { anthropic } from "./anthropic";
import { getModels } from "./firestore";
import type { ModelConfig, ModelRole } from "./firestore";

// ── Active model resolution ───────────────────────────────────────────────────
// Caches the full model list for 30 seconds to avoid a Firestore round-trip on
// every request. Storing all models (not just models[0]) lets role-aware
// callers pick the right model from the same cache.

let _cachedModels: ModelConfig[] | undefined = undefined;
let _expiry = 0;

async function getAllModels(): Promise<ModelConfig[]> {
  if (_cachedModels !== undefined && Date.now() < _expiry) return _cachedModels;
  try {
    _cachedModels = await getModels();
    _expiry = Date.now() + 30_000;
    return _cachedModels;
  } catch {
    return _cachedModels ?? [];
  }
}

export async function getActiveModel(): Promise<ModelConfig | null> {
  const models = await getAllModels();
  return models.find((m) => m.role !== "disabled") ?? null;
}

// Returns the best model for a given role. Handles comma-separated multi-role
// strings ("generation,formatting") and the legacy "both" value (=generation+audit).
export async function getModelForRole(role: string): Promise<ModelConfig | null> {
  const models = await getAllModels();
  function hasRole(stored: string): boolean {
    if (!stored || stored === "disabled") return false;
    if (stored === "both") return role === "generation" || role === "audit";
    return stored.split(",").map(r => r.trim()).includes(role);
  }
  return models.find((m) => hasRole(m.role))
    ?? models.find((m) => m.role !== "disabled")
    ?? null;
}

// ── Shared model caller ───────────────────────────────────────────────────────
// All AI calls in the app go through here so that whichever model is attached
// via the admin Settings page is used everywhere automatically.
//
// Admin routes pass explicit modelId/baseUrl/apiKey when the user picks a
// specific model. All other routes (practice, pipelines) omit those fields and
// get the active model resolved automatically.

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function callModel(opts: {
  system:      string;
  userContent: string;
  maxTokens:   number;
  modelId?:    string;   // explicit override (admin routes)
  baseUrl?:    string;
  apiKey?:     string;
}, attempt = 0): Promise<string> {
  const retry = async () => {
    await sleep(Math.min(2 ** attempt * 2000, 32000));
    return callModel(opts, attempt + 1);
  };

  // If no explicit config was passed, resolve the active model from Firestore
  let { modelId, baseUrl, apiKey } = opts;
  let maxTokens = opts.maxTokens;
  if (!modelId) {
    const active = await getActiveModel();
    if (active) {
      modelId   = active.modelId;
      baseUrl   = active.baseUrl   || undefined;
      apiKey    = active.apiKey    || undefined;
      if (active.maxTokens) maxTokens = active.maxTokens;
    }
  }

  // Custom OpenAI-compatible endpoint
  if (baseUrl) {
    const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
    const messages = [
      { role: "system", content: opts.system },
      { role: "user",   content: opts.userContent },
    ];

    const doFetch = (tokenParam: "max_tokens" | "max_completion_tokens") =>
      fetch(url, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({ model: modelId, messages, [tokenParam]: maxTokens }),
      });

    let res = await doFetch("max_tokens");

    // Newer OpenAI models (o1, o3, gpt-5+) require max_completion_tokens
    if (res.status === 400) {
      const errText = await res.text().catch(() => "");
      if (errText.includes("max_tokens")) {
        res = await doFetch("max_completion_tokens");
      } else {
        throw new Error(`Model API error 400: ${errText.slice(0, 200)}`);
      }
    }

    if (!res.ok) {
      if ((res.status === 429 || res.status >= 500) && attempt < 4) return retry();
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Model API error ${res.status}: ${text.slice(0, 200)}`);
    }
    const data = await res.json() as {
      choices?: Array<{ message?: { content?: string | Array<{ type: string; text?: string }> | null; reasoning_content?: string | null } }>;
      error?: unknown;
    };
    const msg = data.choices?.[0]?.message;
    const raw = msg?.content;
    let content: string | null = null;
    if (typeof raw === "string") {
      content = raw || null;
    } else if (Array.isArray(raw)) {
      // Some newer models return content as an array of typed blocks
      content = raw.filter((b) => b?.type === "text" && b?.text).map((b) => b.text).join("") || null;
    }
    // DeepSeek reasoning models (R1, V4 Pro, etc.) put the chain-of-thought in
    // reasoning_content and may leave content empty when max_tokens is low.
    // Only fall back to reasoning_content if it looks like JSON — never use
    // raw prose thinking text as a substitute for structured output.
    if (!content && typeof msg?.reasoning_content === "string" && msg.reasoning_content) {
      const rc = msg.reasoning_content.trim();
      if (rc.startsWith("{") || rc.startsWith("[")) content = rc;
    }
    if (!content) {
      const hint = data.error
        ? ` API error: ${JSON.stringify(data.error).slice(0, 200)}`
        : ` Response: ${JSON.stringify(data).slice(0, 200)}`;
      const isReasoning = typeof msg?.reasoning_content === "string" && !!msg.reasoning_content;
      const reasoningHint = isReasoning ? " (reasoning model exhausted token budget before writing output — increase maxTokens)" : "";
      throw new Error(`Model returned empty content.${reasoningHint}${hint}`);
    }
    return content;
  }

  // Anthropic SDK fallback
  try {
    const msg = await anthropic.messages.create({
      model:      modelId ?? "claude-opus-4-7",
      max_tokens: maxTokens,
      system:     opts.system,
      messages:   [{ role: "user", content: opts.userContent }],
    });
    const block = msg.content[0];
    if (!block || block.type !== "text" || !block.text) {
      throw new Error(`Anthropic model returned no text content (block type: ${block?.type ?? "none"})`);
    }
    return block.text;
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if ((status === 429 || status === 529 || status === 503) && attempt < 4) return retry();
    throw err;
  }
}

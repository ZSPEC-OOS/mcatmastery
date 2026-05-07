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
}, _attempt = 0): Promise<string> {
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
      // Retry on rate-limit or transient server errors (up to 4 attempts, exponential backoff)
      if ((res.status === 429 || res.status >= 500) && _attempt < 4) {
        const backoff = Math.min(2 ** _attempt * 2000, 32000);
        await sleep(backoff);
        return callModel(opts, _attempt + 1);
      }
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Model API error ${res.status}: ${text.slice(0, 200)}`);
    }
    const data = await res.json() as { choices?: Array<{ message?: { content?: string | null } }>; error?: unknown };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      const hint = data.error ? ` API error: ${JSON.stringify(data.error).slice(0, 200)}` : ` Response: ${JSON.stringify(data).slice(0, 200)}`;
      throw new Error(`Model returned empty content.${hint}`);
    }
    return content;
  }

  // Anthropic SDK fallback
  try {
    const msg = await anthropic.messages.create({
      model:      modelId ?? "claude-opus-4-7",
      max_tokens: opts.maxTokens,
      system:     opts.system,
      messages:   [{ role: "user", content: opts.userContent }],
    });
    const block = msg.content[0];
    if (!block || block.type !== "text" || !block.text) {
      throw new Error(`Anthropic model returned no text content (block type: ${block?.type ?? "none"})`);
    }
    return block.text;
  } catch (err) {
    // Retry on rate-limit (429) or overload (529) errors
    const status = (err as { status?: number })?.status;
    if ((status === 429 || status === 529 || status === 503) && _attempt < 4) {
      const backoff = Math.min(2 ** _attempt * 2000, 32000);
      await sleep(backoff);
      return callModel(opts, _attempt + 1);
    }
    throw err;
  }
}

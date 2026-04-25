"use client";
import { useEffect, useState } from "react";
import { patchSessionQuestion, saveNote, type SessionQuestion, type ErrorType } from "../../../lib/api-client";

function FigureLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}
      onClick={onClose}>
      <img src={url} alt="Figure enlarged"
        className="max-w-full max-h-full rounded-xl object-contain"
        style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.6)" }} />
      <button onClick={onClose}
        className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-xl leading-none"
        style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)" }}>
        ×
      </button>
    </div>
  );
}

interface Props { id: string; onClose: () => void; }

const ERROR_TYPES: ErrorType[] = ["Content Gap", "Logic Error", "Misread Question", "Timing"];

export default function QuestionDetailPanel({ id, onClose }: Props) {
  const [sq, setSq]             = useState<SessionQuestion | null>(null);
  const [notes, setNotes]       = useState("");
  const [saving, setSaving]     = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/questions?limit=50`)
      .then(r => r.json())
      .then(data => {
        const found = (data.questions as SessionQuestion[])?.find(q => q.id === id);
        if (found) setSq(found);
      })
      .catch(console.error);
  }, [id]);

  const patch = async (updates: Parameters<typeof patchSessionQuestion>[1]) => {
    if (!sq) return;
    try {
      const updated = await patchSessionQuestion(sq.id, updates);
      setSq(updated);
    } catch (e) { console.error(e); }
  };

  const handleSaveNote = async () => {
    if (!notes.trim() || !sq) return;
    setSaving(true);
    try { await saveNote({ content: notes, questionId: sq.questionId }); }
    catch { /* non-blocking */ }
    finally { setSaving(false); }
  };

  const q = sq?.question;

  return (
    <>
    {lightbox && <FigureLightbox url={lightbox} onClose={() => setLightbox(null)} />}
    <div className="rounded-xl overflow-hidden mb-8" style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}>
      <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <span className="font-mono text-sm" style={{ color: "var(--text-primary)" }}>#{id.slice(-5)}</span>
        {q?.passage && (
          <span className="px-2 py-0.5 rounded text-xs"
            style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
            Passage-based
          </span>
        )}
        <div className="ml-auto">
          <button onClick={onClose} className="px-3 py-1 rounded text-xs"
            style={{ border: "1px solid var(--border)", color: "var(--text-secondary)", background: "transparent" }}>
            Close
          </button>
        </div>
      </div>

      {!q ? (
        <div className="p-6 text-sm" style={{ color: "var(--text-muted)" }}>Loading…</div>
      ) : (
        <div className="flex flex-col lg:flex-row">
          {/* Left panel */}
          <div className="p-5 flex-1">
            {q.figureUrl && (
              <div className="mb-4">
                <img
                  src={q.figureUrl}
                  alt="Figure"
                  onClick={() => setLightbox(q.figureUrl!)}
                  className="w-full rounded-xl object-contain cursor-zoom-in"
                  style={{ maxHeight: 220, border: "1px solid var(--border)", background: "var(--bg-elevated)" }}
                />
                <p className="text-xs mt-1 text-center" style={{ color: "var(--text-muted)" }}>Click to enlarge</p>
              </div>
            )}
            <p className="text-sm mb-4 leading-relaxed font-medium" style={{ color: "var(--text-primary)" }}>
              {q.stem}
            </p>

            <div className="space-y-2 mb-4">
              {(["A", "B", "C", "D"] as const).map(opt => {
                const text = q[`option${opt}` as keyof typeof q] as string;
                const isCorrect  = opt === q.correctAnswer;
                const isSelected = opt === sq?.userAnswer;
                return (
                  <div key={opt} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{
                      background: isCorrect ? "rgba(74,222,128,0.08)" : isSelected && !isCorrect ? "rgba(248,113,113,0.08)" : "transparent",
                      border: `1px solid ${isCorrect ? "#4ade80" : isSelected && !isCorrect ? "#f87171" : "var(--border)"}`,
                    }}>
                    <span className="text-xs font-bold w-4 flex-shrink-0"
                      style={{ color: isCorrect ? "#4ade80" : isSelected ? "#f87171" : "var(--text-muted)" }}>
                      {opt}.
                    </span>
                    <span className="text-sm" style={{ color: "var(--text-primary)" }}>{text}</span>
                    {isCorrect  && <span className="ml-auto text-xs" style={{ color: "#4ade80" }}>✓ Correct</span>}
                    {isSelected && !isCorrect && <span className="ml-auto text-xs" style={{ color: "#f87171" }}>✗ Your answer</span>}
                  </div>
                );
              })}
            </div>

            <div className="mb-4">
              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Error Type</label>
              <select value={sq?.errorType ?? ""}
                onChange={e => patch({ errorType: (e.target.value as ErrorType) || null })}
                className="w-full rounded px-2 py-1.5 text-sm"
                style={{ background: "var(--bg-card-hover)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                <option value="">— Select error type —</option>
                {ERROR_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>

            <div className="mb-4">
              <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Your Notes</label>
              <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Add notes about this question…"
                className="w-full rounded px-2 py-1.5 text-xs"
                style={{ background: "var(--bg-card-hover)", border: "1px solid var(--border)", color: "var(--text-secondary)", resize: "vertical" }} />
              <button onClick={handleSaveNote} disabled={saving || !notes.trim()}
                className="mt-1 text-xs px-3 py-1 rounded"
                style={{ background: "var(--accent-blue)", color: "#fff", border: "none", opacity: saving || !notes.trim() ? 0.5 : 1 }}>
                {saving ? "Saving…" : "Save Note"}
              </button>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button onClick={() => patch({ reviewStatus: "reviewed" })}
                className="text-xs px-3 py-1.5 rounded"
                style={{ border: "1px solid var(--border)", color: sq?.reviewStatus === "reviewed" ? "#4ade80" : "var(--text-secondary)", background: "transparent" }}>
                {sq?.reviewStatus === "reviewed" ? "✓ Reviewed" : "Mark Reviewed"}
              </button>
              <button onClick={() => patch({ flagged: !sq?.flagged })}
                className="text-xs px-3 py-1.5 rounded"
                style={{ border: "1px solid var(--border)", color: sq?.flagged ? "#f0a500" : "var(--text-secondary)", background: "transparent" }}>
                {sq?.flagged ? "★ Flagged" : "Flag"}
              </button>
            </div>
          </div>

          {/* Right — explanation */}
          <div className="p-5 w-full lg:w-80 flex-shrink-0"
            style={{ borderLeft: "1px solid var(--border)", background: "rgba(255,255,255,0.01)" }}>
            <p className="text-xs font-semibold uppercase mb-2" style={{ color: "var(--text-muted)" }}>
              Explanation
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {q.explanation}
            </p>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

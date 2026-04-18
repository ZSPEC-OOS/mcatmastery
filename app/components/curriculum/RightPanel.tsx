"use client";
import { useEffect, useState } from "react";
import { fetchMistakes, saveNote, type SessionQuestion } from "../../../lib/api-client";

const SECTION_MAP: Record<string, string> = {
  chem: "Chem/Phys", cars: "CARS", bio: "Bio/Biochem", psych: "Psych/Soc",
};

const calDays = [
  { label: "Mon", value: "✓", sub: "Easy",   active: false, done: true },
  { label: "Tue", value: "✓", sub: "Good",   active: false, done: true },
  { label: "Wed", value: "8",  sub: "Review", active: true,  done: false },
  { label: "Thu", value: "12", sub: "New",    active: false, done: false },
  { label: "Fri", value: "5",  sub: "Today",  active: false, done: false },
];

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl p-4 ${className}`}
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      {children}
    </div>
  );
}

interface Props { topicKey: string; }

export default function RightPanel({ topicKey }: Props) {
  const [mistakes, setMistakes] = useState<SessionQuestion[]>([]);
  const [note, setNote]         = useState("");
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  const [sectionId, topicLabel] = topicKey.split(":") as [string, string];
  const sectionName = SECTION_MAP[sectionId] ?? sectionId;

  useEffect(() => {
    setMistakes([]);
    fetchMistakes({ wrong: true, limit: 50 })
      .then(r => {
        const filtered = r.questions.filter(q => q.question.topic === topicLabel);
        setMistakes(filtered);
      })
      .catch(() => {});
  }, [topicLabel]);

  const handleSaveNote = async () => {
    if (!note.trim() || mistakes.length === 0) return;
    setSaving(true);
    try {
      await saveNote({ content: note.trim(), topic: topicLabel });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const fmtDate = (s: string | null) =>
    s ? new Date(s).toLocaleDateString("en-US", { month: "numeric", day: "numeric" }) : "—";

  return (
    <div
      className="overflow-y-auto py-6 px-4 space-y-4"
      style={{ width: 272, minWidth: 272, borderLeft: "1px solid var(--border)" }}
    >
      {/* Recent mistakes for topic */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
            Recent Mistakes
          </span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{sectionName}</span>
        </div>
        {mistakes.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            No mistakes recorded for {topicLabel || "this topic"}.
          </p>
        ) : (
          <div className="space-y-3">
            {mistakes.slice(0, 4).map(m => (
              <div key={m.id} className="flex items-start gap-2">
                <div
                  className="w-3.5 h-3.5 rounded-sm flex-shrink-0 mt-0.5"
                  style={{ border: "1px solid var(--border)" }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate" style={{ color: "var(--text-primary)" }}>{m.question.stem}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{m.question.topic} • #{m.id.slice(-5)}</p>
                </div>
                <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                  {fmtDate(m.answeredAt ?? m.question.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Notes */}
      <Card>
        <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Notes</p>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={4}
          placeholder="Add a note about this topic…"
          className="w-full text-xs resize-none rounded-lg p-2"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            outline: "none",
          }}
        />
        <button
          onClick={handleSaveNote}
          disabled={saving || !note.trim()}
          className="mt-2 w-full py-1.5 rounded text-xs font-semibold"
          style={{
            background: saved ? "rgba(74,222,128,0.2)" : "var(--accent-blue)",
            color: saved ? "#4ade80" : "#fff",
            opacity: saving || !note.trim() ? 0.5 : 1,
          }}
        >
          {saved ? "Saved!" : saving ? "Saving…" : "Save Note"}
        </button>
      </Card>

      {/* Quick Actions */}
      <Card>
        <p className="text-xs font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
          Quick Actions
        </p>
        <div className="space-y-1">
          {[
            { icon: "▤", label: "Practice Questions",  href: `/practice?topic=${encodeURIComponent(topicLabel ?? "")}` },
            { icon: "⇄", label: "Review Mistakes",     href: "/review" },
            { icon: "✓", label: "Mark as Reviewed",    href: "#" },
          ].map(a => (
            <a
              key={a.label}
              href={a.href}
              className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors"
              style={{ color: "var(--text-secondary)", textDecoration: "none", display: "flex" }}
            >
              <span className="text-base w-5 text-center" style={{ color: "var(--text-muted)" }}>{a.icon}</span>
              <span className="flex-1 text-xs">{a.label}</span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>→</span>
            </a>
          ))}
        </div>
      </Card>

      {/* Spaced Repetition */}
      <Card>
        <p className="text-xs font-semibold mb-0.5" style={{ color: "var(--text-primary)" }}>
          Spaced Repetition
        </p>
        <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
          Next review in: <strong style={{ color: "var(--text-primary)" }}>2 days</strong>
        </p>
        <div className="grid grid-cols-5 gap-1 text-center">
          {calDays.map(d => (
            <div key={d.label} className="flex flex-col items-center gap-1">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{d.label}</span>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                style={{
                  background: d.done
                    ? "var(--accent-blue)"
                    : d.active
                    ? "rgba(45,106,224,0.35)"
                    : "rgba(255,255,255,0.06)",
                  color: d.done || d.active ? "#fff" : "var(--text-secondary)",
                  border: d.active ? "1px solid var(--accent-blue)" : "none",
                }}
              >
                {d.value}
              </div>
              <span className="text-xs" style={{ color: d.active ? "var(--text-primary)" : "var(--text-muted)" }}>
                {d.sub}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

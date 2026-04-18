"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

interface StudyTask {
  id: string;
  title: string;
  section: string | null;
  completed: boolean;
  dueDate: string | null;
}

function taskConfig(title: string) {
  const t = title.toLowerCase();
  if (t.includes("cars"))                            return { subtitle: "(5 Passages)",  href: "/practice",   variant: "primary"   as const, action: "Begin" };
  if (t.includes("chem"))                            return { subtitle: "(45 min)",       href: "/practice",   variant: "primary"   as const, action: "Resume" };
  if (t.includes("bio"))                             return { subtitle: "(20 Questions)", href: "/practice",   variant: "secondary" as const, action: "Continue" };
  if (t.includes("flash"))                           return { subtitle: "(30 Cards)",     href: "/curriculum", variant: "secondary" as const, action: "Review" };
  if (t.includes("review") || t.includes("missed"))  return { subtitle: "",              href: "/review",     variant: "secondary" as const, action: "Review Log" };
  return { subtitle: "", href: "/practice", variant: "secondary" as const, action: "Start" };
}

export default function TaskList() {
  const [tasks, setTasks]     = useState<StudyTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/study-tasks")
      .then(r => r.json())
      .then((data: StudyTask[]) => { if (Array.isArray(data)) setTasks(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleTask = async (id: string, completed: boolean) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed } : t));
    try {
      await fetch("/api/study-tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, completed }),
      });
    } catch {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !completed } : t));
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl p-6 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading tasks…</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl p-6 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No study tasks yet. Start a practice session to get started.</p>
        <Link href="/practice" className="inline-block mt-3 px-4 py-2 rounded text-xs font-semibold"
          style={{ background: "var(--accent-blue)", color: "#fff", textDecoration: "none" }}>
          Start Practicing
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map(task => {
        const cfg = taskConfig(task.title);
        return (
          <div
            key={task.id}
            className="rounded-xl p-4 flex items-center gap-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <button
              onClick={() => toggleTask(task.id, !task.completed)}
              className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
              style={{
                border: task.completed ? "none" : "1.5px solid var(--border)",
                background: task.completed ? "var(--accent-blue)" : "transparent",
              }}
            >
              {task.completed && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                  {task.title}
                </span>
                {cfg.subtitle && (
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{cfg.subtitle}</span>
                )}
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: task.completed ? "100%" : "0%",
                    background: "var(--accent-blue)",
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
            </div>

            <Link
              href={cfg.href}
              className="px-4 py-1.5 rounded text-xs font-semibold flex-shrink-0"
              style={
                cfg.variant === "primary"
                  ? { background: "var(--accent-blue)", color: "#fff", textDecoration: "none" }
                  : { background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border)", textDecoration: "none" }
              }
            >
              {task.completed ? "Done" : cfg.action}
            </Link>
          </div>
        );
      })}
    </div>
  );
}

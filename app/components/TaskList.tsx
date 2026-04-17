import Link from "next/link";

type Task = {
  id: string;
  title: string;
  subtitle: string;
  progress: number;
  meta: string;
  action: string;
  href: string;
  variant: "primary" | "secondary";
};

const tasks: Task[] = [
  {
    id: "chem",
    title: "Chem/Phys Review",
    subtitle: "(45 min)",
    progress: 68,
    meta: "Estimated",
    action: "Resume",
    href: "/practice",
    variant: "primary",
  },
  {
    id: "cars",
    title: "CARS Passage Set",
    subtitle: "(5 Passages)",
    progress: 0,
    meta: "Timed  •  0  •  0/5",
    action: "Begin",
    href: "/practice",
    variant: "primary",
  },
  {
    id: "bio",
    title: "Bio/Biochem Questions",
    subtitle: "(20 Questions)",
    progress: 30,
    meta: "Estimated 30m  0/20",
    action: "Continue",
    href: "/practice",
    variant: "secondary",
  },
  {
    id: "flash",
    title: "Flashcards",
    subtitle: "(30 Cards)",
    progress: 20,
    meta: "Adaptive  0/30 — 0/30",
    action: "Review",
    href: "/curriculum",
    variant: "secondary",
  },
  {
    id: "missed",
    title: "Review Missed Questions",
    subtitle: "",
    progress: 100,
    meta: "Reviewed items queried Today",
    action: "Review Log",
    href: "/review",
    variant: "secondary",
  },
];

export default function TaskList() {
  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const done = task.progress === 100;

  return (
    <div
      className="rounded-xl p-4 flex items-center gap-4 transition-colors"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      {/* Checkbox */}
      <div
        className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
        style={{
          border: done ? "none" : "1.5px solid var(--border)",
          background: done ? "var(--accent-blue)" : "transparent",
        }}
      >
        {done && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </div>

      {/* Text + progress */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
            {task.title}
          </span>
          {task.subtitle && (
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {task.subtitle}
            </span>
          )}
        </div>
        <div
          className="h-1.5 rounded-full mb-1.5 overflow-hidden"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${task.progress}%`,
              background:
                task.progress === 100
                  ? "var(--accent-blue)"
                  : "linear-gradient(90deg, var(--accent-blue), #5b9cf6)",
            }}
          />
        </div>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {task.meta}
        </span>
      </div>

      {/* Action button */}
      <Link
        href={task.href}
        className="px-4 py-1.5 rounded text-xs font-semibold flex-shrink-0 transition-all"
        style={
          task.variant === "primary"
            ? { background: "var(--accent-blue)", color: "#fff", textDecoration: "none" }
            : { background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border)", textDecoration: "none" }
        }
      >
        {task.action}
      </Link>
    </div>
  );
}

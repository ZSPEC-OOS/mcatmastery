"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
  fetchPracticeQuestions, createSession, completeSession,
  type Section, type Difficulty, type Answer, type Question,
} from "../../lib/api-client";
import { SECTION_SUBTYPES, getSubTypesForSections } from "../../lib/subtypes";

const SECTIONS: Section[]        = ["Chem/Phys", "CARS", "Bio/Biochem", "Psych/Soc"];
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

const DIFF_LABEL: Record<Difficulty, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };
const DIFF_COLOR: Record<Difficulty, string> = { easy: "#4ade80", medium: "#f0a500", hard: "#f87171" };

const SEC_COLOR: Record<Section, string> = {
  "Chem/Phys":  "#6366f1",
  CARS:          "#f0a500",
  "Bio/Biochem": "#4ade80",
  "Psych/Soc":   "#a78bfa",
};

type Phase = "config" | "loading" | "active" | "complete" | "error";

const S = {
  card: { background: "var(--bg-card)", border: "1px solid var(--border)" } as React.CSSProperties,
};

export default function PracticePage() {
  const allSubTypeIds = (secs: Section[]) =>
    getSubTypesForSections(secs).map(s => s.id);

  const [sections,     setSections]     = useState<Section[]>(["Chem/Phys", "CARS", "Bio/Biochem", "Psych/Soc"]);
  const [difficulties, setDifficulties] = useState<Difficulty[]>(["easy", "medium", "hard"]);
  const [subTypes,     setSubTypes]     = useState<string[]>(() =>
    allSubTypeIds(["Chem/Phys", "CARS", "Bio/Biochem", "Psych/Soc"]));
  const [count,        setCount]        = useState(10);
  const [timeMode,     setTimeMode]     = useState<"untimed" | "default" | "custom">("untimed");
  const [customMins,   setCustomMins]   = useState(10);

  const [phase,     setPhase]     = useState<Phase>("config");
  const [errorMsg,  setErrorMsg]  = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [idx,       setIdx]       = useState(0);
  const [foundInfo, setFoundInfo] = useState<{ found: number; returned: number } | null>(null);

  const [selected,  setSelected]  = useState<Answer | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showExp,   setShowExp]   = useState(false);
  const [answers,   setAnswers]   = useState<Record<string, Answer>>({});

  const [elapsed, setElapsed] = useState(0);
  const timerRef              = useRef<ReturnType<typeof setInterval> | null>(null);
  const qStartRef             = useRef(Date.now());

  const currentQ = questions[idx] ?? null;
  const timed    = timeMode !== "untimed";
  const totalTime = timeMode === "custom" ? customMins * 60 : count * 95;

  function toggleSection(s: Section) {
    setSections(prev => {
      const next = prev.includes(s)
        ? prev.length > 1 ? prev.filter(x => x !== s) : prev
        : [...prev, s];
      // auto-select subtypes for newly added section; auto-remove for removed section
      if (!prev.includes(s)) {
        const newIds = (SECTION_SUBTYPES[s] ?? []).map(st => st.id);
        setSubTypes(cur => [...new Set([...cur, ...newIds])]);
      } else if (next.length < prev.length) {
        const removed = (SECTION_SUBTYPES[s] ?? []).map(st => st.id);
        setSubTypes(cur => cur.filter(id => !removed.includes(id)));
      }
      return next;
    });
  }

  function toggleSubType(id: string, visibleIds: string[]) {
    setSubTypes(prev => {
      if (prev.includes(id)) {
        return prev.length > 1 ? prev.filter(x => x !== id) : prev;
      }
      return [...prev, id];
    });
    void visibleIds; // kept for potential future "select all" logic
  }

  function toggleDifficulty(d: Difficulty) {
    setDifficulties(prev =>
      prev.includes(d)
        ? prev.length > 1 ? prev.filter(x => x !== d) : prev
        : [...prev, d]
    );
  }

  useEffect(() => {
    if (phase !== "active") return;
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const handleFetch = useCallback(async () => {
    setPhase("loading");
    setQuestions([]);
    setAnswers({});
    setIdx(0);
    setElapsed(0);
    setErrorMsg("");
    setFoundInfo(null);

    try {
      const result = await fetchPracticeQuestions({
        sections,
        difficulties,
        subTypes: subTypes.length ? subTypes : undefined,
        count,
      });

      if (result.questions.length === 0) {
        setErrorMsg(
          "No questions in the bank match your criteria. Try selecting more sections or difficulties, or generate questions in the Admin panel first."
        );
        setPhase("error");
        return;
      }

      setFoundInfo({ found: result.found, returned: result.returned });

      const sess = await createSession(sections[0], timed).catch(() => null);
      setSessionId(sess?.id ?? null);

      setQuestions(result.questions as Question[]);
      setPhase("active");
      qStartRef.current = Date.now();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg || "Something went wrong. Please try again.");
      setPhase("error");
    }
  }, [sections, difficulties, subTypes, count, timed]);

  const handleSubmit = useCallback(async () => {
    if (!selected || !currentQ) return;
    const isCorrect = selected === currentQ.correctAnswer;
    setSubmitted(true);
    setShowExp(true);
    setAnswers(a => ({ ...a, [currentQ.id]: selected }));

    try {
      await fetch("/api/session-answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          questionId: currentQ.id,
          userAnswer: selected,
          isCorrect,
          timeSpentSeconds: Math.round((Date.now() - qStartRef.current) / 1000),
        }),
      });
    } catch { /* non-blocking */ }
  }, [selected, currentQ, sessionId]);

  const handleNext = useCallback(() => {
    if (idx >= questions.length - 1) {
      if (sessionId) completeSession(sessionId).catch(console.error);
      setPhase("complete");
    } else {
      setIdx(i => i + 1);
      setSelected(null);
      setSubmitted(false);
      setShowExp(false);
      qStartRef.current = Date.now();
    }
  }, [idx, questions.length, sessionId]);

  const correctCount = questions.filter(q => answers[q.id] === q.correctAnswer).length;

  // ── CONFIG ──────────────────────────────────────────────────────────────────
  if (phase === "config") return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg rounded-xl p-6 space-y-5" style={S.card}>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Configure Practice Session
          </h1>

          {/* Sections */}
          <div>
            <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>
              Sections <span style={{ fontWeight: 400 }}>({sections.length} selected)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SECTIONS.map(s => {
                const active = sections.includes(s);
                return (
                  <button key={s} onClick={() => toggleSection(s)}
                    className="py-2 px-3 rounded text-sm font-medium text-left flex items-center gap-2"
                    style={{
                      background: active ? "var(--accent-blue)" : "var(--bg-card-hover)",
                      color: active ? "#fff" : "var(--text-secondary)",
                      border: `1px solid ${active ? "var(--accent-blue)" : "var(--border)"}`,
                    }}>
                    <span className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 text-xs"
                      style={{ background: active ? "rgba(255,255,255,0.25)" : "var(--border)" }}>
                      {active ? "✓" : ""}
                    </span>
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>
              Difficulty <span style={{ fontWeight: 400 }}>({difficulties.length} selected)</span>
            </label>
            <div className="flex gap-2">
              {DIFFICULTIES.map(d => {
                const active = difficulties.includes(d);
                return (
                  <button key={d} onClick={() => toggleDifficulty(d)}
                    className="flex-1 py-2 rounded text-sm font-medium flex items-center justify-center gap-1.5"
                    style={{
                      background: active ? `${DIFF_COLOR[d]}20` : "var(--bg-card-hover)",
                      color: active ? DIFF_COLOR[d] : "var(--text-secondary)",
                      border: `1px solid ${active ? DIFF_COLOR[d] : "var(--border)"}`,
                    }}>
                    <span className="w-4 h-4 rounded flex items-center justify-center text-xs flex-shrink-0"
                      style={{ background: active ? `${DIFF_COLOR[d]}30` : "var(--border)", color: active ? DIFF_COLOR[d] : "transparent" }}>
                      {active ? "✓" : ""}
                    </span>
                    {DIFF_LABEL[d]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sub Types */}
          {(() => {
            const visibleSections = sections.filter(s => SECTION_SUBTYPES[s]?.length);
            const visibleIds = getSubTypesForSections(sections).map(st => st.id);
            const allSelected = visibleIds.every(id => subTypes.includes(id));
            return (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Sub Types <span style={{ fontWeight: 400 }}>({subTypes.filter(id => visibleIds.includes(id)).length} of {visibleIds.length})</span>
                  </label>
                  <button
                    onClick={() => allSelected
                      ? setSubTypes(prev => prev.filter(id => !visibleIds.includes(id)).concat(visibleIds.slice(0,1)))
                      : setSubTypes(prev => [...new Set([...prev, ...visibleIds])])}
                    className="text-xs"
                    style={{ color: "var(--accent-blue)" }}
                  >
                    {allSelected ? "Clear all" : "Select all"}
                  </button>
                </div>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {visibleSections.map(sec => (
                    <div key={sec}>
                      {visibleSections.length > 1 && (
                        <p className="text-xs font-semibold mb-1 mt-1" style={{ color: SEC_COLOR[sec as Section] }}>{sec}</p>
                      )}
                      {(SECTION_SUBTYPES[sec] ?? []).map(st => {
                        const checked = subTypes.includes(st.id);
                        return (
                          <label key={st.id}
                            className="flex items-start gap-2 py-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSubType(st.id, visibleIds)}
                              className="mt-0.5 flex-shrink-0"
                              style={{ accentColor: SEC_COLOR[sec as Section] }}
                            />
                            <span className="text-xs leading-snug" style={{ color: checked ? "var(--text-primary)" : "var(--text-secondary)" }}>
                              {st.label}
                              {st.imageRecommended && (
                                <span className="ml-1 text-xs" style={{ color: "var(--accent-blue)", fontStyle: "italic" }}>
                                  (image-based recommended)
                                </span>
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Count */}
          <div>
            <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>
              Questions: <strong style={{ color: "var(--text-primary)" }}>{count}</strong>
            </label>
            <input type="range" min={1} max={50} value={count}
              onChange={e => setCount(+e.target.value)}
              className="w-full" style={{ accentColor: "var(--accent-blue)" }} />
            <div className="flex justify-between text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              <span>1</span><span>10</span><span>25</span><span>50</span>
            </div>
          </div>

          {/* Time */}
          <div>
            <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>Time</label>
            <div className="flex gap-2 mb-2">
              {([
                { id: "untimed", label: "∞ Untimed" },
                { id: "default", label: `⏱ Default (${Math.round(count * 95 / 60)}m)` },
                { id: "custom",  label: "✎ Custom" },
              ] as const).map(opt => (
                <button key={opt.id} onClick={() => setTimeMode(opt.id)}
                  className="flex-1 py-2 rounded text-xs font-medium"
                  style={{
                    background: timeMode === opt.id ? "var(--accent-blue)" : "transparent",
                    color: timeMode === opt.id ? "#fff" : "var(--text-secondary)",
                    border: `1px solid ${timeMode === opt.id ? "var(--accent-blue)" : "var(--border)"}`,
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
            {timeMode === "custom" && (
              <div className="flex items-center gap-2">
                <input
                  type="number" min={1} max={180} value={customMins}
                  onChange={e => setCustomMins(Math.max(1, Math.min(180, +e.target.value)))}
                  className="w-20 px-3 py-1.5 rounded text-sm text-center"
                  style={{ background: "var(--bg-card-hover)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }}
                />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>minutes total</span>
              </div>
            )}
          </div>

          <button onClick={handleFetch}
            className="w-full py-2.5 rounded text-sm font-semibold"
            style={{ background: "var(--accent-blue)", color: "#fff", border: "none" }}>
            Start Practice
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );

  // ── ERROR ───────────────────────────────────────────────────────────────────
  if (phase === "error") return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-xl p-8 text-center space-y-4" style={S.card}>
          <div className="text-4xl">⚠️</div>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Couldn't Start Session</h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{errorMsg}</p>
          <button onClick={() => setPhase("config")}
            className="w-full py-2.5 rounded text-sm font-semibold mt-2"
            style={{ background: "var(--accent-blue)", color: "#fff", border: "none" }}>
            ← Back to Configure
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );

  // ── LOADING ─────────────────────────────────────────────────────────────────
  if (phase === "loading") return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
        <div className="w-10 h-10 rounded-full border-2 animate-spin"
          style={{ borderColor: "var(--accent-blue)", borderTopColor: "transparent" }} />
        <div className="text-center">
          <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
            Fetching questions from bank…
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {sections.join(", ")} · {difficulties.join(", ")} ·{" "}
            {subTypes.length} subtype{subTypes.length !== 1 ? "s" : ""}
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );

  // ── COMPLETE ────────────────────────────────────────────────────────────────
  if (phase === "complete") return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-12">
        <div className="rounded-xl p-8 w-full max-w-md text-center" style={S.card}>
          <div className="text-5xl font-bold mb-2"
            style={{ color: questions.length > 0 && correctCount / questions.length >= 0.7 ? "#4ade80" : "#f87171" }}>
            {questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0}%
          </div>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
            {correctCount} / {questions.length} correct
          </p>
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {questions.map((q, i) => {
              const ans     = answers[q.id];
              const correct = ans === q.correctAnswer;
              return (
                <div key={q.id}
                  className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold"
                  style={{
                    background: !ans ? "var(--bg-card-hover)" : correct ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)",
                    color: !ans ? "var(--text-muted)" : correct ? "#4ade80" : "#f87171",
                    border: `1px solid ${!ans ? "var(--border)" : correct ? "rgba(74,222,128,0.4)" : "rgba(248,113,113,0.4)"}`,
                  }}>
                  {i + 1}
                </div>
              );
            })}
          </div>
          <div className="flex gap-3">
            <button onClick={() => window.location.href = "/review"}
              className="flex-1 py-2 rounded text-sm font-semibold"
              style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
              Review Mistakes
            </button>
            <button onClick={() => { setPhase("config"); setQuestions([]); setAnswers({}); }}
              className="flex-1 py-2 rounded text-sm font-semibold"
              style={{ background: "var(--accent-blue)", color: "#fff", border: "none" }}>
              New Session
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );

  // ── NO QUESTIONS ─────────────────────────────────────────────────────────────
  if (!currentQ) return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-xl p-8 text-center space-y-4" style={S.card}>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No questions loaded.</p>
          <button onClick={() => setPhase("config")}
            className="w-full py-2.5 rounded text-sm font-semibold"
            style={{ background: "var(--accent-blue)", color: "#fff", border: "none" }}>
            ← Configure Session
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );

  // ── ACTIVE ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <div className="px-6 py-2 flex items-center gap-4 text-xs"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-card)" }}>
        <span style={{ color: "var(--text-muted)" }}>{currentQ?.section ?? sections.join(", ")}</span>
        {foundInfo && foundInfo.found > foundInfo.returned && (
          <span className="px-2 py-0.5 rounded text-xs"
            style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.2)" }}>
            {foundInfo.returned} of {foundInfo.found} available
          </span>
        )}
        <span className="ml-auto" style={{ color: "var(--text-secondary)" }}>
          {idx + 1} / {questions.length}
        </span>
        {timed && (
          <span className="font-mono px-2 py-1 rounded"
            style={{
              background: elapsed > totalTime * 0.8 ? "rgba(248,113,113,0.15)" : "rgba(27,58,107,0.12)",
              color: elapsed > totalTime * 0.8 ? "#f87171" : "#6366f1",
              border: `1px solid ${elapsed > totalTime * 0.8 ? "rgba(248,113,113,0.3)" : "rgba(27,58,107,0.25)"}`,
            }}>
            {fmt(Math.max(0, totalTime - elapsed))}
          </span>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {currentQ.passage && (
          <div className="hidden md:flex flex-col w-72 flex-shrink-0 overflow-y-auto p-4 text-xs leading-relaxed"
            style={{ borderRight: "1px solid var(--border)", color: "var(--text-secondary)" }}>
            <p className="font-semibold mb-2 text-xs uppercase tracking-wide"
              style={{ color: "var(--text-muted)" }}>Passage</p>
            <p>{currentQ.passage}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col max-w-2xl mx-auto w-full">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs px-2 py-0.5 rounded"
              style={{
                background: `${DIFF_COLOR[currentQ.difficulty as Difficulty] ?? "#6366f1"}15`,
                color: DIFF_COLOR[currentQ.difficulty as Difficulty] ?? "#6366f1",
                border: `1px solid ${DIFF_COLOR[currentQ.difficulty as Difficulty] ?? "#6366f1"}40`,
              }}>
              {currentQ.difficulty}
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{currentQ.topic}</span>
          </div>

          <p className="text-sm leading-relaxed mb-5 font-medium" style={{ color: "var(--text-primary)" }}>
            {idx + 1}. {currentQ.stem}
          </p>

          <div className="space-y-3 mb-6">
            {(["A", "B", "C", "D"] as Answer[]).map(opt => {
              const text = currentQ[`option${opt}` as keyof Question] as string;
              let bg = "var(--bg-card)", border = "var(--border)", color = "var(--text-primary)";
              if (submitted) {
                if (opt === currentQ.correctAnswer)  { bg = "rgba(74,222,128,0.1)";  border = "#4ade80"; color = "#4ade80"; }
                else if (opt === selected)           { bg = "rgba(248,113,113,0.1)"; border = "#f87171"; color = "#f87171"; }
              } else if (selected === opt) {
                bg = "rgba(27,58,107,0.1)"; border = "var(--accent-blue)";
              }
              const radioFilled = (selected === opt && !submitted) || (submitted && opt === currentQ.correctAnswer);
              return (
                <div key={opt} onClick={() => !submitted && setSelected(opt)}
                  className="rounded-xl p-3 flex items-start gap-3"
                  style={{ background: bg, border: `1px solid ${border}`, cursor: submitted ? "default" : "pointer", transition: "all 0.15s" }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{
                      background: radioFilled ? (submitted && opt === currentQ.correctAnswer ? "#4ade80" : "var(--accent-blue)") : "transparent",
                      border: `2px solid ${radioFilled ? border : "var(--border)"}`,
                    }}>
                    {radioFilled && <div className="w-2 h-2 rounded-full" style={{ background: "#fff" }} />}
                  </div>
                  <span className="text-sm" style={{ color }}>
                    <strong>{opt}.</strong> {text}
                  </span>
                </div>
              );
            })}
          </div>

          {showExp && (
            <div className="rounded-xl p-4 mb-4"
              style={{ background: "rgba(27,58,107,0.06)", border: "1px solid rgba(27,58,107,0.2)" }}>
              <p className="text-xs font-semibold uppercase mb-2" style={{ color: "#6366f1" }}>Explanation</p>
              <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>{currentQ.explanation}</p>
            </div>
          )}

          <div className="flex-1" />

          <div className="sticky bottom-0 py-3 flex items-center justify-between gap-3"
            style={{ borderTop: "1px solid var(--border)", background: "rgba(244,247,251,0.97)" }}>
            <button
              onClick={() => { setIdx(i => Math.max(0, i - 1)); setSelected(null); setSubmitted(false); setShowExp(false); }}
              disabled={idx === 0}
              className="px-4 py-1.5 rounded text-sm"
              style={{ color: "var(--text-secondary)", border: "1px solid var(--border)", background: "transparent", opacity: idx === 0 ? 0.4 : 1 }}>
              ← Prev
            </button>
            <div className="flex items-center gap-2">
              {!submitted ? (
                <button onClick={handleSubmit} disabled={!selected}
                  className="px-5 py-1.5 rounded text-sm font-semibold"
                  style={{ background: "var(--accent-blue)", color: "#fff", border: "none", opacity: selected ? 1 : 0.5 }}>
                  Submit
                </button>
              ) : (
                <button onClick={handleNext}
                  className="px-5 py-1.5 rounded text-sm font-semibold"
                  style={{ background: "var(--accent-blue)", color: "#fff", border: "none" }}>
                  {idx >= questions.length - 1 ? "Finish" : "Next →"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

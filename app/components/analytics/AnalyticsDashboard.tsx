"use client";
import { useEffect, useState } from "react";
import { fetchAnalytics, type Analytics, type Section } from "../../../lib/api-client";
import ScoreTrendCard from "./ScoreTrendCard";
import SectionBreakdownCard from "./SectionBreakdownCard";
import WeakTopicsCard from "./WeakTopicsCard";
import ErrorTypesCard from "./ErrorTypesCard";

const EMPTY: Analytics = {
  overall:    { accuracy: 0, correct: 0, total: 0 },
  sections: {
    "Chem/Phys":   { correct: 0, total: 0 },
    "CARS":        { correct: 0, total: 0 },
    "Bio/Biochem": { correct: 0, total: 0 },
    "Psych/Soc":   { correct: 0, total: 0 },
  },
  errorTypes: { "Content Gap": 0, "Logic Error": 0, "Misread Question": 0, "Timing": 0 },
  weakTopics: [],
  flScores:   [],
};

export default function AnalyticsDashboard() {
  const [data, setData]       = useState<Analytics>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics()
      .then(d => { if (d.overall.total > 0) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const hasData = data.overall.total > 0;

  return (
    <>
      <div className="flex gap-4 mb-6">
        {[
          { label: "Questions Answered", val: hasData ? data.overall.total.toLocaleString() : "—" },
          { label: "Overall Accuracy",   val: hasData ? `${data.overall.accuracy}%`         : "—" },
          { label: "FL Exams Taken",     val: data.flScores.length > 0 ? data.flScores.length : "—" },
        ].map((s, i) => (
          <div key={i} className="rounded-xl px-4 py-3 flex-1"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{s.val}</div>
            <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{s.label}</div>
          </div>
        ))}
        {loading && (
          <div className="text-xs flex items-center" style={{ color: "var(--text-muted)" }}>Syncing…</div>
        )}
      </div>

      {!hasData && !loading ? (
        <div className="rounded-xl p-10 text-center" style={{ border: "1px solid var(--border)" }}>
          <p className="text-sm mb-1" style={{ color: "var(--text-primary)" }}>No data yet</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Complete practice sessions and add full-length scores to see your analytics.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ScoreTrendCard flScores={data.flScores} />
          <SectionBreakdownCard sections={data.sections} />
          <WeakTopicsCard weakTopics={data.weakTopics} />
          <ErrorTypesCard errorTypes={data.errorTypes} />
        </div>
      )}
    </>
  );
}

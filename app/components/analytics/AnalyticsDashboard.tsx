"use client";
import { useEffect, useState } from "react";
import { fetchAnalytics, type Analytics, type Section } from "../../../lib/api-client";
import ScoreTrendCard from "./ScoreTrendCard";
import SectionBreakdownCard from "./SectionBreakdownCard";
import WeakTopicsCard from "./WeakTopicsCard";
import ErrorTypesCard from "./ErrorTypesCard";

const SEED_ANALYTICS: Analytics = {
  overall: { accuracy: 62, correct: 1457, total: 2350 },
  sections: {
    "Chem/Phys":   { correct: 380, total: 540 },
    "CARS":        { correct: 310, total: 480 },
    "Bio/Biochem": { correct: 450, total: 620 },
    "Psych/Soc":   { correct: 317, total: 480 },
  },
  errorTypes: { "Content Gap": 32, "Logic Error": 23, "Misread Question": 26, "Timing": 16 },
  weakTopics: [
    { label: "Enzyme Kinetics", section: "Bio/Biochem" as Section, accuracy: 45 },
    { label: "Kinematics",      section: "Chem/Phys"  as Section, accuracy: 52 },
    { label: "Inference",       section: "CARS"        as Section, accuracy: 56 },
    { label: "Identity",        section: "Psych/Soc"  as Section, accuracy: 58 },
  ],
  flScores: [
    { id: "1", testName: "FL1", chemPhys: 124, cars: 125, bioBiochem: 127, psychSoc: 128, total: 504, takenAt: "2024-06-01" },
    { id: "2", testName: "FL2", chemPhys: 125, cars: 126, bioBiochem: 128, psychSoc: 127, total: 506, takenAt: "2024-06-08" },
    { id: "3", testName: "FL3", chemPhys: 126, cars: 127, bioBiochem: 129, psychSoc: 126, total: 508, takenAt: "2024-06-15" },
    { id: "4", testName: "FL4", chemPhys: 125, cars: 126, bioBiochem: 129, psychSoc: 127, total: 507, takenAt: "2024-06-22" },
    { id: "5", testName: "FL5", chemPhys: 127, cars: 127, bioBiochem: 129, psychSoc: 126, total: 509, takenAt: "2024-06-29" },
    { id: "6", testName: "FL6", chemPhys: 128, cars: 128, bioBiochem: 129, psychSoc: 126, total: 511, takenAt: "2024-07-06" },
    { id: "7", testName: "FL7", chemPhys: 129, cars: 128, bioBiochem: 130, psychSoc: 125, total: 512, takenAt: "2024-07-13" },
  ],
};

export default function AnalyticsDashboard() {
  const [data, setData]       = useState<Analytics>(SEED_ANALYTICS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics()
      .then(d => { if (d.overall.total > 0) setData(d); })
      .catch(() => { /* keep seed */ })
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="flex gap-4 mb-6">
        {[
          { label: "Questions Answered", val: data.overall.total.toLocaleString() },
          { label: "Overall Accuracy",   val: `${data.overall.accuracy}%` },
          { label: "FL Exams Taken",     val: data.flScores.length },
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ScoreTrendCard flScores={data.flScores} />
        <SectionBreakdownCard sections={data.sections} />
        <WeakTopicsCard weakTopics={data.weakTopics} />
        <ErrorTypesCard errorTypes={data.errorTypes} />
      </div>
    </>
  );
}

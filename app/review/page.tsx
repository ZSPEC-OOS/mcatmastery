"use client";
import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import FilterBar from "../components/review/FilterBar";
import MistakeTable from "../components/review/MistakeTable";
import QuestionDetailPanel from "../components/review/QuestionDetailPanel";

export default function ReviewPage() {
  const [selectedId, setSelectedId] = useState<string>("01834");

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-8 w-full flex-1">
        {/* Header row */}
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Review / Mistake Log
          </h1>
          <button
            className="px-4 py-2 rounded text-sm"
            style={{
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              background: "transparent",
            }}
          >
            Practice Missed Questions
          </button>
        </div>

        {/* Subtitle */}
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
          Review missed questions, correct errors, and track your progress.
        </p>

        <FilterBar />
        <MistakeTable selectedId={selectedId} onSelect={setSelectedId} />
        {selectedId && (
          <QuestionDetailPanel id={selectedId} onClose={() => setSelectedId("")} />
        )}
      </div>
      <Footer />
    </div>
  );
}

"use client";
import { useState } from "react";
import Navbar from "../components/Navbar";
import PracticeToolbar from "../components/practice/PracticeToolbar";
import PassagePanel from "../components/practice/PassagePanel";
import QuestionView from "../components/practice/QuestionView";
import Footer from "../components/Footer";

export default function PracticePage() {
  const [showPassage, setShowPassage] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <PracticeToolbar onTogglePassage={() => setShowPassage((v) => !v)} />

      <div className="flex flex-1 overflow-hidden relative">
        {/* PassagePanel
            Desktop: always visible as left sidebar (md:flex)
            Mobile:  full-screen overlay toggled by PASSAGE button */}
        <div
          className={[
            // mobile: absolute overlay, shown/hidden via showPassage
            "absolute inset-0 z-30 flex",
            showPassage ? "flex" : "hidden",
            // desktop: revert to normal sidebar position
            "md:relative md:inset-auto md:z-auto md:flex",
          ].join(" ")}
        >
          <PassagePanel onClose={() => setShowPassage(false)} />
          {/* Mobile semi-transparent backdrop behind panel */}
          <div
            className="md:hidden flex-1"
            style={{ background: "rgba(0,0,0,0.55)" }}
            onClick={() => setShowPassage(false)}
          />
        </div>

        <QuestionView />
      </div>

      <Footer />
    </div>
  );
}

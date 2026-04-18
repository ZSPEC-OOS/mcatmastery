"use client";
import { useState } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import GenerateTab from "./_components/GenerateTab";
import SettingsTab from "./_components/SettingsTab";
import DatabaseTab from "./_components/DatabaseTab";

type Tab = "generate" | "settings" | "database";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("generate");

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <div className="max-w-6xl mx-auto w-full px-4 md:px-6 py-6 flex-1">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/" className="text-sm flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Dashboard
          </Link>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Admin Panel</h1>
        </div>

        <div className="flex gap-0 mb-6" style={{ borderBottom: "1px solid var(--border)" }}>
          {(["generate", "settings", "database"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-5 pb-2.5 text-sm font-medium"
              style={{
                color: tab === t ? "var(--text-primary)" : "var(--text-secondary)",
                borderBottom: tab === t ? "2px solid var(--accent-blue)" : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              {t === "generate" ? "Question Generation" : t === "settings" ? "Settings" : "Database"}
            </button>
          ))}
        </div>

        {tab === "generate" && <GenerateTab />}
        {tab === "settings" && <SettingsTab />}
        {tab === "database" && <DatabaseTab />}
      </div>

      <Footer />
    </div>
  );
}

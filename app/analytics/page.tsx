import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ScoreTrendCard from "../components/analytics/ScoreTrendCard";
import SectionBreakdownCard from "../components/analytics/SectionBreakdownCard";
import TopicAccuracyCard from "../components/analytics/TopicAccuracyCard";
import WeakTopicsCard from "../components/analytics/WeakTopicsCard";
import TimePerQuestionCard from "../components/analytics/TimePerQuestionCard";
import RecentActivityCard from "../components/analytics/RecentActivityCard";
import TimeBarCard from "../components/analytics/TimeBarCard";
import ErrorTypesCard from "../components/analytics/ErrorTypesCard";

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-1">
            <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
              Analytics
            </h1>
            <span
              className="text-sm font-semibold px-3 py-1.5 rounded-lg"
              style={{ border: "1px solid var(--border)", color: "var(--text-primary)" }}
            >
              Answered: <strong>2,350</strong>
            </span>
          </div>
          <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
            Track your full-length practice test progress over time.
          </p>

          {/* Card grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ScoreTrendCard />
            <SectionBreakdownCard />
            <TopicAccuracyCard />
            <WeakTopicsCard />
            <TimePerQuestionCard />
            <RecentActivityCard />
            <TimeBarCard />
            <ErrorTypesCard />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

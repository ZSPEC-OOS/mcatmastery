import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import AnalyticsDashboard from "../components/analytics/AnalyticsDashboard";

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between mb-1">
            <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>Analytics</h1>
          </div>
          <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
            Track your full-length practice test progress over time.
          </p>
          <AnalyticsDashboard />
        </div>
      </main>
      <Footer />
    </div>
  );
}

import Navbar from "./components/Navbar";
import HeroBanner from "./components/HeroBanner";
import TaskList from "./components/TaskList";
import PerformanceSidebar from "./components/PerformanceSidebar";
import QuickAccess from "./components/QuickAccess";
import Footer from "./components/Footer";

export default function Dashboard() {
  return (
    <>
      <Navbar />
      <HeroBanner />

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Today's Tasks */}
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                Today&apos;s Tasks
              </h2>
              <TaskList />
            </div>

            {/* Performance sidebar */}
            <div className="lg:w-72 flex-shrink-0">
              <PerformanceSidebar />
            </div>
          </div>
        </div>

        <QuickAccess />
      </main>

      <Footer />
    </>
  );
}

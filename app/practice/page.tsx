import Navbar from "../components/Navbar";
import PracticeToolbar from "../components/practice/PracticeToolbar";
import PassagePanel from "../components/practice/PassagePanel";
import QuestionView from "../components/practice/QuestionView";
import Footer from "../components/Footer";

export default function PracticePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <PracticeToolbar />
      <div className="flex flex-1 overflow-hidden">
        <PassagePanel />
        <QuestionView />
      </div>
      <Footer />
    </div>
  );
}

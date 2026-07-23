import { Routes, Route } from "react-router-dom";
import Dashboard from "../pages/Dashboard/Dashboard";
import AIAnalysis from "../pages/AIAnalysis/AIAnalysis";
import FeedbackRepository from "../pages/Repository/FeedbackRepository";
import FeedbackCollection from "../pages/FeedbackCollection/FeedbackCollection";
import TrainerInsights from "../pages/TrainerInsights/TrainerInsights";
import CourseInsights from "../pages/CourseInsights/CourseInsights";
import BatchInsights from "../pages/BatchInsights/BatchInsights";
import Reports from "../pages/Reports/Reports";
import ActionTracker from "../pages/ActionTracker/ActionTracker";
import Notifications from "../pages/Notifications/Notifications";
import AIRecommendations from "../pages/AIRecommendations/AIRecommendations";
import Integrations from "../pages/Integrations/Integrations";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/ai-analysis" element={<AIAnalysis />} />
      <Route path="/ai-recommendations" element={<AIRecommendations />} />
      <Route path="/repository" element={<FeedbackRepository />} />
      <Route path="/collection" element={<FeedbackCollection />} />
      <Route path="/trainer-insights" element={<TrainerInsights />} />
      <Route path="/course-insights" element={<CourseInsights />} />
      <Route path="/batch-insights" element={<BatchInsights />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/action-tracker" element={<ActionTracker />} />
      <Route path="/integrations" element={<Integrations />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="*" element={<Dashboard />} />
    </Routes>
  );
}

export default AppRoutes;
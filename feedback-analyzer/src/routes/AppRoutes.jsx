import { Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/Login/Login";
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
import ProtectedRoute from "../components/auth/ProtectedRoute";
import { ROUTE_CAPS, firstAccessiblePath } from "../lib/permissions";
import { useAuth } from "../context/AuthContext";

const guard = (path, element) => (
  <ProtectedRoute caps={ROUTE_CAPS[path] || []}>{element}</ProtectedRoute>
);

// Send unknown paths to whatever the current role can actually open.
function LandingRedirect() {
  const { user } = useAuth();
  return <Navigate to={firstAccessiblePath(user?.role)} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={guard("/", <Dashboard />)} />
      <Route path="/ai-analysis" element={guard("/ai-analysis", <AIAnalysis />)} />
      <Route path="/ai-recommendations" element={guard("/ai-recommendations", <AIRecommendations />)} />
      <Route path="/repository" element={guard("/repository", <FeedbackRepository />)} />
      <Route path="/collection" element={guard("/collection", <FeedbackCollection />)} />
      <Route path="/trainer-insights" element={guard("/trainer-insights", <TrainerInsights />)} />
      <Route path="/course-insights" element={guard("/course-insights", <CourseInsights />)} />
      <Route path="/batch-insights" element={guard("/batch-insights", <BatchInsights />)} />
      <Route path="/reports" element={guard("/reports", <Reports />)} />
      <Route path="/action-tracker" element={guard("/action-tracker", <ActionTracker />)} />
      <Route path="/integrations" element={guard("/integrations", <Integrations />)} />
      <Route path="/notifications" element={guard("/notifications", <Notifications />)} />

      <Route path="*" element={<ProtectedRoute><LandingRedirect /></ProtectedRoute>} />
    </Routes>
  );
}

export default AppRoutes;

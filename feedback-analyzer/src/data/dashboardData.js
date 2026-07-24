export const navItems = [
  { id: "dashboard", label: "Dashboard", path: "/", icon: "bi-grid-fill" },
  { id: "repository", label: "Feedback Repository", path: "/repository", icon: "bi-archive-fill" },
  { id: "ai-analysis", label: "AI Analysis", path: "/ai-analysis", icon: "bi-stars" },
  { id: "ai-recommendations", label: "AI Recommendations", path: "/ai-recommendations", icon: "bi-lightbulb-fill" },
  { id: "collection", label: "Feedback Collection", path: "/collection", icon: "bi-file-earmark-plus" },
  { id: "trainer-insights", label: "Trainer Insights", path: "/trainer-insights", icon: "bi-person-workspace" },
  { id: "course-insights", label: "Course Insights", path: "/course-insights", icon: "bi-mortarboard-fill" },
  { id: "batch-insights", label: "Batch & Student Insights", path: "/batch-insights", icon: "bi-collection-fill" },
  { id: "action-tracker", label: "Action Tracker", path: "/action-tracker", icon: "bi-list-check" },
  { id: "reports", label: "Reports Generator", path: "/reports", icon: "bi-file-earmark-text-fill" },
  { id: "integrations", label: "Integrations", path: "/integrations", icon: "bi-plug-fill" },
  { id: "notifications", label: "Notifications", path: "/notifications", icon: "bi-bell-fill" },
];

export const statCardValues = {
  "total-feedback": { value: "0", change: "0%", changeLabel: "vs last month", trend: "up" },
  "average-rating": { value: "0.0", valueSuffix: "/ 5", change: "0%", changeLabel: "vs last month", trend: "up" },
  "satisfaction-score": { value: "0%", change: "0%", changeLabel: "vs last month", trend: "up" },
  "positive-feedback": { value: "0%", change: "0%", changeLabel: "vs last month", trend: "up" },
  "response-rate": { value: "0%", change: "0%", changeLabel: "vs last month", trend: "up" },
};

export const feedbackTrend = [];
export const sentimentDistribution = [];
export const topAppreciatedTopics = [];
export const topImprovementAreas = [];
export const recentFeedback = [];
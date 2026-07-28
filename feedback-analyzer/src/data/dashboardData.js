export const navItems = [
  { id: "dashboard", label: "Dashboard", path: "/", icon: "bi-grid-fill" },
  { id: "repository", label: "Feedback Repository", path: "/repository", icon: "bi-archive-fill" },
  { id: "ai-analysis", label: "AI Analysis", path: "/ai-analysis", icon: "bi-stars" },
  { id: "trainer-insights", label: "Trainer Insights", path: "/trainer-insights", icon: "bi-person-workspace" },
  { id: "course-insights", label: "Course Insights", path: "/course-insights", icon: "bi-mortarboard-fill" },
  { id: "action-tracker", label: "Action Tracker", path: "/action-tracker", icon: "bi-list-check" },
  { id: "reports", label: "Reports Generator", path: "/reports", icon: "bi-file-earmark-text-fill" },
  // Sidebar filters by capability, so this only appears for Super Admin and ACE Lead.
  { id: "users", label: "User Management", path: "/users", icon: "bi-people-fill" },
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
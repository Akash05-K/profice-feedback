export const statCardValues = {
  "total-feedback": {
    value: "1000",
    change: "9%",
    changeLabel: "vs last month",
    trend: "up",
  },
  "average-rating": {
    value: "4.33",
    valueSuffix: "/ 5",
    change: "8.2%",
    changeLabel: "vs last month",
    trend: "up",
  },
  "satisfaction-score": {
    value: "70%",
    change: "10%",
    changeLabel: "vs last month",
    trend: "up",
  },
  "positive-feedback": {
    value: "70%",
    change: "5.6%",
    changeLabel: "vs last month",
    trend: "up",
  },
  "response-rate": {
    value: "90%",
    change: "7.1%",
    changeLabel: "vs last month",
    trend: "down",
  },
};

export const feedbackTrend = [
  { month: "Jan", feedback: 620 },
  { month: "Feb", feedback: 860 },
  { month: "Mar", feedback: 1040 },
  { month: "Apr", feedback: 1180 },
  { month: "May", feedback: 1360 },
  { month: "Jun", feedback: 1642 },
  { month: "Jul", feedback: 1720 },
  { month: "Aug", feedback: 1855 },
  { month: "Sep", feedback: 1980 },
  { month: "Oct", feedback: 2145 },
  { month: "Nov", feedback: 2290 },
  { month: "Dec", feedback: 2450 },
];

export const sentimentDistribution = [
  { name: "Positive", value: 70, count: "8,720", color: "#16A34A" },
  { name: "Neutral", value: 20, count: "2,491", color: "#F59E0B" },
  { name: "Negative", value: 10, count: "1,247", color: "#EF4444" },
  { name: "Mixed", value: 5, count: "624", color: "#94A3B8" },
];

export const topAppreciatedTopics = [
  { rank: 1, label: "Teaching", value: 80 },
  { rank: 2, label: "Notes", value: 76 },
  { rank: 3, label: "Labs", value: 72 },
  { rank: 4, label: "Projects", value: 68 },
  { rank: 5, label: "Support", value: 65 },
];

export const topImprovementAreas = [
  { rank: 1, label: "Labs", value: 62 },
  { rank: 2, label: "Doubt Support", value: 48 },
  { rank: 3, label: "Notes", value: 41 },
  { rank: 4, label: "Classroom", value: 36 },
  { rank: 5, label: "Timetable", value: 28 },
];

export const recentFeedback = [
  {
    id: "fb-1",
    sentiment: "positive",
    text: "The teaching methodology is excellent, and the concepts are explained very clearly with practical examples.",
    author: "M.Sc TCS",
  },
  {
    id: "fb-2",
    sentiment: "positive",
    text: "The course content is up-to-date and the hands-on sessions greatly improved my understanding.",
    author: "M.Sc Data Science",
  },
];

export const navItems = [
  { id: "dashboard", label: "Dashboard", icon: "bi-grid-1x2-fill", path: "/" },
  { id: "repository", label: "Feedback Repository", icon: "bi-archive-fill", path: "/repository" },
  { id: "feedback-collection", label: "Feedback Collection", icon: "bi-plus-square-fill", path: "/collection" },
  { id: "ai-analysis", label: "AI Analysis", icon: "bi-cpu-fill", path: "/ai-analysis" },
  { id: "ai-recommendations", label: "AI Recommendations", icon: "bi-stars", path: "/ai-recommendations" },
  { id: "trainer-insights", label: "Trainer Insights", icon: "bi-person-workspace", path: "/trainer-insights" },
  { id: "course-insights", label: "Course Insights", icon: "bi-mortarboard-fill", path: "/course-insights" },
  { id: "batch-insights", label: "Batch Insights", icon: "bi-collection-fill", path: "/batch-insights" },
  { id: "reports", label: "Reports", icon: "bi-file-earmark-bar-graph-fill", path: "/reports" },
  { id: "action-tracker", label: "Action Tracker", icon: "bi-list-check", path: "/action-tracker" },
  { id: "integrations", label: "Integrations", icon: "bi-link-45deg", path: "/integrations" },
  { id: "notifications", label: "Notifications", icon: "bi-bell-fill", path: "/notifications" },
];
import axios from "axios";

const API = axios.create({
  baseURL: "/api/v1",
  timeout: 30000,
});

// Request interceptor: attach the JWT from storage on every call.
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("pf_token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: unwrap body, and on 401 clear the session + bounce to login.
API.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";
    if (status === 401 && !url.includes("/auth/login")) {
      localStorage.removeItem("pf_token");
      localStorage.removeItem("pf_user");
      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }
    const message = error.response?.data?.message || error.message || "An error occurred";
    return Promise.reject(new Error(message));
  }
);

export const api = {
  // Auth
  login: (credentials) => API.post("/auth/login", credentials),
  register: (data) => API.post("/auth/register", data),
  getMe: () => API.get("/auth/me"),

  // AI / RAG
  getAiDashboardSummary: () => API.get("/ai/dashboard-summary"),
  getAiRecommendations: (params) => API.get("/ai/recommendations", { params }),
  aiChat: (payload) => API.post("/ai/chat", payload),

  // Upload
  uploadExcel: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return API.post("/upload/analyze", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  getUploadSessions: () => API.get("/upload/sessions"),
  getUploadSessionAnalysis: (id) => API.get(`/upload/sessions/${id}/analysis`),
  deleteUploadSession: (id) => API.delete(`/upload/sessions/${id}`),



  // Dashboard
  getDashboardStats: () => API.get("/dashboard/stats"),
  getDashboardTrends: () => API.get("/dashboard/trends"),
  getSentimentDistribution: () => API.get("/dashboard/sentiment"),
  getTopTopics: () => API.get("/dashboard/topics"),
  getRecentFeedback: () => API.get("/dashboard/recent"),

  // Feedback Repository
  getFeedbackRecords: (params) => API.get("/feedback", { params }),
  getFeedbackStats: () => API.get("/feedback/stats"),
  getFeedbackFilterOptions: (params) => API.get("/feedback/filter-options", { params }),
  getFeedbackById: (id) => API.get(`/feedback/${id}`),
  toggleFeedbackStatus: (id) => API.patch(`/feedback/${id}/toggle-status`),
  deleteFeedback: (id) => API.delete(`/feedback/${id}`),
  bulkActionFeedback: (data) => API.post("/feedback/bulk-action", data),
  exportFeedback: (params) =>
    API.get("/feedback/export", {
      params,
      responseType: "blob",
    }),

  // Trainers
  getTrainerFilterOptions: (params) => API.get("/trainers/filter-options", { params }),
  getTrainers: (params) => API.get("/trainers", { params: typeof params === "string" ? { college: params } : params }),
  getTrainerMetrics: (id, params) => API.get(`/trainers/${id}/metrics`, { params }),


  // Courses
  getCourseFilterOptions: (params) => API.get("/courses/filter-options", { params }),
  getCourses: (college) => API.get("/courses", { params: { college } }),
  getCourseMetrics: (id, params) => API.get(`/courses/${id}/metrics`, { params }),


  // Batches
  getBatches: () => API.get("/batches"),
  getBatchStats: () => API.get("/batches/stats"),

  // Action Tracker
  getActions: (params) => API.get("/actions", { params }),
  getActionStats: () => API.get("/actions/stats"),
  getActionById: (id) => API.get(`/actions/${id}`),
  createAction: (data) => API.post("/actions", data),
  updateAction: (id, data) => API.put(`/actions/${id}`, data),
  deleteAction: (id) => API.delete(`/actions/${id}`),

  // Notifications
  getNotifications: (params) => API.get("/notifications", { params }),
  getNotificationsSummary: () => API.get("/notifications/summary"),
  toggleNotificationRead: (id) => API.patch(`/notifications/${id}/toggle-read`),
  markAllNotificationsRead: () => API.post("/notifications/mark-all-read"),
  deleteNotification: (id) => API.delete(`/notifications/${id}`),
  createNotification: (data) => API.post("/notifications", data),
  getNotificationPreferences: () => API.get("/notifications/preferences"),
  updateNotificationPreferences: (data) => API.put("/notifications/preferences", data),

  // Reports
  getReportsData: (params) => API.get("/reports/data", { params }),
  exportReportsPdf: (params) =>
    API.get("/reports/export/pdf", { params, responseType: "blob" }),
  exportReportsExcel: (params) =>
    API.get("/reports/export/excel", { params, responseType: "blob" }),
  exportReportsCsv: (params) =>
    API.get("/reports/export/csv", { params, responseType: "blob" }),
};

export default api;

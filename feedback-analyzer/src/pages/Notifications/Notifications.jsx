import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import AppLayout from "../../components/layout/AppLayout";
import NotificationsHistoryTable from "../../components/tables/NotificationsHistoryTable";
import Pagination from "../../components/widgets/Pagination";
import api from "../../services/api";
import { initialSettings as fallbackSettings, initialLogs as fallbackLogs } from "../../data/notificationsData";

const PAGE_SIZE = 4;

const recipientOptions = [
  "Karthik S (Trainer)",
  "Priya N (Trainer)",
  "Arjun D (Trainer)",
  "Meera J (Trainer)",
  "All Trainers",
  "All Users",
  "Admin",
  "Management",
];

function Notifications() {
  const [settings, setSettings] = useState(fallbackSettings);
  const [logs, setLogs] = useState(fallbackLogs);
  const [totalItems, setTotalItems] = useState(fallbackLogs.length);
  const [totalPages, setTotalPages] = useState(1);
  const [summaryMetrics, setSummaryMetrics] = useState({
    total: 120,
    unread: 5,
    alerts: 10,
    inAppCount: 54,
    emailCount: 40,
    alertCount: 10,
  });

  const [filterTab, setFilterTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch notifications list and summary
  const fetchNotificationsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [logsRes, summaryRes, prefsRes] = await Promise.allSettled([
        api.getNotifications({ filterTab, page: currentPage, limit: PAGE_SIZE }),
        api.getNotificationsSummary(),
        api.getNotificationPreferences(),
      ]);

      if (logsRes.status === "fulfilled" && logsRes.value.data) {
        setLogs(logsRes.value.data);
        setTotalItems(logsRes.value.pagination.total);
        setTotalPages(logsRes.value.pagination.totalPages);
      }
      if (summaryRes.status === "fulfilled" && summaryRes.value.data) {
        setSummaryMetrics(summaryRes.value.data);
      }
      if (prefsRes.status === "fulfilled" && prefsRes.value.data) {
        setSettings(prefsRes.value.data);
      }
    } catch (e) {
      console.error("Fetch notifications error:", e);
    } finally {
      setIsLoading(false);
    }
  }, [filterTab, currentPage]);

  useEffect(() => {
    fetchNotificationsData();
  }, [fetchNotificationsData]);

  const handleToggle = async (key) => {
    const updatedSettings = { ...settings, [key]: !settings[key] };
    setSettings(updatedSettings);

    const friendlyName = key
      .replace("Enabled", "")
      .replace("email", "Email")
      .replace("inApp", "In-App")
      .replace("reminders", "Reminder Alerts")
      .replace("summaryWeekly", "Weekly Summary");

    toast.info(`${friendlyName} ${updatedSettings[key] ? "enabled" : "disabled"}.`);

    try {
      await api.updateNotificationPreferences(updatedSettings);
    } catch (e) {
      console.error("Update preferences error:", e);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      toast.success("All notifications marked as read.");
      fetchNotificationsData();
    } catch (e) {
      toast.error(e.message || "Failed to mark all as read.");
    }
  };

  const handleToggleRead = async (id) => {
    try {
      const res = await api.toggleNotificationRead(id);
      toast.success(`Marked as ${res.data.read ? "read" : "unread"}.`);
      fetchNotificationsData();
    } catch (e) {
      toast.error(e.message || "Failed to toggle read status.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteNotification(id);
      toast.success("Notification deleted.");
      fetchNotificationsData();
    } catch (e) {
      toast.error(e.message || "Failed to delete notification.");
    }
  };

  return (
    <AppLayout title="Notifications">
      {/* Top Filter Tabs Bar */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div className="notifications-filter-bar">
          <button
            type="button"
            className={`notifications-filter-btn ${filterTab === "all" ? "notifications-filter-btn--active" : ""}`}
            onClick={() => { setFilterTab("all"); setCurrentPage(1); }}
          >
            All
          </button>
          <button
            type="button"
            className={`notifications-filter-btn ${filterTab === "unread" ? "notifications-filter-btn--active" : ""}`}
            onClick={() => { setFilterTab("unread"); setCurrentPage(1); }}
          >
            Unread
          </button>
          <button
            type="button"
            className={`notifications-filter-btn ${filterTab === "email" ? "notifications-filter-btn--active" : ""}`}
            onClick={() => { setFilterTab("email"); setCurrentPage(1); }}
          >
            Email
          </button>
          <button
            type="button"
            className={`notifications-filter-btn ${filterTab === "in-app" ? "notifications-filter-btn--active" : ""}`}
            onClick={() => { setFilterTab("in-app"); setCurrentPage(1); }}
          >
            In-App
          </button>
          <button
            type="button"
            className={`notifications-filter-btn ${filterTab === "alert" ? "notifications-filter-btn--active" : ""}`}
            onClick={() => { setFilterTab("alert"); setCurrentPage(1); }}
          >
            Alerts
          </button>
        </div>

        <div className="d-flex align-items-center gap-3">
          <button
            type="button"
            className="btn bg-transparent border-0 text-primary fw-semibold p-0"
            style={{ fontSize: "0.85rem", cursor: "pointer", textDecoration: "none" }}
            onClick={handleMarkAllAsRead}
          >
            Mark all as read
          </button>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="row g-4">
        {/* Left Column: Notification Table List */}
        <div className="col-lg-8">
          <div className="panel p-0 overflow-hidden" style={{ background: "#fff", border: "1px solid var(--color-border)" }}>
            {isLoading ? (
              <div className="p-4 text-center text-muted">
                <div className="spinner-border text-primary me-2" role="status" />
                <span>Loading notifications...</span>
              </div>
            ) : (
              <>
                <NotificationsHistoryTable
                  rows={logs}
                  onToggleRead={handleToggleRead}
                  onDelete={handleDelete}
                />
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={totalItems}
                  pageSize={PAGE_SIZE}
                />
              </>
            )}
          </div>
        </div>

        {/* Right Column: Widgets */}
        <div className="col-lg-4 d-flex flex-column gap-4">
          {/* Notification Summary Widget */}
          <div className="panel" style={{ padding: "20px" }}>
            <h3 className="fw-bold mb-3" style={{ fontSize: "0.95rem", color: "var(--color-text-primary)" }}>
              Notification Summary
            </h3>
            <div className="d-flex flex-column gap-3">
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-bell-fill text-primary" />
                  <span style={{ fontSize: "0.85rem" }}>Total Notifications</span>
                </div>
                <strong style={{ fontSize: "0.85rem" }}>{summaryMetrics.total}</strong>
              </div>
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-envelope-fill text-warning" />
                  <span style={{ fontSize: "0.85rem" }}>Email Delivered</span>
                </div>
                <strong style={{ fontSize: "0.85rem" }}>{summaryMetrics.emailCount}</strong>
              </div>
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-chat-left-text-fill text-info" />
                  <span style={{ fontSize: "0.85rem" }}>In-App Messages</span>
                </div>
                <strong style={{ fontSize: "0.85rem" }}>{summaryMetrics.inAppCount}</strong>
              </div>
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-exclamation-triangle-fill text-danger" />
                  <span style={{ fontSize: "0.85rem" }}>Critical Alerts</span>
                </div>
                <strong style={{ fontSize: "0.85rem" }}>{summaryMetrics.alerts}</strong>
              </div>
            </div>
          </div>

          {/* Preferences Widget */}
          <div className="panel" style={{ padding: "20px" }}>
            <h3 className="fw-bold mb-3" style={{ fontSize: "0.95rem", color: "var(--color-text-primary)" }}>
              Channel Preferences
            </h3>
            <div className="d-flex flex-column gap-3">
              <div className="d-flex align-items-center justify-content-between">
                <span style={{ fontSize: "0.85rem" }}>Email Notifications</span>
                <div className="form-check form-switch m-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={settings.emailEnabled}
                    onChange={() => handleToggle("emailEnabled")}
                  />
                </div>
              </div>
              <div className="d-flex align-items-center justify-content-between">
                <span style={{ fontSize: "0.85rem" }}>In-App Notifications</span>
                <div className="form-check form-switch m-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={settings.inAppEnabled}
                    onChange={() => handleToggle("inAppEnabled")}
                  />
                </div>
              </div>
              <div className="d-flex align-items-center justify-content-between">
                <span style={{ fontSize: "0.85rem" }}>Reminder Alerts</span>
                <div className="form-check form-switch m-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={settings.remindersEnabled}
                    onChange={() => handleToggle("remindersEnabled")}
                  />
                </div>
              </div>
              <div className="d-flex align-items-center justify-content-between">
                <span style={{ fontSize: "0.85rem" }}>Weekly Summary</span>
                <div className="form-check form-switch m-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={settings.summaryWeeklyEnabled}
                    onChange={() => handleToggle("summaryWeeklyEnabled")}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default Notifications;

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import AppLayout from "../../components/layout/AppLayout";
import DataTable from "../../components/tables/DataTable";
import Pagination from "../../components/widgets/Pagination";
import api from "../../services/api";
import { initialSettings as fallbackSettings, initialLogs as fallbackLogs } from "../../data/notificationsData";

const PAGE_SIZE = 4;

const typeMeta = {
  email: { label: "Email", tone: "blue" },
  "in-app": { label: "In-App", tone: "green" },
  alert: { label: "Alert", tone: "red" },
  reminder: { label: "Alert", tone: "red" },
  summary: { label: "Email", tone: "blue" },
};

const TYPE_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "in-app", label: "In-App" },
  { value: "alert", label: "Alert" },
];

const READ_OPTIONS = [
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
];

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
    total: 0,
    unread: 0,
    alerts: 0,
    inAppCount: 0,
    emailCount: 0,
    alertCount: 0,
  });

  const [filters, setFilters] = useState({});
  const [sort, setSort] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Every column filter maps to a server query param so paging stays correct.
  const queryParams = useMemo(
    () => ({
      message: filters.message || undefined,
      type: filters.type || undefined,
      read: filters.read || undefined,
      startDate: filters.time?.from || undefined,
      endDate: filters.time?.to || undefined,
      sortBy: sort ? `${sort.key}-${sort.dir}` : undefined,
    }),
    [filters, sort]
  );

  // Fetch notifications list and summary
  const fetchNotificationsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [logsRes, summaryRes, prefsRes] = await Promise.allSettled([
        api.getNotifications({ ...queryParams, page: currentPage, limit: PAGE_SIZE }),
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
  }, [queryParams, currentPage]);

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

  const columns = useMemo(
    () => [
      {
        key: "message",
        label: "Notification",
        filter: { type: "text", placeholder: "Message contains…" },
        render: (row) => (
          <div className="d-flex align-items-center gap-3">
            <span
              className={`activity-list__icon activity-list__icon--${row.tone || "blue"}`}
              style={{ width: "32px", height: "32px", fontSize: "0.9rem" }}
            >
              <i className={`bi ${row.icon || "bi-bell-fill"}`} />
            </span>
            <span
              className="notification-message-text"
              style={{
                fontWeight: row.read ? 400 : 600,
                color: row.read ? "var(--color-text-secondary)" : "var(--color-text-primary)",
                fontSize: "0.86rem",
              }}
            >
              {row.message}
            </span>
          </div>
        ),
      },
      {
        key: "type",
        label: "Type",
        width: "120px",
        filter: { type: "select", options: TYPE_OPTIONS, anyLabel: "All Types" },
        render: (row) => {
          const meta = typeMeta[row.type] || typeMeta["in-app"];
          return <span className={`badge-pill badge-pill--${meta.tone}`}>{meta.label}</span>;
        },
      },
      {
        key: "read",
        label: "Status",
        width: "110px",
        accessor: (row) => (row.read ? "read" : "unread"),
        filter: { type: "select", options: READ_OPTIONS, anyLabel: "Read & Unread" },
        render: (row) => (
          <span className={`badge-pill badge-pill--${row.read ? "green" : "amber"}`}>
            {row.read ? "Read" : "Unread"}
          </span>
        ),
      },
      {
        key: "time",
        label: "Time",
        width: "140px",
        accessor: (row) => row.createdAt,
        sortType: "date",
        filter: { type: "date", label: "Received" },
        cellStyle: { fontSize: "0.82rem", color: "var(--color-text-secondary)" },
        render: (row) => row.time,
      },
      {
        key: "actions",
        label: "Actions",
        sortable: false,
        width: "100px",
        headerClassName: "data-table__actions-col",
        render: (row) => (
          <div className="data-table__actions">
            <button
              type="button"
              className="table-icon-btn"
              aria-label={row.read ? "Mark as unread" : "Mark as read"}
              title={row.read ? "Mark as unread" : "Mark as read"}
              onClick={() => handleToggleRead(row.id)}
            >
              <i className={`bi ${row.read ? "bi-envelope" : "bi-envelope-open"}`} />
            </button>
            <button
              type="button"
              className="table-icon-btn"
              aria-label="Delete notification"
              title="Delete notification"
              style={{ color: "var(--color-danger)" }}
              onClick={() => handleDelete(row.id)}
            >
              <i className="bi bi-trash" />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <AppLayout title="Notifications">
      {/* Main Layout Grid */}
      <div className="row g-4">
        {/* Left Column: Notification Table List */}
        <div className="col-lg-8">
          <div className="panel p-0 overflow-hidden" style={{ background: "#fff", border: "1px solid var(--color-border)" }}>
            <DataTable
              title="Notification History"
              count={totalItems}
              columns={columns}
              rows={logs}
              isLoading={isLoading}
              getRowKey={(row) => row.id}
              emptyTitle="No notifications"
              emptyMessage="No notifications match your filters."
              rowStyle={(row) => ({
                background: row.read ? "transparent" : "rgba(37, 99, 235, 0.02)",
                borderLeft: `3px solid ${row.read ? "transparent" : "var(--color-primary)"}`,
              })}
              filters={filters}
              onFiltersChange={(next) => {
                setFilters(next);
                setCurrentPage(1);
              }}
              sort={sort}
              onSortChange={(next) => {
                setSort(next);
                setCurrentPage(1);
              }}
              toolbarActions={
                <button
                  type="button"
                  className="btn bg-transparent border-0 text-primary fw-semibold p-0 px-2"
                  style={{ fontSize: "0.8rem", cursor: "pointer" }}
                  onClick={handleMarkAllAsRead}
                >
                  Mark all as read
                </button>
              }
              footer={
                !isLoading ? (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={totalItems}
                    pageSize={PAGE_SIZE}
                  />
                ) : null
              }
            />
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

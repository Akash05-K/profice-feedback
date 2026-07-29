import { useState, useEffect } from "react";
import api from "../../services/api";

const statusConfig = {
  open: { label: "Open", tone: "blue", icon: "bi-dash-circle" },
  "in-progress": { label: "In Progress", tone: "amber", icon: "bi-arrow-repeat" },
  in_progress: { label: "In Progress", tone: "amber", icon: "bi-arrow-repeat" },
  completed: { label: "Completed", tone: "green", icon: "bi-check-circle-fill" },
  overdue: { label: "Overdue", tone: "red", icon: "bi-exclamation-triangle-fill" },
};

const priorityConfig = {
  high: { label: "High Priority", tone: "red" },
  medium: { label: "Medium Priority", tone: "amber" },
  low: { label: "Low Priority", tone: "slate" },
};

function ActionAlertModal({ isOpen, onClose, user }) {
  const [actions, setActions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    api
      .getActions({ limit: 50 })
      .then((res) => {
        if (!isMounted) return;
        if (res && res.data) {
          setActions(res.data);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Error fetching assigned actions:", err);
        setError("Failed to load assigned actions. Please try again.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const openCount = actions.filter((a) => a.status === "open").length;
  const inProgressCount = actions.filter((a) => a.status === "in-progress" || a.status === "in_progress").length;
  const completedCount = actions.filter((a) => a.status === "completed").length;
  const overdueCount = actions.filter((a) => a.status === "overdue").length;

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{ backgroundColor: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", zIndex: 1060 }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div
          className="modal-content border-0 shadow-lg"
          style={{ borderRadius: "20px", overflow: "hidden", background: "#ffffff" }}
        >
          {/* Header */}
          <div
            className="modal-header border-0 px-4 pt-4 pb-3"
            style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)", color: "#fff" }}
          >
            <div>
              <div className="d-flex align-items-center gap-2">
                <div
                  className="d-flex align-items-center justify-content-center"
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "rgba(37, 99, 235, 0.25)",
                    color: "#60a5fa",
                  }}
                >
                  <i className="bi bi-bell-fill fs-5" />
                </div>
                <h5 className="modal-title fw-bold text-white mb-0" style={{ fontSize: "1.15rem" }}>
                  Assigned Actions & Tracker
                </h5>
              </div>
              <p className="mb-0 mt-1" style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
                Action items assigned to you by Program Manager or ACE Lead
              </p>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
              aria-label="Close"
            />
          </div>

          {/* Quick Summary Pill Bar */}
          <div className="px-4 py-3 bg-light border-bottom d-flex align-items-center gap-3 flex-wrap">
            <span className="badge bg-white text-dark border px-3 py-2 rounded-pill shadow-sm" style={{ fontSize: "0.78rem" }}>
              Total: <strong>{actions.length}</strong>
            </span>
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2 rounded-pill" style={{ fontSize: "0.78rem" }}>
              Open: <strong>{openCount}</strong>
            </span>
            <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-3 py-2 rounded-pill" style={{ fontSize: "0.78rem" }}>
              In Progress: <strong>{inProgressCount}</strong>
            </span>
            <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 rounded-pill" style={{ fontSize: "0.78rem" }}>
              Completed: <strong>{completedCount}</strong>
            </span>
            {overdueCount > 0 && (
              <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-3 py-2 rounded-pill" style={{ fontSize: "0.78rem" }}>
                Overdue: <strong>{overdueCount}</strong>
              </span>
            )}
          </div>

          {/* Body */}
          <div className="modal-body p-4" style={{ maxHeight: "65vh", overflowY: "auto" }}>
            {isLoading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2 text-muted" style={{ fontSize: "0.85rem" }}>
                  Fetching assigned action items...
                </p>
              </div>
            ) : error ? (
              <div className="alert alert-danger mb-0" role="alert">
                <i className="bi bi-exclamation-triangle-fill me-2" />
                {error}
              </div>
            ) : actions.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-check2-circle text-success" style={{ fontSize: "3rem" }} />
                <h6 className="fw-semibold mt-3">No Action Items Assigned</h6>
                <p className="text-muted mb-0" style={{ fontSize: "0.85rem" }}>
                  You currently have no pending or active action items assigned by leadership.
                </p>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {actions.map((item) => {
                  const statusMeta = statusConfig[item.status] || statusConfig.open;
                  const priorityMeta = priorityConfig[item.priority] || priorityConfig.medium;
                  const assignerText =
                    item.assignedBy ||
                    (user?.program ? `${user.program} Program Manager / ACE Lead` : "Program Manager / ACE Lead");

                  return (
                    <div
                      key={item.id}
                      className="card border shadow-sm p-3"
                      style={{
                        borderRadius: "14px",
                        borderLeft: `4px solid ${
                          statusMeta.tone === "green"
                            ? "#059669"
                            : statusMeta.tone === "amber"
                            ? "#ea580c"
                            : statusMeta.tone === "red"
                            ? "#dc2626"
                            : "#2563eb"
                        }`,
                      }}
                    >
                      <div className="d-flex align-items-start justify-content-between gap-2 flex-wrap mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <span
                            className="badge bg-secondary-subtle text-secondary border px-2 py-1"
                            style={{ fontSize: "0.75rem", fontFamily: "monospace", borderRadius: "6px" }}
                          >
                            {item.id}
                          </span>
                          <h6 className="fw-bold mb-0" style={{ fontSize: "0.95rem", color: "var(--color-text-primary)" }}>
                            {item.title}
                          </h6>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <span className={`badge-pill badge-pill--${priorityMeta.tone}`} style={{ fontSize: "0.72rem" }}>
                            {priorityMeta.label}
                          </span>
                          <span className={`badge-pill badge-pill--${statusMeta.tone}`} style={{ fontSize: "0.75rem", fontWeight: "600" }}>
                            <i className={`bi ${statusMeta.icon} me-1`} />
                            {statusMeta.label}
                          </span>
                        </div>
                      </div>

                      {/* Assigner & Due Date info */}
                      <div className="d-flex align-items-center gap-4 text-muted mb-3 flex-wrap" style={{ fontSize: "0.8rem" }}>
                        <div className="d-flex align-items-center gap-1 text-dark fw-medium">
                          <i className="bi bi-person-badge text-primary" />
                          <span>Assigned by:</span>
                          <span className="badge bg-light text-primary border">{assignerText}</span>
                        </div>
                        <div className="d-flex align-items-center gap-1">
                          <i className="bi bi-calendar-event text-secondary" />
                          <span>Due Date:</span>
                          <strong className="text-dark">{item.dueDate || "N/A"}</strong>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-2">
                        <div className="d-flex align-items-center justify-content-between mb-1" style={{ fontSize: "0.78rem" }}>
                          <span className="text-muted fw-medium">Progress</span>
                          <span className="fw-bold text-dark">{item.progress || 0}%</span>
                        </div>
                        <div className="progress" style={{ height: "6px", borderRadius: "999px", background: "#e2e8f0" }}>
                          <div
                            className={`progress-bar bg-${
                              statusMeta.tone === "green"
                                ? "success"
                                : statusMeta.tone === "amber"
                                ? "warning"
                                : statusMeta.tone === "red"
                                ? "danger"
                                : "primary"
                            }`}
                            role="progressbar"
                            style={{ width: `${item.progress || 0}%`, borderRadius: "999px" }}
                            aria-valuenow={item.progress || 0}
                            aria-valuemin="0"
                            aria-valuemax="100"
                          />
                        </div>
                      </div>

                      {/* Notes / Remarks */}
                      {item.notes ? (
                        <div
                          className="mt-2 p-2 bg-light rounded text-secondary border-start border-3 border-info"
                          style={{ fontSize: "0.8rem", background: "#f8fafc" }}
                        >
                          <div className="fw-semibold text-dark mb-1" style={{ fontSize: "0.75rem" }}>
                            <i className="bi bi-chat-left-text me-1 text-info" />
                            Manager Remarks / Instructions:
                          </div>
                          <p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>
                            {item.notes}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer border-top px-4 py-3 bg-light d-flex justify-content-between align-items-center">
            <span className="text-muted" style={{ fontSize: "0.78rem" }}>
              <i className="bi bi-info-circle me-1" />
              States are updated by your Program Manager or ACE Lead.
            </span>
            <button type="button" className="btn btn-secondary px-4 rounded-pill btn-sm fw-semibold" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ActionAlertModal;

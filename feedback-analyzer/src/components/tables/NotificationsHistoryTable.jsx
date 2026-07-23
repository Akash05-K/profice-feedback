import React, { useState, useEffect, useRef } from "react";

const typeMeta = {
  email: { label: "Email", tone: "blue", badge: "badge-pill--blue" },
  "in-app": { label: "In-App", tone: "green", badge: "badge-pill--green" },
  alert: { label: "Alert", tone: "red", badge: "badge-pill--red" },
  reminder: { label: "Alert", tone: "red", badge: "badge-pill--red" },
  summary: { label: "Email", tone: "blue", badge: "badge-pill--blue" },
};

function NotificationsHistoryTable({ rows, onToggleRead, onDelete }) {
  const [activeMenuId, setActiveMenuId] = useState(null);
  const menuRef = useRef(null);

  // Close actions menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleToggleMenu = (e, id) => {
    e.stopPropagation();
    setActiveMenuId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="table-panel">
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ paddingLeft: "20px" }}>Notification</th>
            <th style={{ width: "120px" }}>Type</th>
            <th style={{ width: "140px" }}>Time</th>
            <th style={{ width: "50px" }}></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="data-table__empty">
                No notifications match your filters.
              </td>
            </tr>
          ) : (
            rows.map((log) => {
              const meta = typeMeta[log.type] || { label: "In-App", tone: "green", badge: "badge-pill--green" };
              const isUnread = !log.read;

              return (
                <tr 
                  key={log.id} 
                  style={{ 
                    background: isUnread ? "rgba(37, 99, 235, 0.02)" : "transparent",
                    borderLeft: isUnread ? "3px solid var(--color-primary)" : "3px solid transparent",
                    transition: "all 0.2s ease"
                  }}
                >
                  <td style={{ paddingLeft: "20px", verticalAlign: "middle" }}>
                    <div className="d-flex align-items-center gap-3">
                      {/* Left circular avatar icon */}
                      <span 
                        className={`activity-list__icon activity-list__icon--${log.tone || "blue"}`} 
                        style={{ width: "32px", height: "32px", fontSize: "0.9rem" }}
                      >
                        <i className={`bi ${log.icon || "bi-bell-fill"}`} />
                      </span>
                      {/* Notification message */}
                      <span 
                        className="notification-message-text" 
                        style={{ 
                          fontWeight: isUnread ? "600" : "400", 
                          color: isUnread ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                          fontSize: "0.86rem"
                        }}
                      >
                        {log.message}
                      </span>
                    </div>
                  </td>
                  <td style={{ verticalAlign: "middle" }}>
                    <span className={`badge-pill ${meta.badge}`}>
                      {meta.label}
                    </span>
                  </td>
                  <td style={{ verticalAlign: "middle", fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
                    {log.time}
                  </td>
                  <td style={{ verticalAlign: "middle", position: "relative" }}>
                    <button
                      type="button"
                      className="table-icon-btn border-0 bg-transparent"
                      style={{ color: "var(--color-text-muted)" }}
                      onClick={(e) => handleToggleMenu(e, log.id)}
                      aria-label="Actions"
                    >
                      <i className="bi bi-three-dots-vertical" />
                    </button>

                    {activeMenuId === log.id && (
                      <div 
                        ref={menuRef}
                        className="dropdown-menu show shadow-sm border"
                        style={{
                          position: "absolute",
                          right: "10px",
                          top: "35px",
                          zIndex: 10,
                          minWidth: "140px",
                          background: "#fff",
                          borderRadius: "8px",
                          padding: "6px 0"
                        }}
                      >
                        <button
                          type="button"
                          className="dropdown-item px-3 py-1.5 small text-start w-100 border-0 bg-transparent"
                          style={{ fontSize: "0.78rem", cursor: "pointer" }}
                          onClick={() => {
                            onToggleRead(log.id);
                            setActiveMenuId(null);
                          }}
                        >
                          <i className={`bi ${log.read ? "bi-envelope" : "bi-envelope-open"} me-2`} />
                          Mark as {log.read ? "Unread" : "Read"}
                        </button>
                        <button
                          type="button"
                          className="dropdown-item px-3 py-1.5 small text-start text-danger w-100 border-0 bg-transparent"
                          style={{ fontSize: "0.78rem", cursor: "pointer" }}
                          onClick={() => {
                            onDelete(log.id);
                            setActiveMenuId(null);
                          }}
                        >
                          <i className="bi bi-trash me-2" />
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default NotificationsHistoryTable;

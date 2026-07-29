import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ROLE_LABELS } from "../../lib/permissions";
import ActionAlertModal from "../widgets/ActionAlertModal";
import api from "../../services/api";

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("") || "U";

function Navbar({ title, subtitle, onToggleSidebar }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [activeActionsCount, setActiveActionsCount] = useState(0);

  const isTrainer = user?.role === "trainer";

  useEffect(() => {
    if (!isTrainer) return;

    let isMounted = true;
    api
      .getActions({ limit: 100 })
      .then((res) => {
        if (!isMounted) return;
        if (res && res.data) {
          // Count open/in-progress actions assigned to trainer
          const active = res.data.filter(
            (a) => a.status === "open" || a.status === "in-progress" || a.status === "in_progress" || a.status === "overdue"
          ).length;
          setActiveActionsCount(active);
        }
      })
      .catch((err) => {
        console.error("Failed to load trainer action alerts:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [isTrainer]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      <header className="app-topbar">
        <div className="app-topbar__left">
          <button
            type="button"
            className="app-topbar__menu-btn d-lg-none"
            onClick={onToggleSidebar}
            aria-label="Toggle navigation"
          >
            <i className="bi bi-list" />
          </button>
          <div>
            <h1 className="app-topbar__title">{title}</h1>
            {subtitle ? <p className="app-topbar__subtitle">{subtitle}</p> : null}
          </div>
        </div>

        <div className="app-topbar__right">
          {/* Trainer Action Tracker Alert Icon */}
          {isTrainer ? (
            <button
              type="button"
              className="topbar-icon-btn position-relative"
              aria-label="Assigned Actions Alert"
              title="Assigned Actions & Tracker"
              style={{ color: activeActionsCount > 0 ? "var(--color-primary)" : undefined }}
              onClick={() => setIsActionModalOpen(true)}
            >
              <i className="bi bi-exclamation-octagon" />
              {activeActionsCount > 0 && (
                <span className="topbar-icon-btn__badge" style={{ backgroundColor: "#2563eb" }}>
                  {activeActionsCount}
                </span>
              )}
            </button>
          ) : null}

          {/* Standard Notifications Bell */}
          <button
            type="button"
            className="topbar-icon-btn"
            aria-label="Notifications"
            onClick={() => navigate("/notifications")}
          >
            <i className="bi bi-bell" />
          </button>

          <div className="topbar-account">
            <span className="topbar-avatar" aria-hidden="true">
              <span>{initials(user?.name)}</span>
              <span className="topbar-avatar__status" />
            </span>
            <span className="topbar-account__meta">
              <span className="topbar-account__name">{user?.name || "User"}</span>
              <span className="topbar-account__role">
                {user?.role === "program_manager"
                  ? `${user?.program || "IBM"} Program Manager`
                  : ROLE_LABELS[user?.role] || "Member"}
              </span>
            </span>
          </div>

          <button
            type="button"
            className="topbar-icon-btn topbar-icon-btn--logout"
            aria-label="Log out"
            title="Log out"
            onClick={handleLogout}
          >
            <i className="bi bi-box-arrow-right" />
          </button>
        </div>
      </header>

      {/* Trainer Action Alert Modal */}
      {isTrainer && (
        <ActionAlertModal
          isOpen={isActionModalOpen}
          onClose={() => setIsActionModalOpen(false)}
          user={user}
        />
      )}
    </>
  );
}

export default Navbar;

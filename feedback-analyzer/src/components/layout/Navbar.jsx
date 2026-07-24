import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ROLE_LABELS } from "../../lib/permissions";

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

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
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
            <span className="topbar-account__role">{ROLE_LABELS[user?.role] || "Member"}</span>
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
  );
}

export default Navbar;

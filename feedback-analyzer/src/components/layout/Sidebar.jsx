import { NavLink, useNavigate } from "react-router-dom";
import { navItems } from "../../data/dashboardData";
import { useAuth } from "../../context/AuthContext";
import { canAccessPath, ROLE_LABELS } from "../../lib/permissions";

const NAV = navItems;

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("") || "U";

function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const role = user?.role;
  const visibleItems = NAV.filter((item) => canAccessPath(role, item.path));

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      {isOpen && <div className="sidebar-backdrop d-lg-none" onClick={onClose} />}

      <aside className={`app-sidebar ${isOpen ? "app-sidebar--open" : ""}`}>
        <div className="sidebar-brand">
          <span className="sidebar-brand__icon">
            <i className="bi bi-chat-square-text-fill" />
          </span>
          <div className="sidebar-brand__text">
            <span className="sidebar-brand__title">Profice Feedback</span>
            <span className="sidebar-brand__subtitle">AI Powered Insights</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <ul className="sidebar-nav__list">
            {visibleItems.map((item) => (
              <li key={item.id} className="sidebar-nav__item">
                <NavLink
                  to={item.path}
                  end={item.path === "/"}
                  className={({ isActive }) =>
                    `sidebar-nav__link ${isActive ? "sidebar-nav__link--active" : ""}`
                  }
                  onClick={onClose}
                >
                  <i className={`bi ${item.icon} sidebar-nav__icon`} />
                  <span className="sidebar-nav__label">{item.label}</span>
                  {item.badge ? <span className="sidebar-nav__badge">{item.badge}</span> : null}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="sidebar-user__avatar">{initials(user?.name)}</span>
            <div className="sidebar-user__info">
              <span className="sidebar-user__name">{user?.name || "User"}</span>
              <span className="sidebar-user__role">{ROLE_LABELS[role] || "Member"}</span>
            </div>
            <button
              type="button"
              className="sidebar-user__logout"
              onClick={handleLogout}
              aria-label="Log out"
              title="Log out"
            >
              <i className="bi bi-box-arrow-right" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;

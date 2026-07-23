import { NavLink } from "react-router-dom";
import { navItems } from "../../data/dashboardData";

function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {isOpen && <div className="sidebar-backdrop d-lg-none" onClick={onClose} />}

      <aside className={`app-sidebar ${isOpen ? "app-sidebar--open" : ""}`}>
        <div className="sidebar-brand">
          <span className="sidebar-brand__icon">
            <i className="bi bi-chat-square-text-fill" />
          </span>
          <div className="sidebar-brand__text">
            <span className="sidebar-brand__title">Feedback Analyzer</span>
            <span className="sidebar-brand__subtitle">AI Powered Insights</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <ul className="sidebar-nav__list">
            {navItems.map((item) => (
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
                  {item.badge ? (
                    <span className="sidebar-nav__badge">{item.badge}</span>
                  ) : null}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="sidebar-user__avatar">AT</span>
            <div className="sidebar-user__info">
              <span className="sidebar-user__name">Akash</span>
              <span className="sidebar-user__role">Admin</span>
            </div>
            <i className="bi bi-chevron-expand sidebar-user__caret" />
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
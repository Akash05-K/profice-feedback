import { useNavigate } from "react-router-dom";

function Navbar({ title, subtitle, onToggleSidebar }) {
  const navigate = useNavigate();

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
          <i className="bi bi-bell"/>
        </button>

        <button type="button" className="topbar-avatar" aria-label="Account">
          <span>AK</span>
          <span className="topbar-avatar__status" />
        </button>
      </div>
    </header>
  );
}

export default Navbar;
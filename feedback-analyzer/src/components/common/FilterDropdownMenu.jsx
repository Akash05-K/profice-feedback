import { useState, useRef, useEffect } from "react";

function FilterDropdownMenu({ children, activeCount = 0, label = "Filter" }) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="position-relative d-inline-block" ref={popoverRef}>
      <button
        type="button"
        className={`filter-pill-btn ${isOpen ? "filter-pill-btn--open" : ""} ${activeCount > 0 ? "filter-pill-btn--active" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <i className="bi bi-funnel filter-pill-btn__icon" />
        <span className="filter-pill-btn__text">{label}</span>
        {activeCount > 0 && (
          <span className="filter-pill-btn__badge">
            {activeCount}
          </span>
        )}
        <i className="bi bi-chevron-down filter-pill-btn__caret" />
      </button>

      {isOpen && (
        <div className="filter-dropdown-popover">
          <div className="filter-dropdown-popover__header">
            <span className="filter-dropdown-popover__title">
              <i className="bi bi-sliders me-1" style={{ color: "var(--color-primary, #2563eb)" }} /> Filter Options
            </span>
            <button
              type="button"
              className="filter-dropdown-popover__close"
              onClick={() => setIsOpen(false)}
              aria-label="Close filters"
            >
              <i className="bi bi-x" />
            </button>
          </div>
          <div className="filter-dropdown-popover__body">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

export default FilterDropdownMenu;

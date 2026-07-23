import { useState } from "react";

function ActivityList({ title, icon, iconTone, items, emptyText }) {
  const [expanded, setExpanded] = useState(false);
  const displayedItems = expanded ? items : items.slice(0, 4);

  return (
    <div className="panel activity-list-card">
      <div className="panel-header">
        <h2 className="panel-header__title">
          <span className={`panel-header__icon panel-header__icon--${iconTone}`}>
            <i className={`bi ${icon}`} />
          </span>
          {title}
        </h2>
      </div>

      {items.length === 0 ? (
        <p className="activity-list__empty">{emptyText || "Nothing to show."}</p>
      ) : (
        <>
          <ul className="activity-list">
            {displayedItems.map((item) => (
              <li key={item.id} className="activity-list__item">
                <span className={`activity-list__icon activity-list__icon--${item.tone}`}>
                  <i className={`bi ${item.icon}`} />
                </span>
                <div className="activity-list__body">
                  <span className="activity-list__title">{item.title}</span>
                  <span className="activity-list__subtitle">{item.subtitle}</span>
                </div>
                {item.meta && <span className="activity-list__meta">{item.meta}</span>}
              </li>
            ))}
          </ul>
          {items.length > 4 && (
            <div className="activity-list__footer">
              <button
                type="button"
                className="activity-list__view-more-btn"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? "View Less" : "View More"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ActivityList;
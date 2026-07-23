function RecommendedActions({ title, icon, actions, ctaLabel, ctaIcon }) {
  return (
    <div className="panel recommended-actions-card">
      <div className="panel-header">
        <h2 className="panel-header__title">
          <span className="panel-header__icon panel-header__icon--blue">
            <i className={`bi ${icon || "bi-lightbulb-fill"}`} />
          </span>
          {title || "AI Recommended Actions"}
        </h2>
      </div>

      <ul className="recommended-actions-list">
        {actions.map((action, index) => (
          <li key={index} className="recommended-actions-list__item">
            <i className="bi bi-check-circle-fill recommended-actions-list__check" />
            <span>{action}</span>
          </li>
        ))}
      </ul>

      {ctaLabel ? (
        <button type="button" className="btn-primary-block">
          {ctaLabel}
          {ctaIcon ? <i className={`bi ${ctaIcon}`} /> : null}
        </button>
      ) : null}
    </div>
  );
}

export default RecommendedActions;
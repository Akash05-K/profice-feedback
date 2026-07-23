function QuickActions({ actions, onActionClick }) {
  return (
    <div className="panel quick-actions-card">
      <div className="panel-header">
        <h2 className="panel-header__title">quickActions</h2>
      </div>

      <div className="quick-actions-grid">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            className="quick-action-btn"
            onClick={() => onActionClick && onActionClick(action.id)}
          >
            <span className={`quick-action-btn__icon quick-action-btn__icon--${action.tone}`}>
              <i className={`bi ${action.icon}`} />
            </span>
            <span className="quick-action-btn__label">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default QuickActions;
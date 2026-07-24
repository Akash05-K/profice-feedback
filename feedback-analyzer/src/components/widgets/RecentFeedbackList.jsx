const sentimentMeta = {
  positive: { icon: "bi-emoji-smile-fill", tone: "green", label: "Positive" },
  neutral: { icon: "bi-emoji-neutral-fill", tone: "amber", label: "Neutral" },
  negative: { icon: "bi-emoji-frown-fill", tone: "red", label: "Negative" },
};

function RecentFeedbackList({ items }) {
  const displayItems = items ? items.slice(0, 3) : [];

  return (
    <div className="panel recent-feedback-card">
      <div className="panel-header">
        <h2 className="panel-header__title">
          <span className="panel-header__icon panel-header__icon--blue">
            <i className="bi bi-chat-left-text-fill" />
          </span>
          Recent Feedback
        </h2>
      </div>

      {displayItems.length === 0 ? (
        <p className="ranked-list__empty">No recent feedback yet.</p>
      ) : (
        <ul className="recent-feedback-list">
          {displayItems.map((item) => {
            const meta = sentimentMeta[item.sentiment] || sentimentMeta.neutral;
            return (
              <li key={item.id} className="recent-feedback-list__item">
                <span className={`recent-feedback-list__icon recent-feedback-list__icon--${meta.tone}`}>
                  <i className={`bi ${meta.icon}`} />
                </span>
                <div className="recent-feedback-list__body">
                  <p className="recent-feedback-list__text">{item.text}</p>
                  <span className="recent-feedback-list__author">— {item.author}</span>
                </div>
                <span className={`badge-pill badge-pill--${meta.tone}`}>{meta.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default RecentFeedbackList;

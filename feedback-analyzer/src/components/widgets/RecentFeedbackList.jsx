const sentimentMeta = {
  positive: { icon: "bi-emoji-smile-fill", tone: "green", label: "Positive" },
  neutral: { icon: "bi-emoji-neutral-fill", tone: "amber", label: "Neutral" },
  negative: { icon: "bi-emoji-frown-fill", tone: "red", label: "Negative" },
};

function RecentFeedbackList({ items }) {
  const displayItems = items ? items.slice(0, 3) : [];

  return (
    <div className="panel recent-feedback-card" style={{ padding: "20px" }}>
      <div className="panel-header" style={{ marginBottom: "16px" }}>
        <h2 className="panel-header__title">
          <span className="panel-header__icon panel-header__icon--blue">
            <i className="bi bi-chat-left-text-fill" />
          </span>
          Recent Feedback
        </h2>
      </div>

      <ul className="recent-feedback-list" style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
        {displayItems.map((item) => {
          const meta = sentimentMeta[item.sentiment] || sentimentMeta.neutral;
          return (
            <li key={item.id} className="recent-feedback-list__item" style={{ padding: "8px 12px", border: "1px solid #f1f5f9", borderRadius: "8px", background: "#f8fafc" }}>
              <span className={`recent-feedback-list__icon recent-feedback-list__icon--${meta.tone}`}>
                <i className={`bi ${meta.icon}`} />
              </span>
              <div className="recent-feedback-list__body">
                <p className="recent-feedback-list__text" style={{ fontSize: "0.8rem", margin: 0, lineHeight: "1.25", color: "#1e293b" }}>{item.text}</p>
                <span className="recent-feedback-list__author" style={{ fontSize: "0.72rem", color: "#64748b" }}>- {item.author}</span>
              </div>
              <span className={`badge-pill badge-pill--${meta.tone}`} style={{ fontSize: "0.7rem", padding: "2px 8px" }}>{meta.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default RecentFeedbackList;
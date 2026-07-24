function RankedTopicList({ title, icon, iconTone, items, barTone }) {
  const displayItems = items ? items.slice(0, 5) : [];

  return (
    <div className="panel ranked-list-card" style={{ padding: "20px" }}>
      <div className="panel-header" style={{ marginBottom: "16px" }}>
        <h2 className="panel-header__title">
          <span className={`panel-header__icon panel-header__icon--${iconTone}`}>
            <i className={`bi ${icon}`} />
          </span>
          {title}
        </h2>
      </div>

      <ul className="ranked-list" style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "14px" }}>
        {displayItems.map((item) => (
          <li key={item.rank} className="ranked-list__item" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span className="ranked-list__rank" style={{ width: "16px", color: "#64748B", fontSize: "0.85rem", fontWeight: "600" }}>{item.rank}</span>
            <span className="ranked-list__label" style={{ width: "100px", fontSize: "0.85rem", fontWeight: "500", color: "#1E293B", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{item.label}</span>
            <span className="ranked-list__bar-track" style={{ flex: 1, height: "7px", backgroundColor: "#E2E8F0", borderRadius: "4px", overflow: "hidden" }}>
              <span
                className={`ranked-list__bar-fill ranked-list__bar-fill--${barTone}`}
                style={{ display: "block", height: "100%", backgroundColor: barTone === "green" ? "#10B981" : "#EF4444", borderRadius: "4px", width: `${item.value}%` }}
              />
            </span>
            <span className="ranked-list__value" style={{ fontSize: "0.82rem", fontWeight: "700", width: "42px", textAlign: "right", color: "#0F172A" }}>{item.value}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default RankedTopicList;
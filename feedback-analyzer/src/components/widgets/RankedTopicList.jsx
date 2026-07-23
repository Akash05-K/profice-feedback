function RankedTopicList({ title, icon, iconTone, items, barTone }) {
  return (
    <div className="panel ranked-list-card">
      <div className="panel-header">
        <h2 className="panel-header__title">
          <span className={`panel-header__icon panel-header__icon--${iconTone}`}>
            <i className={`bi ${icon}`} />
          </span>
          {title}
        </h2>
      </div>

      <ul className="ranked-list">
        {items.map((item) => (
          <li key={item.rank} className="ranked-list__item">
            <span className="ranked-list__rank">{item.rank}</span>
            <span className="ranked-list__label">{item.label}</span>
            <span className="ranked-list__bar-track">
              <span
                className={`ranked-list__bar-fill ranked-list__bar-fill--${barTone}`}
                style={{ width: `${item.value}%` }}
              />
            </span>
            <span className="ranked-list__value">{item.value}%</span>
          </li>
        ))}
      </ul>

      <button type="button" className="link-button">
        View All
      </button>
    </div>
  );
}

export default RankedTopicList;
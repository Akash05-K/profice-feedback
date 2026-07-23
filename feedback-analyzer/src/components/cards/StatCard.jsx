function StatCard({ label, value, valueSuffix, icon, tone }) {
  return (
    <div className="stat-card">
      <span className={`stat-card__icon stat-card__icon--${tone}`}>
        <i className={`bi ${icon}`} />
      </span>

      <div className="stat-card__body">
        <span className="stat-card__label" title={label}>
          {label}
        </span>
        <span className="stat-card__value">
          {value}
          {valueSuffix ? <span className="stat-card__value-suffix"> {valueSuffix}</span> : null}
        </span>
      </div>
    </div>
  );
}

export default StatCard;
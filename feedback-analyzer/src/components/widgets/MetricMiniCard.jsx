function MetricMiniCard({ icon, tone, label, value, sublabel, sublabelTone }) {
  return (
    <div className="metric-mini-card">
      <span className={`metric-mini-card__icon metric-mini-card__icon--${tone}`}>
        <i className={`bi ${icon}`} />
      </span>
      <div className="metric-mini-card__body">
        <span className="metric-mini-card__label">{label}</span>
        <span className="metric-mini-card__value">{value}</span>
        {sublabel ? (
          <span className={`metric-mini-card__sublabel metric-mini-card__sublabel--${sublabelTone}`}>
            {sublabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default MetricMiniCard;
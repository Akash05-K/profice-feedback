function CapabilityCard({ icon, title, subtitle, tone }) {
  return (
    <button type="button" className="capability-card">
      <span className={`capability-card__icon capability-card__icon--${tone}`}>
        <i className={`bi ${icon}`} />
      </span>
      <span className="capability-card__text">
        <span className="capability-card__title">{title}</span>
        <span className="capability-card__subtitle">{subtitle}</span>
      </span>
    </button>
  );
}

export default CapabilityCard;
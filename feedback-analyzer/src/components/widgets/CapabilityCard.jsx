// Informational descriptor of an AI capability — not an action, so it is a
// non-interactive element (previously a <button> with no handler).
function CapabilityCard({ icon, title, subtitle, tone }) {
  return (
    <div className="capability-card">
      <span className={`capability-card__icon capability-card__icon--${tone}`}>
        <i className={`bi ${icon}`} />
      </span>
      <span className="capability-card__text">
        <span className="capability-card__title">{title}</span>
        <span className="capability-card__subtitle">{subtitle}</span>
      </span>
    </div>
  );
}

export default CapabilityCard;

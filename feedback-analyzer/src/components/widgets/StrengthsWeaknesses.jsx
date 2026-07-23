function StrengthsWeaknesses({ strengths, weaknesses }) {
  return (
    <div className="panel strengths-weaknesses-card">
      <div className="panel-header">
        <h2 className="panel-header__title">Strengths &amp; Weaknesses</h2>
      </div>

      <div className="strengths-weaknesses">
        <div className="strengths-weaknesses__column">
          <span className="strengths-weaknesses__label strengths-weaknesses__label--positive">
            <i className="bi bi-hand-thumbs-up-fill" /> Strengths
          </span>
          <ul className="strengths-weaknesses__list">
            {strengths.map((item, index) => (
              <li key={index}>
                <i className="bi bi-check-circle-fill strengths-weaknesses__icon strengths-weaknesses__icon--positive" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="strengths-weaknesses__divider" />

        <div className="strengths-weaknesses__column">
          <span className="strengths-weaknesses__label strengths-weaknesses__label--negative">
            <i className="bi bi-hand-thumbs-down-fill" /> Weaknesses
          </span>
          <ul className="strengths-weaknesses__list">
            {weaknesses.map((item, index) => (
              <li key={index}>
                <i className="bi bi-exclamation-circle-fill strengths-weaknesses__icon strengths-weaknesses__icon--negative" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default StrengthsWeaknesses;
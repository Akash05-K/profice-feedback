import MetricMiniCard from "./MetricMiniCard";

function AISummaryCard({ text, ctaLabel, metrics, meta }) {
  return (
    <div className="panel ai-summary-card">
      <div className="panel-header">
        <h2 className="panel-header__title">
          <i className="bi bi-stars ai-summary-card__icon" />
          AI Summary
        </h2>
      </div>

      <div className="ai-summary-card__body">
        <p>{text}</p>
      </div>

      {metrics && metrics.length ? (
        <div className="metric-mini-grid ai-summary-card__metrics">
          {metrics.map((metric) => (
            <MetricMiniCard key={metric.label} {...metric} />
          ))}
        </div>
      ) : null}

      {ctaLabel ? (
        <button type="button" className="btn-primary-block">
          {ctaLabel}
        </button>
      ) : null}

      {meta ? (
        <div className="ai-summary-card__meta">
          <span>AI Model: {meta.model}</span>
          <span>Generated on {meta.generatedOn}</span>
        </div>
      ) : null}
    </div>
  );
}

export default AISummaryCard;
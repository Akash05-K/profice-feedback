const weightStyles = {
  5: { fontSize: "1.7rem", fontWeight: 700, color: "var(--color-text-primary)" },
  4: { fontSize: "1.4rem", fontWeight: 700, color: "var(--color-success)" },
  3: { fontSize: "1.15rem", fontWeight: 600, color: "var(--color-primary)" },
  2: { fontSize: "1rem", fontWeight: 600, color: "var(--color-success)" },
  1: { fontSize: "0.85rem", fontWeight: 500, color: "var(--color-text-secondary)" },
};

// Map a keyword's frequency to a 1–5 visual weight, relative to the most frequent.
function toWeight(count, maxCount) {
  if (!maxCount || maxCount <= 1) return 3;
  const ratio = count / maxCount;
  if (ratio > 0.8) return 5;
  if (ratio > 0.6) return 4;
  if (ratio > 0.4) return 3;
  if (ratio > 0.2) return 2;
  return 1;
}

function KeywordCloud({ keywords }) {
  if (!keywords || keywords.length === 0) {
    return <div className="keyword-cloud keyword-cloud--empty">No keywords extracted yet.</div>;
  }

  const maxCount = Math.max(...keywords.map((k) => k.count || 1));

  return (
    <div className="keyword-cloud">
      {keywords.map((keyword, index) => {
        const weight = keyword.weight || toWeight(keyword.count || 1, maxCount);
        return (
          <span
            key={`${keyword.text}-${index}`}
            className="keyword-cloud__tag"
            style={weightStyles[weight] || weightStyles[3]}
            title={keyword.count ? `${keyword.count} mentions` : undefined}
          >
            {keyword.text}
          </span>
        );
      })}
    </div>
  );
}

export default KeywordCloud;

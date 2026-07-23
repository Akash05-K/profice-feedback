const weightStyles = {
  5: { fontSize: "1.7rem", fontWeight: 700, color: "var(--color-text-primary)" },
  4: { fontSize: "1.4rem", fontWeight: 700, color: "var(--color-success)" },
  3: { fontSize: "1.15rem", fontWeight: 600, color: "var(--color-primary)" },
  2: { fontSize: "1rem", fontWeight: 600, color: "var(--color-success)" },
  1: { fontSize: "0.85rem", fontWeight: 400, color: "var(--color-text-secondary)" },
};

function KeywordCloud({ keywords }) {
  return (
    <div className="keyword-cloud">
      {keywords.map((keyword, index) => (
        <span
          key={`${keyword.text}-${index}`}
          className="keyword-cloud__tag"
          style={weightStyles[keyword.weight] || weightStyles[1]}
        >
          {keyword.text}
        </span>
      ))}
    </div>
  );
}

export default KeywordCloud;
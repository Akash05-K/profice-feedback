function SentimentLegend({ data }) {
  return (
    <ul className="sentiment-legend">
      {data.map((item) => (
        <li key={item.name} className="sentiment-legend__item">
          <span className="sentiment-legend__dot" style={{ backgroundColor: item.color }} />
          <span className="sentiment-legend__name">{item.name}</span>
          <span className="sentiment-legend__value">
            {item.value}% <span className="sentiment-legend__count">({item.count})</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export default SentimentLegend;
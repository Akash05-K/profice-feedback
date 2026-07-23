import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

function SentimentDonutChart({ data, total }) {
  return (
    <div className="donut-chart">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={3}
            startAngle={90}
            endAngle={-270}
            stroke="none"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      <div className="donut-chart__center">
        <span className="donut-chart__total">{total}</span>
        <span className="donut-chart__total-label">Total</span>
      </div>
    </div>
  );
}

export default SentimentDonutChart;
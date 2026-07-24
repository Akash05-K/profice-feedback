import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

function RatingTrendChart({
  data,
  series,
  xKey = "month",
  domain = [0, 5],
  ticks = [0, 1, 2, 3, 4, 5],
  valueFormatter = (v) => v.toFixed(1),
}) {
  if (!data || data.length === 0) {
    return <div className="chart-empty">No data for this selection yet.</div>;
  }
  return (
    <div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} barGap={4}>
          <CartesianGrid vertical={false} stroke="#EEF1F6" />
          <XAxis
            dataKey={xKey}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6B7280", fontSize: 12, fontFamily: "Inter, sans-serif" }}
            dy={8}
          />
          <YAxis
            domain={domain}
            ticks={ticks}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6B7280", fontSize: 12, fontFamily: "Inter, sans-serif" }}
            width={34}
          />
          <Tooltip
            cursor={{ fill: "#F8FAFC" }}
            content={({ active, payload, label }) => {
              if (!active || !payload || !payload.length) return null;
              return (
                <div className="chart-tooltip">
                  <span className="chart-tooltip__title">{label}</span>
                  {payload.map((entry) => (
                    <span key={entry.dataKey} className="chart-tooltip__value">
                      {entry.name}: {valueFormatter(entry.value)}
                    </span>
                  ))}
                </div>
              );
            }}
          />
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>

      <div className="chart-legend">
        {series.map((s) => (
          <span key={s.key} className="chart-legend__item">
            <span className="chart-legend__dot" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default RatingTrendChart;
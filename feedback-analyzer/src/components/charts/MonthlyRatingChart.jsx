import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="chart-tooltip">
      <span className="chart-tooltip__title">{label}</span>
      <span className="chart-tooltip__value">{payload[0].value.toFixed(1)} / 5 rating</span>
    </div>
  );
}

function MonthlyRatingChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="chart-empty">No trend data for this selection yet.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="ratingAreaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16A34A" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#16A34A" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#EEF1F6" />
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#6B7280", fontSize: 12, fontFamily: "Inter, sans-serif" }}
          dy={8}
        />
        <YAxis
          domain={[0, 5]}
          ticks={[0, 1, 2, 3, 4, 5]}
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#6B7280", fontSize: 12, fontFamily: "Inter, sans-serif" }}
          width={30}
        />
        <Tooltip content={<TrendTooltip />} cursor={{ stroke: "#E5E7EB", strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="rating"
          stroke="#16A34A"
          strokeWidth={3}
          fill="url(#ratingAreaFill)"
          dot={{ r: 4, fill: "#FFFFFF", stroke: "#16A34A", strokeWidth: 2 }}
          activeDot={{ r: 6, fill: "#16A34A" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default MonthlyRatingChart;
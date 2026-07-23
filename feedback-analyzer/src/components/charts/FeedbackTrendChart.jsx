import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="chart-tooltip">
      <span className="chart-tooltip__title">{label} 2026</span>
      <span className="chart-tooltip__value">
        {payload[0].value.toLocaleString()} Feedbacks
      </span>
    </div>
  );
}

function FeedbackTrendChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="trendLineGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#7C3AED" />
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
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#6B7280", fontSize: 12, fontFamily: "Inter, sans-serif" }}
          width={48}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#E5E7EB", strokeWidth: 1 }} />
        <Line
          type="monotone"
          dataKey="feedback"
          stroke="url(#trendLineGradient)"
          strokeWidth={3}
          dot={{ r: 4, fill: "#FFFFFF", stroke: "#2563EB", strokeWidth: 2 }}
          activeDot={{ r: 6, fill: "#2563EB" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default FeedbackTrendChart;
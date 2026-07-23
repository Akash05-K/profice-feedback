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

  const pred = payload.find(p => p.dataKey === "predictedValue");
  const act = payload.find(p => p.dataKey === "actualValue");

  return (
    <div className="chart-tooltip p-2 bg-white border rounded shadow-sm" style={{ fontSize: "0.8rem", minWidth: "120px" }}>
      <div className="fw-bold mb-1 text-muted" style={{ fontSize: "0.78rem" }}>{label}</div>
      {pred && (
        <div style={{ color: "#22c55e" }}>
          <strong>Predicted:</strong> {pred.value}%
        </div>
      )}
      {act && (
        <div style={{ color: "#2563eb" }}>
          <strong>Actual:</strong> {act.value}%
        </div>
      )}
    </div>
  );
}

function PerformancePredictionChart({ data }) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#EEF1F6" />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6B7280", fontSize: 11, fontFamily: "Inter, sans-serif" }}
            dy={8}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={(v) => `${v}%`}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6B7280", fontSize: 11, fontFamily: "Inter, sans-serif" }}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#E5E7EB", strokeWidth: 1 }} />
          <Line
            type="monotone"
            dataKey="actualValue"
            name="Actual Performance"
            stroke="#2563eb"
            strokeWidth={3}
            dot={{ r: 4, fill: "#FFFFFF", stroke: "#2563eb", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: "#2563eb" }}
          />
          <Line
            type="monotone"
            dataKey="predictedValue"
            name="Predicted Performance"
            stroke="#22c55e"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={{ r: 4, fill: "#FFFFFF", stroke: "#22c55e", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: "#22c55e" }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="d-flex align-items-center justify-content-center gap-4 mt-3" style={{ fontSize: "0.8rem" }}>
        <span className="d-flex align-items-center gap-1.5 text-muted">
          <span style={{ display: "inline-block", width: "12px", height: "3px", backgroundColor: "#2563eb" }} />
          Actual Performance
        </span>
        <span className="d-flex align-items-center gap-1.5 text-muted">
          <span style={{ display: "inline-block", width: "12px", height: "3.5px", borderTop: "2.5px dashed #22c55e" }} />
          Predicted Performance
        </span>
      </div>
    </div>
  );
}

export default PerformancePredictionChart;

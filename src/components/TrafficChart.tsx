"use client";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from "recharts";
export default function TrafficChart({
  data,
  bars = false,
}: {
  data: { date: string; views: number; inquiries: number }[];
  bars?: boolean;
}) {
  if (!data.some((d) => d.views || d.inquiries))
    return (
      <div className="admin-empty">
        No traffic recorded in this period. Analytics begins when visitors allow
        optional measurement.
      </div>
    );
  const shared = (
    <>
      <CartesianGrid stroke="#edf0f4" vertical={false} />
      <XAxis
        dataKey="date"
        tick={{ fontSize: 9 }}
        tickFormatter={(v) => String(v).slice(5)}
        minTickGap={24}
      />
      <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={28} />
      <Tooltip />
      <Legend wrapperStyle={{ fontSize: 10 }} />
    </>
  );
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        {bars ? (
          <BarChart data={data}>
            {shared}
            <Bar dataKey="views" name="Page views" fill="#c9a34e" />
            <Bar dataKey="inquiries" name="Inquiries" fill="#14243b" />
          </BarChart>
        ) : (
          <LineChart data={data}>
            {shared}
            <Line
              type="monotone"
              dataKey="views"
              name="Page views"
              stroke="#14243b"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="inquiries"
              name="Inquiries"
              stroke="#c9a34e"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

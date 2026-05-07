import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { dashboardService } from "../services/dashboardService";
import { Card } from "../components/ui";

export default function AnalyticsPage() {
  const [summary, setSummary] = useState({
    totalStudents: 0,
    presentToday: 0,
    absentToday: 0,
    attendancePercentage: 0,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    dashboardService.getOverview()
      .then((data) => {
        setSummary(data.summary);
        setError("");
      })
      .catch(() => {
        setError("Analytics data is unavailable right now.");
      });
  }, []);

  const pieData = [
    { name: "Present", value: summary.presentToday, color: "#2563eb" },
    { name: "Absent", value: summary.absentToday, color: "#94a3b8" },
  ];

  return (
    <div className="page-shell">
      <Card>
        <h2 className="text-lg font-bold">Attendance Distribution</h2>
        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
        <div className="mt-8 grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={120} innerRadius={72}>
                  {pieData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4">
            {pieData.map((item) => (
              <div key={item.name} className="rounded-2xl border border-white/20 bg-white/40 p-5 dark:bg-slate-900/40">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{item.name}</p>
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                </div>
                <p className="mt-2 text-3xl font-bold">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

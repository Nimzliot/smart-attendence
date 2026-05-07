import { CheckCircle2, TrendingUp, UserX, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart } from "recharts";
import { dashboardService } from "../services/dashboardService";
import StatCard from "../components/StatCard";
import { Badge, Card } from "../components/ui";

export default function DashboardPage() {
  const [data, setData] = useState({
    summary: {
      totalStudents: 0,
      presentToday: 0,
      absentToday: 0,
      attendancePercentage: 0,
    },
    weeklyTrend: [],
    deviceStatus: [],
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    dashboardService.getOverview()
      .then((response) => {
        setData(response);
        setError("");
      })
      .catch(() => {
        setError("Live dashboard data is unavailable right now.");
      })
      .finally(() => setLoading(false));
  }, []);

  const summary = data.summary;

  return (
    <div className="page-shell">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Students" value={summary.totalStudents} subtitle="Registered across all active departments" icon={Users} />
        <StatCard title="Present Today" value={summary.presentToday} subtitle="Detected by smart recognition workflow" icon={CheckCircle2} />
        <StatCard title="Absent Today" value={summary.absentToday} subtitle="Students without a successful check-in" icon={UserX} />
        <StatCard title="Attendance Rate" value={`${summary.attendancePercentage}%`} subtitle="Today's institution-wide attendance score" icon={TrendingUp} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Weekly Attendance Trend</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Seven-day recognition and attendance activity</p>
            </div>
            <Badge tone="success">{loading ? "Syncing" : "Live analytics"}</Badge>
          </div>
          {error ? <p className="mb-4 text-sm text-rose-300">{error}</p> : null}
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.weeklyTrend}>
                <defs>
                  <linearGradient id="attendanceFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="present" stroke="#2563eb" fill="url(#attendanceFill)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold">Device Fleet</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Current ESP32-CAM node availability</p>
          <div className="mt-5 space-y-4">
            {!data.deviceStatus.length ? <p className="text-sm text-slate-500 dark:text-slate-400">No live device data yet.</p> : null}
            {data.deviceStatus.map((device) => (
              <div key={device.device_id} className="rounded-2xl border border-white/20 bg-white/50 p-4 dark:bg-slate-900/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{device.device_id}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Last seen {new Date(device.last_seen).toLocaleString()}</p>
                  </div>
                  <Badge tone={device.is_alive ? "success" : "danger"}>{device.connectivity_status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <h2 className="text-lg font-bold">Recognition Throughput</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Daily present-count volume across monitored sessions</p>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="present" radius={[8, 8, 0, 0]} fill="#4f46e5" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold">Recent Activity</h2>
          <div className="mt-5 space-y-4">
            {!data.recentActivity.length ? <p className="text-sm text-slate-500 dark:text-slate-400">No attendance activity recorded yet.</p> : null}
            {data.recentActivity.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-2xl border border-white/20 bg-white/50 p-4 dark:bg-slate-900/50">
                <div>
                  <p className="font-medium">{entry.users?.full_name || "Student"}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(entry.marked_at).toLocaleString()}</p>
                </div>
                <Badge tone="success">{entry.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

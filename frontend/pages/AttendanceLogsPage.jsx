import { useEffect, useState } from "react";
import { dashboardService } from "../services/dashboardService";
import { Badge, Card } from "../components/ui";

export default function AttendanceLogsPage() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    dashboardService.getAttendanceLogs().then(setLogs).catch(() => setLogs([]));
  }, []);

  return (
    <div className="page-shell">
      <Card>
        <h2 className="text-lg font-bold">Attendance History</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Audit trail for recognition-driven presence events</p>
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-3">Student</th>
                <th className="py-3">Email</th>
                <th className="py-3">Status</th>
                <th className="py-3">Source</th>
                <th className="py-3">Device</th>
                <th className="py-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((row) => (
                <tr key={row.id} className="border-t border-slate-200/60 dark:border-slate-800">
                  <td className="py-4 font-medium">{row.users?.full_name}</td>
                  <td className="py-4">{row.users?.email}</td>
                  <td className="py-4"><Badge tone="success">{row.status}</Badge></td>
                  <td className="py-4">{row.source}</td>
                  <td className="py-4">{row.device_id || "manual"}</td>
                  <td className="py-4">{new Date(row.marked_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

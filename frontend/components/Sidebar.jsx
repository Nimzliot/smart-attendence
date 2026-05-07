import { Activity, BarChart3, Camera, ClipboardList, ImageIcon, LayoutDashboard, MonitorSmartphone, Settings, UserCircle2, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const items = [
  ["Dashboard", "/dashboard", LayoutDashboard],
  ["Attendance Logs", "/attendance", ClipboardList],
  ["Student Management", "/students", Users],
  ["Face Registration", "/face-registration", Camera],
  ["Student Faces", "/student-faces", ImageIcon],
  ["Analytics", "/analytics", BarChart3],
  ["Device Status", "/devices", MonitorSmartphone],
  ["Settings", "/settings", Settings],
  ["Profile", "/profile", UserCircle2],
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="glass-panel hidden fixed inset-y-6 left-6 z-30 w-[20rem] flex-col overflow-hidden p-6 lg:flex">
      <div className="mb-10 flex items-center gap-4">
        <div className="rounded-3xl bg-cyan-500/15 p-4 text-cyan-300">
          <Activity className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.45em] text-cyan-300/80">Face Attendance</p>
          <p className="text-3xl font-bold">AttendAI</p>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Control student onboarding, attendance recognition, and ESP32 device health from one wide workspace.</p>
        </div>
      </div>
      <nav className="space-y-2">
        {items.map(([label, to, Icon]) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${
                isActive
                  ? "bg-cyan-500/15 text-cyan-100 shadow-lg shadow-cyan-900/20 ring-1 ring-cyan-400/20"
                  : "text-slate-600 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-slate-800/60"
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto rounded-[26px] border border-white/10 bg-slate-950/50 p-5">
        <p className="text-lg font-semibold">{user?.email || "Admin"}</p>
        <p className="mt-1 text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Administrator</p>
        <button
          className="mt-5 inline-flex items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
          onClick={logout}
        >
          Logout
        </button>
      </div>
    </aside>
  );
}

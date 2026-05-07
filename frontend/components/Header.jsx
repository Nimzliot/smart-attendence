import { Bell, Cpu, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { dashboardService } from "../services/dashboardService";
import { Button } from "./ui";

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [hardware, setHardware] = useState({ label: "Checking hardware", online: false });

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const overview = await dashboardService.getOverview();
        const primaryDevice = (overview.deviceStatus || [])[0];
        if (!active) return;
        setHardware({
          label: primaryDevice ? `${primaryDevice.device_id} ${primaryDevice.is_alive ? "online" : "offline"}` : "No hardware linked",
          online: Boolean(primaryDevice?.is_alive),
        });
      } catch {
        if (!active) return;
        setHardware({ label: "Hardware offline", online: false });
      }
    };

    load();
    const timer = setInterval(load, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <header className="glass-panel sticky top-4 z-20 flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.45em] text-cyan-300/80">Admin Dashboard</p>
        <h1 className="mt-2 text-3xl font-bold">Smart Attendance Command Center</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Manage student registration through ESP32 capture, track live device health, and review attendance in one full-width console.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold ${
          hardware.online
            ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
            : "border-rose-400/20 bg-rose-500/10 text-rose-300"
        }`}>
          <Cpu className="h-4 w-4" />
          {hardware.label}
        </div>
        <Button variant="ghost" className="rounded-full p-2" onClick={toggleTheme}>
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" className="rounded-full p-2">
          <Bell className="h-4 w-4" />
        </Button>
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold">{user?.email}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Administrator</p>
        </div>
        <Button variant="secondary" onClick={logout}>Sign out</Button>
      </div>
    </header>
  );
}

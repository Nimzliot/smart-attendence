import { useEffect, useState } from "react";
import { dashboardService } from "../services/dashboardService";
import { Badge, Card } from "../components/ui";

export default function DeviceStatusPage() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    dashboardService.getOverview()
      .then((data) => {
        setDevices(data.deviceStatus || []);
        setError("");
      })
      .catch(() => {
        setDevices([]);
        setError("Unable to load ESP32 heartbeat status right now.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page-shell">
        <Card>
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading device heartbeat status...</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell">
        <Card>
          <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-shell">
      {!devices.length ? (
        <Card>
          <h2 className="text-lg font-bold">No Devices Reporting</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No ESP32-CAM heartbeat has been received yet. Power the device and confirm `/api/device/ping` is reaching the backend.</p>
        </Card>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {devices.map((device) => (
          <Card key={device.device_id}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{device.device_id}</h2>
              <Badge tone={device.is_alive ? "success" : "danger"}>{device.connectivity_status}</Badge>
            </div>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Heartbeat state: {device.is_alive ? "ESP32-CAM is alive" : "ESP32-CAM heartbeat missing"}</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Last seen: {new Date(device.last_seen).toLocaleString()}</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Seconds since heartbeat: {device.seconds_since_seen ?? "Unknown"}</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Reported status: {device.status}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

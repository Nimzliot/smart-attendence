import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { dashboardService } from "../services/dashboardService";
import { Badge, Button, Card } from "../components/ui";

export default function FaceRegistrationPage() {
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState("");
  const [registration, setRegistration] = useState(null);
  const [deviceStatus, setDeviceStatus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [studentRows, overview, registrationState] = await Promise.all([
          dashboardService.getStudents(),
          dashboardService.getOverview(),
          dashboardService.getHardwareRegistrationStatus(),
        ]);
        setStudents(studentRows);
        setDeviceStatus(overview.deviceStatus || []);
        setRegistration(registrationState);
      } catch {
        setStudents([]);
        setDeviceStatus([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    if (!registration?.pending) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const [registrationState, overview] = await Promise.all([
          dashboardService.getHardwareRegistrationStatus(),
          dashboardService.getOverview(),
        ]);
        setRegistration(registrationState);
        setDeviceStatus(overview.deviceStatus || []);

        if (registrationState.status === "completed") {
          toast.success(registrationState.message || "Face registered successfully");
          clearInterval(pollRef.current);
          pollRef.current = null;
        }

        if (registrationState.status === "failed") {
          toast.error(registrationState.message || "Hardware face registration failed");
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      } catch {
        // Keep polling quietly while the user waits for the device.
      }
    }, 4000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [registration?.pending, registration?.status]);

  const primaryDevice = deviceStatus[0];

  const submit = async () => {
    if (!studentId) return toast.error("Select a student first");
    if (!primaryDevice?.is_alive) return toast.error("ESP32-CAM must be online before starting hardware registration");

    setSubmitting(true);
    try {
      const state = await dashboardService.startHardwareRegistration(studentId, { device_id: primaryDevice.device_id });
      setRegistration(state);
      toast.success("Hardware registration started. Ask the student to look at the ESP32 camera.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not start hardware registration");
    } finally {
      setSubmitting(false);
    }
  };

  const cancelRegistration = async () => {
    try {
      const state = await dashboardService.cancelHardwareRegistration();
      setRegistration(state);
      toast.success("Hardware registration cancelled");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not cancel hardware registration");
    }
  };

  if (loading) {
    return (
      <div className="page-shell">
        <Card>
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading registration console...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-shell grid gap-6 2xl:grid-cols-[1.15fr_0.85fr]">
      <Card className="p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-cyan-300/80">Hardware Registration</p>
            <h2 className="mt-3 text-3xl font-bold">Register Student Face With ESP32-CAM</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">Choose a student, start hardware registration, then ask the student to stand in front of the ESP32-CAM. Once saved, the photo and student name will appear on the Student Faces page.</p>
          </div>
          <Badge tone={primaryDevice?.is_alive ? "success" : "danger"} className="self-start px-4 py-2 uppercase tracking-[0.25em]">
            {primaryDevice?.is_alive ? "Hardware Online" : "Hardware Offline"}
          </Badge>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-[26px] border border-white/10 bg-slate-950/35 p-6">
            <h3 className="text-lg font-bold">Registration Setup</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Use the live device listed on the right. When hardware registration is active, the ESP32 will capture one face image and send it to the backend for enrollment.</p>
            <select className="mt-6 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 text-sm dark:border-slate-700 dark:bg-slate-900/70" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">Select student</option>
              {students.map((student) => <option key={student.id} value={student.id}>{student.full_name}</option>)}
            </select>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button className="px-6 py-3" onClick={submit} disabled={submitting || registration?.pending || !primaryDevice?.is_alive}>
                {submitting ? "Starting..." : "Start ESP32 Capture"}
              </Button>
              <Button variant="secondary" className="px-6 py-3" onClick={cancelRegistration} disabled={!registration?.pending}>
                Cancel
              </Button>
            </div>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-slate-950/35 p-6">
            <h3 className="text-lg font-bold">Live Registration Status</h3>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Mode</p>
                <p className="mt-2 text-2xl font-semibold">{registration?.status || "idle"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Assigned Student</p>
                <p className="mt-2 text-lg font-semibold">{registration?.student_name || "No student selected"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Status Message</p>
                <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-300">{registration?.message || "No hardware registration in progress"}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-cyan-300/80">Live Device</p>
        <h2 className="mt-3 text-2xl font-bold">{primaryDevice?.device_id || "No ESP32-CAM detected"}</h2>
        <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">
          {primaryDevice
            ? primaryDevice.is_alive
              ? "The ESP32-CAM is online and ready to capture a face for registration or attendance."
              : "The ESP32-CAM heartbeat is stale. Bring the hardware online before starting registration."
            : "No heartbeat has been received yet. Start the device and make sure it can reach the backend."}
        </p>
        <div className="mt-6 space-y-4">
          {deviceStatus.length ? deviceStatus.map((device) => (
            <div key={device.device_id} className="rounded-[24px] border border-white/10 bg-slate-950/35 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{device.device_id}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Last seen {new Date(device.last_seen).toLocaleString()}</p>
                </div>
                <Badge tone={device.is_alive ? "success" : "danger"}>{device.connectivity_status}</Badge>
              </div>
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Seconds since heartbeat: {device.seconds_since_seen ?? "Unknown"}</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Backend registration target: {registration?.device_id || device.device_id}</p>
            </div>
          )) : (
            <div className="rounded-[24px] border border-dashed border-white/10 bg-slate-950/35 p-6 text-sm text-slate-500 dark:text-slate-400">
              Waiting for ESP32-CAM heartbeat...
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { dashboardService } from "../services/dashboardService";
import { Badge, Button, Card, Input } from "../components/ui";

export default function FaceRegistrationPage() {
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState("");
  const [registration, setRegistration] = useState(null);
  const [deviceStatus, setDeviceStatus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [streamUrl, setStreamUrl] = useState(import.meta.env.VITE_ESP32_STREAM_URL || "");
  const pollRef = useRef(null);
  const lastRegistrationStatusRef = useRef("");

  useEffect(() => {
    const load = async () => {
      const [studentsResult, overviewResult, registrationResult] = await Promise.allSettled([
        dashboardService.getStudents(),
        dashboardService.getOverview(),
        dashboardService.getHardwareRegistrationStatus(),
      ]);

      if (studentsResult.status === "fulfilled") {
        setStudents(studentsResult.value || []);
      } else {
        setStudents([]);
      }

      if (overviewResult.status === "fulfilled") {
        setDeviceStatus(overviewResult.value.deviceStatus || []);
      } else {
        setDeviceStatus([]);
      }

      if (registrationResult.status === "fulfilled") {
        setRegistration(registrationResult.value);
      } else {
        setRegistration(null);
      }

      setLoading(false);
    };

    load().catch(() => {
      setStudents([]);
      setDeviceStatus([]);
      setRegistration(null);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const [registrationState, overview] = await Promise.all([
          dashboardService.getHardwareRegistrationStatus(),
          dashboardService.getOverview(),
        ]);
        setRegistration(registrationState);
        setDeviceStatus(overview.deviceStatus || []);

        if (registrationState.status === "completed" && lastRegistrationStatusRef.current !== "completed") {
          toast.success(registrationState.message || "Face registered successfully");
        }

        if (registrationState.status === "failed" && lastRegistrationStatusRef.current !== "failed") {
          toast.error(registrationState.message || "Hardware face registration failed");
        }

        lastRegistrationStatusRef.current = registrationState.status || "";
      } catch {
        // Keep polling quietly so device status can recover automatically.
      }
    }, 4000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []);

  const primaryDevice = deviceStatus.find((device) => device.is_alive) || deviceStatus[0];
  const selectedStudent = useMemo(
    () => students.find((student) => student.id === studentId) || null,
    [studentId, students]
  );

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

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

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    setSelectedFile(file || null);
  };

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const [, base64 = ""] = result.split(",");
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.readAsDataURL(file);
  });

  const uploadFace = async () => {
    if (!studentId) return toast.error("Select a student first");
    if (!selectedFile) return toast.error("Choose an image first");

    setUploading(true);
    try {
      const image = await fileToBase64(selectedFile);
      await dashboardService.registerFace(studentId, { image });
      toast.success(`Face uploaded for ${selectedStudent?.full_name || "student"}`);
      setSelectedFile(null);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Could not upload face image");
    } finally {
      setUploading(false);
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

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[26px] border border-white/10 bg-slate-950/35 p-6">
            <h3 className="text-lg font-bold">Registration Setup</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Pick a student once, then either start ESP32 capture from the live stream or upload a clear face image manually.</p>
            <select className="mt-6 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 text-sm dark:border-slate-700 dark:bg-slate-900/70" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">Select student</option>
              {students.map((student) => <option key={student.id} value={student.id}>{student.full_name}</option>)}
            </select>
            {!students.length ? (
              <p className="mt-3 text-sm text-amber-600 dark:text-amber-300">No students loaded yet. Create a student first or make sure the student list API is reachable.</p>
            ) : null}

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">ESP32 Capture</p>
                <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-300">Use the live stream to position the student, then trigger the ESP32-CAM to capture one image for registration.</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button className="px-6 py-3" onClick={submit} disabled={submitting || registration?.pending || !primaryDevice?.is_alive}>
                    {submitting ? "Starting..." : "Start ESP32 Capture"}
                  </Button>
                  <Button variant="secondary" className="px-6 py-3" onClick={cancelRegistration} disabled={!registration?.pending}>
                    Cancel
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Manual Upload</p>
                <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-300">Upload a front-facing photo if you want to register without waiting for the hardware capture cycle.</p>
                <Input className="mt-4 cursor-pointer px-3 py-3 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-700" type="file" accept="image/*" onChange={handleFileChange} />
                {previewUrl ? (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60">
                    <img src={previewUrl} alt="Upload preview" className="h-56 w-full object-cover" />
                  </div>
                ) : (
                  <div className="mt-4 flex h-56 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-950/35 text-sm text-slate-500 dark:text-slate-400">
                    Selected image preview will appear here
                  </div>
                )}
                <Button className="mt-4 w-full px-6 py-3" onClick={uploadFace} disabled={uploading || !selectedFile}>
                  {uploading ? "Uploading..." : "Upload Face Image"}
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-slate-950/35 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold">ESP32 Live Stream</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Use your ESP32 stream URL here so you can line up the student before capturing.</p>
              </div>
              <Badge tone={streamUrl ? "success" : "warning"}>{streamUrl ? "Stream Ready" : "Add Stream URL"}</Badge>
            </div>
            <Input className="mt-5" placeholder="http://192.168.x.x:81/stream" value={streamUrl} onChange={(e) => setStreamUrl(e.target.value)} />
            <div className="mt-4 overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/70">
              {streamUrl ? (
                <img src={streamUrl} alt="ESP32 live stream" className="h-[320px] w-full object-cover" />
              ) : (
                <div className="flex h-[320px] items-center justify-center px-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  Add the ESP32 stream URL to preview the camera feed here.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-[26px] border border-white/10 bg-slate-950/35 p-6">
          <h3 className="text-lg font-bold">Live Registration Status</h3>
          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Mode</p>
              <p className="mt-2 text-2xl font-semibold">{registration?.status || "idle"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Assigned Student</p>
              <p className="mt-2 text-lg font-semibold">{registration?.student_name || selectedStudent?.full_name || "No student selected"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Status Message</p>
              <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-300">{registration?.message || "No hardware registration in progress"}</p>
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

import { useEffect, useState } from "react";
import { dashboardService } from "../services/dashboardService";
import { Badge, Card } from "../components/ui";

export default function StudentFacesPage() {
  const [faces, setFaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    dashboardService.getStudentFaces()
      .then((rows) => {
        setFaces(rows || []);
        setError("");
      })
      .catch(() => {
        setFaces([]);
        setError("Unable to load registered student faces right now.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page-shell">
        <Card>
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading registered faces...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-shell space-y-6">
      <Card className="p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-cyan-300/80">Student Faces</p>
        <h2 className="mt-3 text-3xl font-bold">Registered Face Gallery</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">Each student shown here has already completed face registration through the ESP32-CAM flow. This helps you confirm which image is stored before live attendance recognition begins.</p>
      </Card>

      {error ? (
        <Card>
          <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>
        </Card>
      ) : null}

      {!faces.length ? (
        <Card>
          <h3 className="text-lg font-bold">No Registered Faces Yet</h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Create a student first, then open Face Registration and capture the student with the ESP32-CAM.</p>
        </Card>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {faces.map((face) => (
          <Card key={face.id} className="overflow-hidden p-0">
            <div className="aspect-[4/3] bg-slate-900/60">
              {face.image_url ? (
                <img src={face.image_url} alt={face.student?.full_name || "Registered face"} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">No image available</div>
              )}
            </div>
            <div className="space-y-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{face.student?.full_name || "Unknown Student"}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{face.student?.email || "No email"}</p>
                </div>
                <Badge tone="success">Registered</Badge>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Department: {face.student?.department || "Unassigned"}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Saved: {face.created_at ? new Date(face.created_at).toLocaleString() : "Unknown"}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

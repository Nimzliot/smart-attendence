import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { dashboardService } from "../services/dashboardService";
import { Button, Card, Input } from "../components/ui";

export default function StudentManagementPage() {
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({ full_name: "", email: "", department: "" });

  const loadStudents = () => dashboardService.getStudents().then(setStudents).catch(() => setStudents([]));
  useEffect(() => { loadStudents(); }, []);

  const createStudent = async (event) => {
    event.preventDefault();
    try {
      await dashboardService.createStudent(form);
      toast.success("Student added successfully");
      setForm({ full_name: "", email: "", department: "" });
      loadStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to create student");
    }
  };

  return (
    <div className="page-shell grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <Card>
        <h2 className="text-lg font-bold">Add Student</h2>
        <form className="mt-6 space-y-4" onSubmit={createStudent}>
          <Input placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <Input placeholder="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          <Button className="w-full">Create Student Profile</Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-lg font-bold">Student Directory</h2>
        <div className="mt-5 space-y-4">
          {students.map((student) => (
            <div key={student.id} className="rounded-2xl border border-white/20 bg-white/40 p-4 dark:bg-slate-900/40">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">{student.full_name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{student.email}</p>
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">{student.department || "Unassigned"}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

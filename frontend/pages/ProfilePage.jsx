import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { dashboardService } from "../services/dashboardService";
import { Button, Card, Input } from "../components/ui";

export default function ProfilePage() {
  const [form, setForm] = useState({ full_name: "", department: "" });

  useEffect(() => {
    dashboardService.getProfile().then((data) => {
      setForm({
        full_name: data.user_metadata?.full_name || "",
        department: data.user_metadata?.department || "",
      });
    }).catch(() => {});
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    try {
      await dashboardService.updateProfile(form);
      toast.success("Profile updated");
    } catch {
      toast.error("Could not update profile");
    }
  };

  return (
    <div className="page-shell">
      <Card className="max-w-2xl">
        <h2 className="text-lg font-bold">Profile</h2>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Full name" />
          <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Department" />
          <Button>Save Changes</Button>
        </form>
      </Card>
    </div>
  );
}

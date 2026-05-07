import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";
import { Button, Card, Input } from "../components/ui";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    const { error } = await login(form.email, form.password);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    navigate(location.state?.from?.pathname || "/dashboard", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-600">AttendAI</p>
        <h1 className="mt-3 text-3xl font-bold">Sign in to your dashboard</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Sign in with your Supabase admin account to manage students, devices, and recognition-driven attendance.</p>
        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <Input placeholder="Email address" type="email" onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input placeholder="Password" type="password" onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Button className="w-full" disabled={loading}>{loading ? "Signing in..." : "Login"}</Button>
        </form>
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">Admin accounts are created in Supabase and then granted dashboard access.</p>
      </Card>
    </div>
  );
}

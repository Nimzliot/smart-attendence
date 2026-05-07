import { Card, Input } from "../components/ui";

export default function SettingsPage() {
  return (
    <div className="page-shell grid gap-6 md:grid-cols-2">
      <Card>
        <h2 className="text-lg font-bold">System Configuration</h2>
        <div className="mt-5 space-y-4">
          <Input value="0.50" readOnly />
          <Input value="12 hours duplicate lock window" readOnly />
          <Input value="Supabase + Flask REST API" readOnly />
        </div>
      </Card>
      <Card>
        <h2 className="text-lg font-bold">Deployment Notes</h2>
        <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
          Configure environment variables for Supabase keys, backend URL, and device network settings before running the system in demo or production mode.
        </p>
      </Card>
    </div>
  );
}

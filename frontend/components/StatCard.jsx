import { Card } from "./ui";

export default function StatCard({ title, value, subtitle, icon: Icon }) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-500 to-indigo-500" />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
          <h3 className="mt-3 text-3xl font-bold">{value}</h3>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        <div className="rounded-2xl bg-brand-500/10 p-3 text-brand-600 dark:text-brand-300">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

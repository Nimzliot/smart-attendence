import { cn } from "../src/lib/utils";

export function Card({ className, ...props }) {
  return <div className={cn("glass-panel p-5", className)} {...props} />;
}

export function Button({ className, variant = "primary", ...props }) {
  const variants = {
    primary: "bg-brand-600 text-white hover:bg-brand-700",
    secondary: "bg-white/70 text-slate-900 hover:bg-white dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-200/70 dark:text-slate-200 dark:hover:bg-slate-800",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        "w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm outline-none ring-0 placeholder:text-slate-400 focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900/70",
        className
      )}
      {...props}
    />
  );
}

export function Badge({ className, tone = "neutral", children }) {
  const tones = {
    neutral: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    danger: "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  };
  return <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone], className)}>{children}</span>;
}

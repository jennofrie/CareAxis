import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type BadgeVariant = "default" | "info" | "success" | "warning" | "error" | "premium";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
  info: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400",
  success: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
  error: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
  premium: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
};

export function Badge({ variant = "default", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

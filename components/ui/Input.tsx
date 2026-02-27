import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "w-full rounded-lg border border-slate-300 dark:border-slate-700",
          "bg-white dark:bg-slate-800 px-3 py-2 text-sm",
          "text-slate-900 dark:text-slate-100",
          "placeholder:text-slate-400 dark:placeholder:text-slate-500",
          "focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "transition-colors duration-200",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };

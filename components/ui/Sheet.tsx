"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface SheetContentProps {
  children: React.ReactNode;
  className?: string;
  side?: "left" | "right";
}

const Sheet = ({ open, onOpenChange, children }: SheetProps) => {
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      {children}
    </div>
  );
};

const SheetContent = ({ children, className, side = "right" }: SheetContentProps) => (
  <div
    className={cn(
      "absolute top-0 bottom-0 flex flex-col bg-white dark:bg-slate-900 shadow-2xl",
      "w-[420px] max-w-[95vw]",
      side === "right" ? "right-0" : "left-0",
      className
    )}
    onClick={(e) => e.stopPropagation()}
  >
    {children}
  </div>
);

const SheetHeader = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("flex flex-col gap-1 px-6 py-4 border-b border-slate-200 dark:border-slate-700", className)}>
    {children}
  </div>
);

const SheetTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <h2 className={cn("text-lg font-semibold text-slate-900 dark:text-slate-50", className)}>{children}</h2>
);

const SheetDescription = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <p className={cn("text-sm text-slate-500 dark:text-slate-400", className)}>{children}</p>
);

const SheetClose = ({ onClose }: { onClose: () => void }) => (
  <button
    onClick={onClose}
    className="absolute top-4 right-4 p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
  >
    <X className="w-4 h-4" />
  </button>
);

const SheetBody = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("flex-1 overflow-y-auto px-6 py-4", className)}>{children}</div>
);

export { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose, SheetBody };

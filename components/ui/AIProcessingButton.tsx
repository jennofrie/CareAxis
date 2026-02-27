"use client";

import { useState, useEffect } from "react";
import { Sparkles, Brain, Zap, CheckCircle2, Scan, FileSearch } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIProcessingButtonProps {
  isProcessing: boolean;
  onClick: () => void;
  disabled?: boolean;
  label: string;
  variant?: "emerald" | "indigo";
  type?: "audit" | "assess";
}

const AUDIT_STAGES = [
  { icon: Scan, text: "Scanning document...", duration: 2000 },
  { icon: Brain, text: "Analyzing compliance...", duration: 3000 },
  { icon: FileSearch, text: "Evaluating evidence...", duration: 2500 },
  { icon: Zap, text: "Running analysis...", duration: 3000 },
  { icon: CheckCircle2, text: "Generating report...", duration: 2000 },
];

const ASSESS_STAGES = [
  { icon: Scan, text: "Processing circumstances...", duration: 2000 },
  { icon: Brain, text: "Analyzing triggers...", duration: 2500 },
  { icon: FileSearch, text: "Evaluating criteria...", duration: 3000 },
  { icon: Zap, text: "Determining pathway...", duration: 2500 },
  { icon: CheckCircle2, text: "Generating reports...", duration: 2000 },
];

export function AIProcessingButton({
  isProcessing,
  onClick,
  disabled = false,
  label,
  variant = "indigo",
  type = "audit",
}: AIProcessingButtonProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);

  const stages = type === "audit" ? AUDIT_STAGES : ASSESS_STAGES;
  const safeIndex = Math.min(currentStage, stages.length - 1);
  const currentData = stages[safeIndex]!;
  const CurrentIcon = isProcessing ? currentData.icon : Sparkles;

  useEffect(() => {
    if (!isProcessing) {
      setCurrentStage(0);
      setProgress(0);
      return;
    }

    const progressInterval = setInterval(() => {
      setProgress((p) => (p >= 100 ? 100 : p + 0.5));
    }, 50);

    let idx = 0;
    const stageInterval = setInterval(() => {
      idx = (idx + 1) % stages.length;
      setCurrentStage(idx);
    }, stages[idx]!.duration);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stageInterval);
    };
  }, [isProcessing, stages]);

  const base =
    variant === "emerald"
      ? "from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/25"
      : "from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-indigo-500/25";

  const glow = variant === "emerald" ? "shadow-emerald-500/50" : "shadow-indigo-500/50";

  return (
    <div className="relative">
      {isProcessing && (
        <div
          className={cn(
            "absolute -inset-1 bg-gradient-to-r rounded-xl blur-lg opacity-75 animate-pulse",
            base
          )}
        />
      )}
      <button
        onClick={onClick}
        disabled={disabled || isProcessing}
        className={cn(
          "relative flex flex-col items-center gap-1 px-8 py-3 bg-gradient-to-r text-white rounded-xl font-medium",
          "disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300",
          base,
          isProcessing
            ? `shadow-xl ${glow}`
            : "shadow-lg hover:shadow-xl hover:-translate-y-0.5",
          "min-w-[220px] overflow-hidden"
        )}
      >
        {isProcessing && (
          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        )}

        <div className="flex items-center gap-2">
          <CurrentIcon className={cn("w-5 h-5", isProcessing && "animate-pulse")} />
          <span className="font-semibold">
            {isProcessing ? currentData.text : label}
          </span>
        </div>

        {isProcessing && (
          <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-white/80 rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </button>

      {isProcessing && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "absolute w-1 h-1 rounded-full animate-float",
                variant === "emerald" ? "bg-emerald-300" : "bg-indigo-300"
              )}
              style={{
                left: `${15 + i * 15}%`,
                animationDelay: `${i * 0.2}s`,
                animationDuration: `${1.5 + Math.random()}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

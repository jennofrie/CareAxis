"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { AIProcessingButton } from "@/components/ui/AIProcessingButton";
import { usePermissions } from "@/hooks/usePermissions";
import { invokeWithAuth } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Copy,
  Check,
  DollarSign,
  CalendarDays,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  FileDown,
} from "lucide-react";
import { exportBudgetForecastPdf } from "@/lib/pdfExportFeatures";

interface CategoryForecast {
  category: string;
  budget: number;
  spent: number;
  projected: number;
  remaining: number;
  status: "on-track" | "warning" | "over";
  recommendation: string;
}

interface ForecastResult {
  categories: CategoryForecast[];
  overallStatus: string;
  alerts: string[];
  recommendations: string[];
}

const STATUS_COLORS = {
  "on-track": { bar: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  warning: { bar: "bg-amber-500", text: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30" },
  over: { bar: "bg-red-500", text: "text-red-700 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30" },
};

export default function BudgetForecasterPage() {
  const { isLoading: permLoading } = usePermissions();

  const [budgets, setBudgets] = useState({ core: "", capacityBuilding: "", capital: "" });
  const [spending, setSpending] = useState({ core: "", capacityBuilding: "", capital: "" });
  const [planStart, setPlanStart] = useState("");
  const [planEnd, setPlanEnd] = useState("");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleForecast = async () => {
    setProcessing(true);
    setResult(null);

    try {
      const { data, error } = await invokeWithAuth("forecast-budget", {
        body: {
          budgets: {
            core: parseFloat(budgets.core) || 0,
            capacityBuilding: parseFloat(budgets.capacityBuilding) || 0,
            capital: parseFloat(budgets.capital) || 0,
          },
          spending: {
            core: parseFloat(spending.core) || 0,
            capacityBuilding: parseFloat(spending.capacityBuilding) || 0,
            capital: parseFloat(spending.capital) || 0,
          },
          dates: { start: planStart, end: planEnd },
        },
      });

      if (error) throw error;
      setResult(data);
      toast.success("Budget forecast generated!");
    } catch (err) {
      console.error("Forecast failed:", err);
      toast.error("Forecast failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(null), 2000);
  };

  const copyAll = async () => {
    if (!result) return;
    const text = result.categories
      .map(
        (c) =>
          `${c.category}: Budget $${c.budget.toLocaleString()} | Spent $${c.spent.toLocaleString()} | Projected $${c.projected.toLocaleString()} | ${c.status}\n${c.recommendation}`
      )
      .join("\n\n");
    await copyToClipboard(text, "all");
  };

  const exportCSV = () => {
    if (!result) return;
    const exportDate = new Date().toLocaleDateString("en-AU");
    let csv = `Budget Forecast Export\nExport Date,${exportDate}\n`;
    if (planStart && planEnd) csv += `Plan Period,${planStart} to ${planEnd}\n`;
    csv += `\nOverall Status,${result.overallStatus}\n\n`;
    csv += `Category,Budget ($),Spent ($),Projected ($),Remaining ($),Status,Recommendation\n`;
    for (const c of result.categories) {
      csv += `"${c.category}",${c.budget},${c.spent},${c.projected},${c.remaining},${c.status},"${c.recommendation.replace(/"/g, '""')}"\n`;
    }
    if (result.alerts && result.alerts.length > 0) {
      csv += `\nAlerts\n`;
      for (const a of result.alerts) csv += `"${a.replace(/"/g, '""')}"\n`;
    }
    if (result.recommendations && result.recommendations.length > 0) {
      csv += `\nRecommendations\n`;
      for (const r of result.recommendations) csv += `"${r.replace(/"/g, '""')}"\n`;
    }
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CareAxis_Budget_Forecast_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("CSV exported successfully!");
  };

  if (permLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Budget Forecaster" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      </div>
    );
  }

  const isValid =
    (budgets.core || budgets.capacityBuilding || budgets.capital) && planStart && planEnd;

  return (
    <div className="flex flex-col h-full">
      <Header title="Budget Forecaster" />

      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Plan Period */}
          <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Plan Period
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Plan Start Date
                </label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="date"
                    value={planStart}
                    onChange={(e) => setPlanStart(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Plan End Date
                </label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="date"
                    value={planEnd}
                    onChange={(e) => setPlanEnd(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Budget Inputs */}
          <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              NDIS Plan Budgets
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { key: "core" as const, label: "Core Supports" },
                { key: "capacityBuilding" as const, label: "Capacity Building" },
                { key: "capital" as const, label: "Capital" },
              ].map((cat) => (
                <div key={cat.key}>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {cat.label} ($)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={budgets[cat.key]}
                      onChange={(e) =>
                        setBudgets((prev) => ({ ...prev, [cat.key]: e.target.value }))
                      }
                      placeholder="0.00"
                      className="pl-10"
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Current Spending */}
          <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Current Spending
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { key: "core" as const, label: "Core Spent" },
                { key: "capacityBuilding" as const, label: "Capacity Building Spent" },
                { key: "capital" as const, label: "Capital Spent" },
              ].map((cat) => (
                <div key={cat.key}>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {cat.label} ($)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={spending[cat.key]}
                      onChange={(e) =>
                        setSpending((prev) => ({ ...prev, [cat.key]: e.target.value }))
                      }
                      placeholder="0.00"
                      className="pl-10"
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Forecast Button */}
          <AIProcessingButton
            variant="indigo"
            onClick={handleForecast}
            isProcessing={processing}
            disabled={!isValid}
            label="Forecast Budget"
          />

          {/* Results */}
          {result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Forecast Results
                </h2>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={exportCSV}
                    variant="outline"
                    className="flex items-center gap-2 text-sm"
                  >
                    <TrendingUp className="h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button
                    onClick={() => {
                      exportBudgetForecastPdf(result!, budgets, planStart, planEnd);
                      toast.success("PDF exported!");
                    }}
                    variant="outline"
                    className="flex items-center gap-2 text-sm"
                  >
                    <FileDown className="h-4 w-4" />
                    Export PDF
                  </Button>
                  <Button
                    onClick={copyAll}
                    variant="outline"
                    className="flex items-center gap-2 text-sm"
                  >
                    {copied === "all" ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    Copy All
                  </Button>
                </div>
              </div>

              {/* Category Cards with Progress Bars */}
              {result.categories.map((cat, idx) => {
                const pct = cat.budget > 0 ? Math.min((cat.projected / cat.budget) * 100, 100) : 0;
                const colors = STATUS_COLORS[cat.status];
                return (
                  <Card
                    key={idx}
                    className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-9 w-9 rounded-lg flex items-center justify-center ${colors.bg}`}
                        >
                          <DollarSign className={`h-5 w-5 ${colors.text}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                            {cat.category}
                          </h3>
                          <Badge
                            className={`text-xs ${colors.bg} ${colors.text} border-0`}
                          >
                            {cat.status === "on-track"
                              ? "On Track"
                              : cat.status === "warning"
                              ? "Warning"
                              : "Over Budget"}
                          </Badge>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          copyToClipboard(
                            `${cat.category}: Budget $${cat.budget} | Spent $${cat.spent} | Projected $${cat.projected}`,
                            `cat-${idx}`
                          )
                        }
                        className="text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        {copied === `cat-${idx}` ? (
                          <Check className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-4 gap-4 mb-4 text-center">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Budget</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          ${cat.budget.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Spent</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          ${cat.spent.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Projected</p>
                        <p className={`font-semibold ${colors.text}`}>
                          ${cat.projected.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Remaining</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          ${cat.remaining.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 mb-3">
                      <div
                        className={`h-3 rounded-full transition-all ${colors.bar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {cat.recommendation}
                    </p>
                  </Card>
                );
              })}

              {/* Alerts */}
              {result.alerts && result.alerts.length > 0 && (
                <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">Alerts</h3>
                  </div>
                  <ul className="space-y-2">
                    {result.alerts.map((alert, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400"
                      >
                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                        {alert}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Recommendations */}
              {result.recommendations && result.recommendations.length > 0 && (
                <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="h-5 w-5 text-indigo-500" />
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      Recommendations
                    </h3>
                  </div>
                  <ul className="space-y-2">
                    {result.recommendations.map((rec, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"
                      >
                        <TrendingUp className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

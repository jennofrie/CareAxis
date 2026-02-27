"use client";

import { useState, useRef, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { AIProcessingButton } from "@/components/ui/AIProcessingButton";
import { GeneratingOverlay } from "@/components/ui/GeneratingOverlay";
import { usePermissions } from "@/hooks/usePermissions";
import { createClient, invokeWithAuth } from "@/lib/supabase/client";
import { toast } from "sonner";
import { parseRosterCSV, computePenaltyStats, type PenaltyStats } from "@/lib/victoriaHolidays";
import { downloadRosterCSV, downloadRosterPDF } from "@/lib/rosterExport";
import {
  Lock,
  Upload,
  FileSpreadsheet,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  X,
  Download,
  HelpCircle,
  Calendar,
  Clock,
  FileText,
  FileDown,
} from "lucide-react";
import { exportRosterPdf } from "@/lib/pdfExportFeatures";

// Sample CSV template content
const CSV_TEMPLATE = `Date,Worker Name,Support Category,Hours,Hourly Rate,Total Cost,Notes
2024-01-08,John Smith,Core - Assistance with daily life,4,65.09,260.36,Monday morning shift
2024-01-08,Jane Doe,Capacity Building - Daily Living Skills,2,67.56,135.12,Skills training session
2024-01-09,John Smith,Core - Community Participation,3,65.09,195.27,Community access
2024-01-09,Maria Garcia,Capital - Assistive Technology,1.5,67.56,101.34,AT setup and training
2024-01-10,Jane Doe,Core - Assistance with daily life,5,65.09,325.45,Full day support
2024-01-10,John Smith,Capacity Building - Social Skills,2,72.89,145.78,Social group facilitation`;

function downloadCSVTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'roster-template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface AnalysisResult {
  weeklyProjections?: { week: string; spending: number; category: string }[];
  categoryBreakdown?: { category: string; budgeted: number; projected: number; variance: number }[];
  alerts?: { type: string; message: string; severity: "warning" | "error" | "info" }[];
  rosterData?: Record<string, string>[];
  summary?: string;
}

export default function RosterAnalyzerPage() {
  const { canAccessFutureFeatures, isLoading: permLoading } = usePermissions();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [coreBudget, setCoreBudget] = useState("");
  const [capacityBudget, setCapacityBudget] = useState("");
  const [capitalBudget, setCapitalBudget] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [applyPenaltyRates, setApplyPenaltyRates] = useState(true);
  const [penaltyStats, setPenaltyStats] = useState<PenaltyStats | null>(null);
  const [generationCount, setGenerationCount] = useState(0);

  const canSubmit = csvContent && (coreBudget || capacityBudget || capitalBudget);

  function handleFileSelect(file: File) {
    if (!file.name.endsWith(".csv")) {
      setError("Please upload a CSV file.");
      return;
    }
    setCsvFile(file);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvContent(content);
      // Parse penalty stats immediately on upload
      if (applyPenaltyRates) {
        const rows = parseRosterCSV(content);
        if (rows.length > 0) {
          setPenaltyStats(computePenaltyStats(rows));
        }
      }
    };
    reader.readAsText(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, []);

  function removeFile() {
    setCsvFile(null);
    setCsvContent(null);
    setPenaltyStats(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleAnalyze() {
    if (!canSubmit) return;
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: fnError } = await invokeWithAuth(
        "analyze-roster",
        {
          body: {
            rosterData: csvContent,
            budgets: {
              core: parseFloat(coreBudget) || 0,
              capacity: parseFloat(capacityBudget) || 0,
              capital: parseFloat(capitalBudget) || 0,
            },
          },
        }
      );

      if (fnError) throw fnError;
      setResult(typeof data === "string" ? JSON.parse(data) : data);
      setGenerationCount((c) => c + 1);
      toast.success("Roster analysis complete!");
    } catch (err: unknown) {
      toast.error("Analysis failed. Please try again.");
      setError(err instanceof Error ? err.message : "Failed to analyze roster.");
    } finally {
      setIsProcessing(false);
    }
  }

  function handleExportCSV() {
    if (!result) return;
    downloadRosterCSV(result);
    toast.success("CSV exported successfully!");
  }

  async function handleExportPDF() {
    if (!result) return;
    try {
      await downloadRosterPDF(result, penaltyStats ?? undefined);
      toast.success("PDF exported successfully!");
    } catch {
      toast.error("PDF export failed. Please try again.");
    }
  }

  if (permLoading) {
    return (
      <>
        <Header title="Roster Analyzer" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-slate-400 dark:text-slate-500 text-sm">
            Loading...
          </div>
        </div>
      </>
    );
  }

  if (!canAccessFutureFeatures) {
    return (
      <>
        <Header title="Roster Analyzer" />
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Card className="max-w-lg mx-auto text-center py-12">
            <Lock className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <Badge variant="premium" className="mb-3">
              Premium Feature
            </Badge>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Roster Analyzer
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">
              Upload rosters and budgets to get AI-powered spending projections,
              category breakdowns, and overspending alerts. Upgrade to Premium to
              unlock.
            </p>
            <Button variant="gradient" onClick={() => (window.location.href = "/app/settings")}>
              Upgrade to Premium
            </Button>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      {isProcessing && (
        <GeneratingOverlay
          variant="audit"
          generationCount={generationCount}
        />
      )}
      <Header title="Roster Analyzer" />
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Upload & Budget Inputs */}
          <Card>
            <CardHeader>
              <CardTitle>Roster & Budget Data</CardTitle>
              <CardDescription>
                Upload a CSV roster file and enter budget allocations for analysis.
              </CardDescription>
            </CardHeader>

            {/* CSV Upload */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-1.5">
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <FileSpreadsheet className="w-4 h-4" />
                  Roster CSV File
                </label>
                <button
                  onClick={downloadCSVTemplate}
                  className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Template
                </button>
              </div>
              {!csvFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200 ${
                    isDragOver
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10"
                      : "border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500"
                  }`}
                >
                  <Upload className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Drag &amp; drop your CSV file here
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    or click to browse
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
                    <span className="font-medium">{csvFile.name}</span>
                    <Badge variant="info">
                      {(csvFile.size / 1024).toFixed(1)} KB
                    </Badge>
                  </div>
                  <button
                    onClick={removeFile}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              {/* CSV Format Help */}
              <div className="mt-2 flex items-start gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <HelpCircle className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-medium">Expected columns:</span> Date, Worker Name, Support Category, Hours, Hourly Rate, Total Cost, Notes (optional). 
                  Use the template above as a starting point.
                </div>
              </div>
            </div>

            {/* Penalty Rates Toggle */}
            <div className="mb-4 flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-900/10 rounded-lg border border-indigo-100 dark:border-indigo-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-500" />
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Apply Victoria Penalty Rates</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Sat 1.25× · Sun 1.35× · Public Holiday 2.25× · Evening 1.15×</p>
                </div>
              </div>
              <button
                onClick={() => {
                  const next = !applyPenaltyRates;
                  setApplyPenaltyRates(next);
                  if (!next) {
                    setPenaltyStats(null);
                  } else if (csvContent) {
                    const rows = parseRosterCSV(csvContent);
                    if (rows.length > 0) setPenaltyStats(computePenaltyStats(rows));
                  }
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  applyPenaltyRates ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600"
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  applyPenaltyRates ? "translate-x-6" : "translate-x-1"
                }`} />
              </button>
            </div>

            {/* Budget Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  <DollarSign className="w-4 h-4" />
                  Core Budget
                </label>
                <Input
                  type="number"
                  value={coreBudget}
                  onChange={(e) => setCoreBudget(e.target.value)}
                  placeholder="e.g. 25000"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  <DollarSign className="w-4 h-4" />
                  Capacity Building Budget
                </label>
                <Input
                  type="number"
                  value={capacityBudget}
                  onChange={(e) => setCapacityBudget(e.target.value)}
                  placeholder="e.g. 15000"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  <DollarSign className="w-4 h-4" />
                  Capital Budget
                </label>
                <Input
                  type="number"
                  value={capitalBudget}
                  onChange={(e) => setCapitalBudget(e.target.value)}
                  placeholder="e.g. 10000"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <AIProcessingButton
                isProcessing={isProcessing}
                onClick={handleAnalyze}
                disabled={!canSubmit}
                label="Analyze Roster"
                variant="indigo"
                type="audit"
              />
            </div>
          </Card>

          {/* Error */}
          {error && (
            <Card className="border-red-300 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </Card>
          )}

          {/* Results */}
          {result && (
            <>
              {/* Export Actions */}
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-700 dark:text-slate-300">Analysis Results</h2>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleExportCSV} className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />
                    Export CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportPDF} className="flex items-center gap-1.5">
                    <Download className="w-4 h-4" />
                    Export PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    exportRosterPdf(result!);
                    toast.success("PDF exported!");
                  }} className="flex items-center gap-1.5">
                    <FileDown className="w-4 h-4" />
                    Branded PDF
                  </Button>
                </div>
              </div>

              {/* Penalty Stats Card */}
              {penaltyStats && penaltyStats.totalShifts > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-indigo-500" />
                      Penalty Rate Breakdown
                    </CardTitle>
                    <CardDescription>Victoria NDIS penalty rates applied to {penaltyStats.totalShifts} shifts</CardDescription>
                  </CardHeader>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {[
                      { label: "Weekday", shifts: penaltyStats.weekdayShifts, hours: penaltyStats.weekdayHours, mult: "1.0×", color: "bg-slate-100 dark:bg-slate-800" },
                      { label: "Saturday", shifts: penaltyStats.saturdayShifts, hours: penaltyStats.saturdayHours, mult: "1.25×", color: "bg-blue-50 dark:bg-blue-900/20" },
                      { label: "Sunday", shifts: penaltyStats.sundayShifts, hours: penaltyStats.sundayHours, mult: "1.35×", color: "bg-indigo-50 dark:bg-indigo-900/20" },
                      { label: "Public Holiday", shifts: penaltyStats.publicHolidayShifts, hours: penaltyStats.publicHolidayHours, mult: "2.25×", color: "bg-amber-50 dark:bg-amber-900/20" },
                    ].map((d) => (
                      <div key={d.label} className={`p-3 rounded-lg ${d.color}`}>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{d.label}</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">{d.shifts} <span className="text-sm font-normal">shifts</span></p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{d.hours.toFixed(1)}h · {d.mult}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Base cost: <span className="font-medium">${penaltyStats.baseTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Adjusted cost: <span className="font-medium text-slate-900 dark:text-white">${penaltyStats.adjustedTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                      Premium: +${penaltyStats.penaltyPremium.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </Card>
              )}

              {/* Summary */}
              {result.summary && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-indigo-500" />
                      Analysis Summary
                    </CardTitle>
                  </CardHeader>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {result.summary}
                  </p>
                </Card>
              )}

              {/* Alerts */}
              {result.alerts && result.alerts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                      Alerts
                    </CardTitle>
                  </CardHeader>
                  <div className="space-y-2">
                    {result.alerts.map((alert, idx) => (
                      <div
                        key={idx}
                        className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                          alert.severity === "error"
                            ? "bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400"
                            : alert.severity === "warning"
                            ? "bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400"
                            : "bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400"
                        }`}
                      >
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{alert.message}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Category Breakdown */}
              {result.categoryBreakdown && result.categoryBreakdown.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-indigo-500" />
                      Category Breakdown
                    </CardTitle>
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="text-left py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">
                            Category
                          </th>
                          <th className="text-right py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">
                            Budgeted
                          </th>
                          <th className="text-right py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">
                            Projected
                          </th>
                          <th className="text-right py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">
                            Variance
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.categoryBreakdown.map((row, idx) => (
                          <tr
                            key={idx}
                            className="border-b border-slate-100 dark:border-slate-800"
                          >
                            <td className="py-2 px-3 text-slate-700 dark:text-slate-300 font-medium">
                              {row.category}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">
                              ${row.budgeted.toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">
                              ${row.projected.toLocaleString()}
                            </td>
                            <td
                              className={`py-2 px-3 text-right font-medium ${
                                row.variance < 0
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              {row.variance < 0 ? "-" : "+"}$
                              {Math.abs(row.variance).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* Weekly Projections */}
              {result.weeklyProjections && result.weeklyProjections.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Weekly Spending Projections</CardTitle>
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="text-left py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">
                            Week
                          </th>
                          <th className="text-left py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">
                            Category
                          </th>
                          <th className="text-right py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">
                            Spending
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.weeklyProjections.map((row, idx) => (
                          <tr
                            key={idx}
                            className="border-b border-slate-100 dark:border-slate-800"
                          >
                            <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                              {row.week}
                            </td>
                            <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                              <Badge variant="info">{row.category}</Badge>
                            </td>
                            <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400 font-medium">
                              ${row.spending.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* Raw Roster Data */}
              {result.rosterData && result.rosterData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Parsed Roster Data</CardTitle>
                    <CardDescription>
                      Showing {result.rosterData.length} rows from your uploaded CSV.
                    </CardDescription>
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          {Object.keys(result.rosterData[0]!).map((key) => (
                            <th
                              key={key}
                              className="text-left py-2 px-3 text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap"
                            >
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.rosterData.slice(0, 50).map((row, idx) => (
                          <tr
                            key={idx}
                            className="border-b border-slate-100 dark:border-slate-800"
                          >
                            {Object.values(row).map((val, cidx) => (
                              <td
                                key={cidx}
                                className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap"
                              >
                                {val}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

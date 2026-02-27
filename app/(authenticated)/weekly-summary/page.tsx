"use client";

import { useState, useMemo, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { AIProcessingButton } from "@/components/ui/AIProcessingButton";
import { usePermissions } from "@/hooks/usePermissions";
import { createClient, invokeWithAuth } from "@/lib/supabase/client";
import { toast } from "sonner";
import { GeneratingOverlay } from "@/components/ui/GeneratingOverlay";
import {
  Copy,
  Check,
  CalendarDays,
  User,
  FileBarChart,
  ClipboardList,
  TrendingUp,
  AlertCircle,
  Zap,
  Download,
  Calendar,
  Hash,
  FileDown,
  History,
  Clock,
  Trash2,
} from "lucide-react";
import { exportWeeklySummaryPdf } from "@/lib/pdfExportFeatures";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
  SheetBody,
} from "@/components/ui/Sheet";

// Date preset utilities
function getDatePresets() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  // This week (Monday to today)
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() + mondayOffset);

  // Last week (previous Monday to Sunday)
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(thisWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(lastWeekStart);
  lastWeekEnd.setDate(lastWeekStart.getDate() + 6);

  // Last 7 days
  const last7DaysStart = new Date(today);
  last7DaysStart.setDate(today.getDate() - 6);

  // This month
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  // Last month
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  return [
    { label: "This Week", start: formatDate(thisWeekStart), end: formatDate(today) },
    { label: "Last Week", start: formatDate(lastWeekStart), end: formatDate(lastWeekEnd) },
    { label: "Last 7 Days", start: formatDate(last7DaysStart), end: formatDate(today) },
    { label: "This Month", start: formatDate(thisMonthStart), end: formatDate(today) },
    { label: "Last Month", start: formatDate(lastMonthStart), end: formatDate(lastMonthEnd) },
  ];
}

const SECTION_COLORS: Record<string, { icon: string; bg: string }> = {
  "KEY ACHIEVEMENTS": { icon: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  "CONCERNS & CHALLENGES": { icon: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
  "GOAL PROGRESS": { icon: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-950/30" },
  "RECOMMENDATIONS FOR NEXT WEEK": { icon: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30" },
  "ACTIVITY SUMMARY": { icon: "text-sky-600", bg: "bg-sky-50 dark:bg-sky-950/30" },
};

const SECTION_ICONS: Record<string, typeof TrendingUp> = {
  "KEY ACHIEVEMENTS": TrendingUp,
  "CONCERNS & CHALLENGES": AlertCircle,
  "GOAL PROGRESS": FileBarChart,
  "RECOMMENDATIONS FOR NEXT WEEK": ClipboardList,
  "ACTIVITY SUMMARY": Calendar,
};

interface SummaryResult {
  success: boolean;
  summary: string;
  note_count: number;
  date_range: { start: string; end: string };
  focus_areas: string[];
}

function parseMarkdownSections(markdown: string): Array<{ title: string; content: string }> {
  const sections: Array<{ title: string; content: string }> = [];
  const parts = markdown.split(/^##\s+/m);
  for (const part of parts) {
    if (!part.trim()) continue;
    const newlineIdx = part.indexOf("\n");
    if (newlineIdx === -1) continue;
    const title = part.substring(0, newlineIdx).trim();
    const content = part.substring(newlineIdx + 1).trim();
    if (title && content) sections.push({ title, content });
  }
  return sections;
}

function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function getDaysBetween(start: string, end: string): number {
  const startDate = new Date(start + "T00:00:00");
  const endDate = new Date(end + "T00:00:00");
  return Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export default function WeeklySummaryPage() {
  const { isLoading: permLoading } = usePermissions();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [participant, setParticipant] = useState("");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [parsedSections, setParsedSections] = useState<Array<{ title: string; content: string }>>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);

  const HISTORY_KEY = "careaxis_weekly_summaries";

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) setHistoryRecords(JSON.parse(stored));
    } catch {}
  }, []);

  const saveToLocalHistory = (resultData: SummaryResult, sections: Array<{ title: string; content: string }>) => {
    try {
      const record = {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        participant_name: participant,
        start_date: startDate,
        end_date: endDate,
        note_count: resultData.note_count,
        result: resultData,
        parsedSections: sections,
      };
      const updated = [record, ...historyRecords].slice(0, 20);
      setHistoryRecords(updated);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to save to local history:", err);
    }
  };

  const loadHistoryRecord = (record: any) => {
    setResult(record.result);
    setParsedSections(record.parsedSections || []);
    setShowHistory(false);
    toast.success("History record loaded");
  };

  const deleteHistoryRecord = (id: string) => {
    const updated = historyRecords.filter((r) => r.id !== id);
    setHistoryRecords(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    toast.success("History record deleted");
  };

  const datePresets = useMemo(() => getDatePresets(), []);

  const applyPreset = (preset: { label: string; start: string; end: string }) => {
    setStartDate(preset.start);
    setEndDate(preset.end);
    setActivePreset(preset.label);
  };

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') setStartDate(value);
    else setEndDate(value);
    setActivePreset(null);
  };

  const exportAsText = () => {
    if (!result || parsedSections.length === 0) return;

    let text = `WEEKLY SUMMARY REPORT\n`;
    text += `Period: ${formatDateDisplay(result.date_range.start)} to ${formatDateDisplay(result.date_range.end)}\n`;
    text += `Notes Analysed: ${result.note_count}\n`;
    if (participant) text += `Participant: ${participant}\n`;
    text += `${"=".repeat(50)}\n\n`;

    for (const section of parsedSections) {
      text += `${section.title.toUpperCase()}\n`;
      text += `${section.content}\n\n`;
    }

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `weekly-summary-${startDate}-to-${endDate}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGenerate = async () => {
    if (!startDate || !endDate) return;
    setProcessing(true);
    setResult(null);
    setParsedSections([]);

    try {
      const { data, error } = await invokeWithAuth("generate-weekly-summary", {
        body: {
          start_date: startDate,
          end_date: endDate,
          participant_name: participant || undefined,
          focus_areas: ["goals", "behavior", "incidents", "community", "skills"],
        },
      });

      if (error) throw error;

      if (!data?.success || !data?.summary) {
        throw new Error(data?.error || "Failed to generate summary");
      }

      setResult(data);
      const sections = parseMarkdownSections(data.summary);
      setParsedSections(sections);
      saveToLocalHistory(data, sections);
      toast.success("Weekly summary generated successfully!");
    } catch (err) {
      console.error("Summary generation failed:", err);
      toast.error("Summary generation failed. Please try again.");
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
    await copyToClipboard(result.summary, "all");
  };

  if (permLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Weekly Summary" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Weekly Summary" />

      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Date Range & Filters */}
          <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Summary Parameters
            </h2>

            {/* Quick Date Presets */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Quick Select
              </label>
              <div className="flex flex-wrap gap-2">
                {datePresets.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => applyPreset(preset)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      activePreset === preset.label
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Zap className="h-3.5 w-3.5" />
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Start Date
                </label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleDateChange('start', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  End Date
                </label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => handleDateChange('end', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Participant Name (optional)
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  value={participant}
                  onChange={(e) => setParticipant(e.target.value)}
                  placeholder="Filter by participant name"
                  className="pl-10"
                />
              </div>
            </div>
          </Card>

          {/* Generate Button */}
          <AIProcessingButton
            variant="indigo"
            onClick={handleGenerate}
            isProcessing={processing}
            disabled={!startDate || !endDate}
            label="Generate Weekly Summary"
          />

          {/* Generating overlay */}
          {processing && (
            <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
              <GeneratingOverlay variant="general" label="Generating Weekly Summary..." />
            </Card>
          )}

          {/* Results */}
          {!processing && result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Summary Results
                </h2>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setShowHistory(true)}
                    variant="outline"
                    className="flex items-center gap-2 text-sm"
                  >
                    <History className="h-4 w-4" />
                    History
                  </Button>
                  <Button
                    onClick={() => {
                      exportWeeklySummaryPdf(parsedSections, participant, startDate, endDate, result!.note_count);
                      toast.success("PDF exported!");
                    }}
                    variant="outline"
                    className="flex items-center gap-2 text-sm"
                  >
                    <FileDown className="h-4 w-4" />
                    Export PDF
                  </Button>
                  <Button
                    onClick={exportAsText}
                    variant="outline"
                    className="flex items-center gap-2 text-sm"
                  >
                    <Download className="h-4 w-4" />
                    Export
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

              {/* Metrics Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 text-center">
                  <Hash className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {result.note_count}
                  </p>
                  <p className="text-sm text-slate-500">Notes Analysed</p>
                </Card>
                <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 text-center">
                  <CalendarDays className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {formatDateDisplay(result.date_range.start)} - {formatDateDisplay(result.date_range.end)}
                  </p>
                  <p className="text-sm text-slate-500">Date Range</p>
                </Card>
                <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 text-center">
                  <TrendingUp className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {getDaysBetween(result.date_range.start, result.date_range.end)}
                  </p>
                  <p className="text-sm text-slate-500">Days in Period</p>
                </Card>
              </div>

              {/* Parsed Summary Sections */}
              {parsedSections.length > 0 && (
                <div className="space-y-4">
                  {parsedSections.map((section, idx) => {
                    const upperTitle = section.title.toUpperCase();
                    const colors = SECTION_COLORS[upperTitle] ?? {
                      icon: "text-slate-600",
                      bg: "bg-slate-50 dark:bg-slate-950/30",
                    };
                    const IconComponent = SECTION_ICONS[upperTitle] ?? ClipboardList;

                    return (
                      <Card
                        key={idx}
                        className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-9 w-9 rounded-lg flex items-center justify-center ${colors.bg}`}
                            >
                              <IconComponent className={`h-5 w-5 ${colors.icon}`} />
                            </div>
                            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                              {section.title}
                            </h3>
                          </div>
                          <button
                            onClick={() =>
                              copyToClipboard(
                                `## ${section.title}\n${section.content}`,
                                `section-${idx}`
                              )
                            }
                            className="text-slate-400 hover:text-indigo-600 transition-colors"
                          >
                            {copied === `section-${idx}` ? (
                              <Check className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                          {section.content}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* History Sheet */}
      <Sheet open={showHistory} onOpenChange={setShowHistory}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Summary History</SheetTitle>
            <SheetDescription>Your recent weekly summaries (stored locally)</SheetDescription>
            <SheetClose onClose={() => setShowHistory(false)} />
          </SheetHeader>
          <SheetBody>
            {historyRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Clock className="h-10 w-10 mb-3" />
                <p className="text-sm">No history yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {historyRecords.map((record) => (
                  <div
                    key={record.id}
                    onClick={() => loadHistoryRecord(record)}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {record.participant_name && (
                          <Badge variant="info">{record.participant_name}</Badge>
                        )}
                        <span className="text-xs text-slate-500">
                          {record.note_count} note{record.note_count !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {formatDateDisplay(record.start_date)} - {formatDateDisplay(record.end_date)}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(record.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteHistoryRecord(record.id); }}
                      className="p-1.5 text-slate-400 hover:text-red-500 transition-colors shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}

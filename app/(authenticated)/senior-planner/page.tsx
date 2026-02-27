"use client";

import { useState, useRef, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AIProcessingButton } from "@/components/ui/AIProcessingButton";
import { usePermissions } from "@/hooks/usePermissions";
import { createClient, invokeWithAuth } from "@/lib/supabase/client";
import { toast } from "sonner";
import { GeneratingOverlay } from "@/components/ui/GeneratingOverlay";
import {
  Upload,
  FileText,
  X,
  Copy,
  Check,
  ShieldCheck,
  Link2,
  Scale,
  FileSearch,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Star,
  History,
  Clock,
  Trash2,
  FileDown,
} from "lucide-react";
import { exportSeniorPlannerPdf } from "@/lib/pdfExportFeatures";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
  SheetBody,
} from "@/components/ui/Sheet";

const DOCUMENT_TYPES = [
  { value: "sc_level_2", label: "SC Level 2 Report" },
  { value: "sc_level_3", label: "SC Level 3 Report" },
  { value: "ot_report", label: "OT Report" },
  { value: "change_of_circumstances", label: "Change of Circumstances" },
  { value: "other", label: "Allied Health Report" },
] as const;

const DIMENSIONS = [
  { key: "compliance", label: "Compliance", icon: ShieldCheck, color: "indigo" },
  { key: "nexus", label: "Nexus", icon: Link2, color: "purple" },
  { key: "vfm", label: "Value for Money", icon: Scale, color: "blue" },
  { key: "evidence", label: "Evidence", icon: FileSearch, color: "emerald" },
  { key: "significantChange", label: "Significant Change", icon: RefreshCw, color: "amber" },
] as const;

const DIM_COLORS: Record<string, { ring: string; text: string; bg: string }> = {
  indigo: { ring: "stroke-indigo-500", text: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-950/30" },
  purple: { ring: "stroke-purple-500", text: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30" },
  blue: { ring: "stroke-blue-500", text: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
  emerald: { ring: "stroke-emerald-500", text: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  amber: { ring: "stroke-amber-500", text: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
  red: { ring: "stroke-red-500", text: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
  slate: { ring: "stroke-slate-500", text: "text-slate-600", bg: "bg-slate-50 dark:bg-slate-950/30" },
};

interface DimensionScore {
  score: number;
  summary: string;
  findings: string[];
}

interface AuditResult {
  dimensions: Record<string, DimensionScore>;
  overallScore: number;
  overallSummary: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:application/pdf;base64,")
      const base64 = result.split(",")[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function parseAuditResponse(data: any): AuditResult {
  // Format 1: Spectra format with scores object
  if (data.scores) {
    const labelMap: Record<string, string> = {
      compliance: "Compliance",
      nexus: "Nexus",
      valueForMoney: "Value for Money",
      evidenceQuality: "Evidence",
      significantChange: "Significant Change",
    };
    // Map from backend score keys to the DIMENSIONS keys used by the UI
    const dimKeyMap: Record<string, string> = {
      compliance: "compliance",
      nexus: "nexus",
      valueForMoney: "vfm",
      evidenceQuality: "evidence",
      significantChange: "significantChange",
    };
    const dimensions: Record<string, DimensionScore> = {};
    for (const [key, label] of Object.entries(labelMap)) {
      if (data.scores[key] != null) {
        const score = data.scores[key];
        const dimKey = dimKeyMap[key] || key;
        dimensions[dimKey] = {
          score,
          summary: `Score: ${score}/100`,
          findings: [],
        };
      }
    }
    // Add strengths as positive findings
    if (data.strengths && Array.isArray(data.strengths)) {
      for (const s of data.strengths) {
        const dimKey = dimKeyMap[s.category] || s.category;
        if (dimensions[dimKey]) {
          dimensions[dimKey].findings.push(`[Strength] ${s.finding}`);
        }
      }
    }
    // Add improvements as findings
    if (data.improvements && Array.isArray(data.improvements)) {
      for (const imp of data.improvements) {
        const dimKey = dimKeyMap[imp.category] || imp.category;
        if (dimensions[dimKey]) {
          dimensions[dimKey].findings.push(`${imp.issue} (${imp.severity})`);
        }
      }
    }
    // Add red flags
    if (data.redFlags && Array.isArray(data.redFlags)) {
      for (const rf of data.redFlags) {
        // Add red flags to the first available dimension or compliance
        const target = dimensions["compliance"] || Object.values(dimensions)[0];
        if (target) {
          target.findings.push(`[Red Flag] ${rf.flag}: ${rf.reason}`);
        }
      }
    }

    // Build summary parts
    const summaryParts: string[] = [];
    if (data.status) summaryParts.push(`Status: ${data.status}`);
    if (data.plannerSummary) summaryParts.push(data.plannerSummary);

    return {
      overallScore: data.overallScore || 0,
      overallSummary: summaryParts.join(" - ") || `Score: ${data.overallScore}/100`,
      dimensions,
    };
  }

  // Format 2: CareAxis format with audit wrapper
  if (data.audit) {
    const audit = data.audit;
    const dimensions: Record<string, DimensionScore> = {};

    if (audit.strengths && audit.strengths.length > 0) {
      dimensions["Strengths"] = {
        score: audit.overallScore || 0,
        summary: "Document strengths",
        findings: audit.strengths || [],
      };
    }
    if (audit.concerns && audit.concerns.length > 0) {
      dimensions["Concerns"] = {
        score: Math.max(0, 100 - (audit.overallScore || 0)),
        summary: "Areas for improvement",
        findings: audit.concerns || [],
      };
    }
    if (audit.recommendations && audit.recommendations.length > 0) {
      dimensions["Recommendations"] = {
        score: 70,
        summary: "Action items",
        findings: audit.recommendations || [],
      };
    }

    return {
      overallScore: audit.overallScore || 0,
      overallSummary: `${audit.strengths?.length || 0} strengths identified. ${audit.recommendations?.length || 0} recommendations.`,
      dimensions,
    };
  }

  return { overallScore: 0, overallSummary: "Unable to parse audit results", dimensions: {} };
}

function CircularProgress({
  score,
  color,
  size = 80,
}: {
  score: number;
  color: string;
  size?: number;
}) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const colors = DIM_COLORS[color] || DIM_COLORS.indigo;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={6}
          className="text-slate-200 dark:text-slate-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={colors.ring}
        />
      </svg>
      <span className={`absolute text-lg font-bold ${colors.text}`}>{score}</span>
    </div>
  );
}

export default function SeniorPlannerPage() {
  const { isLoading: permLoading } = usePermissions();
  const [files, setFiles] = useState<File[]>([]);
  const [context, setContext] = useState("");
  const [docType, setDocType] = useState<string>("sc_level_2");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showAuditHistory, setShowAuditHistory] = useState(false);
  const [auditHistoryRecords, setAuditHistoryRecords] = useState<any[]>([]);
  const [isLoadingAuditHistory, setIsLoadingAuditHistory] = useState(false);
  const [showCocHistory, setShowCocHistory] = useState(false);
  const [cocHistoryRecords, setCocHistoryRecords] = useState<any[]>([]);
  const [isLoadingCocHistory, setIsLoadingCocHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAuditHistory = async () => {
    setIsLoadingAuditHistory(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("synthesized_reports")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      setAuditHistoryRecords(data || []);
    } catch (err) {
      console.error("Failed to load audit history:", err);
      toast.error("Failed to load audit history");
    } finally {
      setIsLoadingAuditHistory(false);
    }
  };

  const loadCocHistory = async () => {
    setIsLoadingCocHistory(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("coc_assessments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      setCocHistoryRecords(data || []);
    } catch (err) {
      console.error("Failed to load CoC history:", err);
      toast.error("Failed to load CoC history");
    } finally {
      setIsLoadingCocHistory(false);
    }
  };

  const loadAuditHistoryRecord = (record: any) => {
    try {
      const parsed = JSON.parse(record.full_report);
      setResult(parsed);
      setShowAuditHistory(false);
      toast.success("Audit history record loaded");
    } catch {
      toast.error("Failed to parse audit history record");
    }
  };

  const loadCocHistoryRecord = (record: any) => {
    try {
      const parsed = typeof record.assessment_data === "string"
        ? JSON.parse(record.assessment_data)
        : record.assessment_data;
      setResult(parseAuditResponse(parsed));
      setShowCocHistory(false);
      toast.success("CoC history record loaded");
    } catch {
      toast.error("Failed to parse CoC history record");
    }
  };

  const deleteAuditHistoryRecord = async (id: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from("synthesized_reports").delete().eq("id", id);
      if (error) throw error;
      setAuditHistoryRecords((prev) => prev.filter((r) => r.id !== id));
      toast.success("Audit history record deleted");
    } catch (err) {
      console.error("Failed to delete audit history record:", err);
      toast.error("Failed to delete record");
    }
  };

  const deleteCocHistoryRecord = async (id: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from("coc_assessments").delete().eq("id", id);
      if (error) throw error;
      setCocHistoryRecords((prev) => prev.filter((r) => r.id !== id));
      toast.success("CoC history record deleted");
    } catch (err) {
      console.error("Failed to delete CoC history record:", err);
      toast.error("Failed to delete record");
    }
  };

  const saveAuditToHistory = async (resultData: AuditResult) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("synthesized_reports").insert({
        user_id: user.id,
        persona_id: "senior-planner",
        persona_title: "Senior Planner Audit",
        document_names: files.map((f) => f.name),
        document_count: files.length,
        agent_mode: false,
        full_report: JSON.stringify(resultData),
      });
    } catch (err) {
      console.error("Failed to save audit to history:", err);
    }
  };

  const saveCocToHistory = async (resultData: AuditResult) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("coc_assessments").insert({
        user_id: user.id,
        assessment_data: resultData,
        document_names: files.map((f) => f.name),
      });
    } catch (err) {
      console.error("Failed to save CoC to history:", err);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAudit = async () => {
    if (files.length === 0 && !context) return;
    setProcessing(true);
    setResult(null);

    try {
      const supabase = createClient();
      const body: Record<string, any> = { documentType: docType };

      if (files.length > 0) {
        const file = files[0];
        if (file.type === "application/pdf") {
          // Send PDF as base64
          const base64 = await fileToBase64(file);
          body.fileData = base64;
          body.fileMimeType = "application/pdf";
          if (context) {
            body.documentContent = context;
          }
        } else {
          // Read as text
          const text = await file.text();
          body.documentContent = `${context ? context + "\n\n" : ""}${text}`;
        }
      } else if (context) {
        // Context only, no file
        body.documentContent = context;
      }

      const { data, error } = await invokeWithAuth("senior-planner-audit", { body });

      if (error) throw error;
      const parsed = parseAuditResponse(data);
      setResult(parsed);
      await saveAuditToHistory(parsed);
      toast.success("Plan audit completed successfully!");
    } catch (err) {
      console.error("Audit failed:", err);
      toast.error("Audit failed. Please try again.");
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

  // Determine which dimension entries to render - use DIMENSIONS config for Spectra format,
  // or fall back to iterating result.dimensions keys for CareAxis format
  const getDimensionEntries = (): Array<{
    key: string;
    label: string;
    icon: any;
    color: string;
    data: DimensionScore;
  }> => {
    if (!result) return [];

    const entries: Array<{
      key: string;
      label: string;
      icon: any;
      color: string;
      data: DimensionScore;
    }> = [];

    // First try standard DIMENSIONS (Spectra format)
    for (const dim of DIMENSIONS) {
      if (result.dimensions[dim.key]) {
        entries.push({
          key: dim.key,
          label: dim.label,
          icon: dim.icon,
          color: dim.color,
          data: result.dimensions[dim.key],
        });
      }
    }

    // If no standard dimensions matched, use CareAxis format keys
    if (entries.length === 0) {
      const fallbackIcons: Record<string, { icon: any; color: string }> = {
        Strengths: { icon: Star, color: "emerald" },
        Concerns: { icon: AlertTriangle, color: "amber" },
        Recommendations: { icon: ShieldCheck, color: "indigo" },
      };
      for (const [key, data] of Object.entries(result.dimensions)) {
        const fb = fallbackIcons[key] || { icon: FileSearch, color: "slate" };
        entries.push({
          key,
          label: key,
          icon: fb.icon,
          color: fb.color,
          data: data as DimensionScore,
        });
      }
    }

    return entries;
  };

  const copyAll = async () => {
    if (!result) return;
    const dimEntries = getDimensionEntries();
    const text = dimEntries
      .map((d) => {
        return `## ${d.label}: ${d.data.score}/100\n${d.data.summary}\n\nFindings:\n${d.data.findings.map((f) => `- ${f}`).join("\n")}`;
      })
      .join("\n\n");
    await copyToClipboard(text, "all");
  };

  if (permLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Senior NDIS Planner" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      </div>
    );
  }

  const dimEntries = getDimensionEntries();

  return (
    <div className="flex flex-col h-full">
      <Header title="Senior NDIS Planner" />

      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Document Upload */}
          <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Upload NDIS Plan Documents
            </h2>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-400 transition-colors"
            >
              <Upload className="h-10 w-10 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-400 mb-1">
                Click to upload NDIS plan documents
              </p>
              <p className="text-sm text-slate-500">PDF, DOCX, or TXT files</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-lg px-4 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-indigo-600" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {file.name}
                      </span>
                    </div>
                    <button onClick={() => removeFile(idx)} className="text-slate-400 hover:text-red-500">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Document Type Selector */}
          <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Document Type
            </h2>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {DOCUMENT_TYPES.map((dt) => (
                <option key={dt.value} value={dt.value}>
                  {dt.label}
                </option>
              ))}
            </select>
          </Card>

          {/* Additional Context */}
          <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Additional Context
            </h2>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Provide any additional context about the plan, participant, or areas of concern..."
              className="w-full min-h-[200px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
            />
          </Card>

          {/* Audit Button */}
          <AIProcessingButton
            variant="indigo"
            type="audit"
            onClick={handleAudit}
            isProcessing={processing}
            disabled={files.length === 0 && !context}
            label="Audit Plan"
          />

          {/* Generating overlay */}
          {processing && (
            <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
              <GeneratingOverlay variant="audit" label="Auditing Plan..." />
            </Card>
          )}

          {/* Results */}
          {!processing && result && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Audit Results
                </h2>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => { setShowAuditHistory(true); loadAuditHistory(); }}
                    variant="outline"
                    className="flex items-center gap-2 text-sm"
                  >
                    <History className="h-4 w-4" />
                    Audit History
                  </Button>
                  <Button
                    onClick={() => { setShowCocHistory(true); loadCocHistory(); }}
                    variant="outline"
                    className="flex items-center gap-2 text-sm"
                  >
                    <History className="h-4 w-4" />
                    CoC History
                  </Button>
                  <Button
                    onClick={() => {
                      exportSeniorPlannerPdf(result!, files.map(f => f.name));
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

              {/* Overall Score */}
              {result.overallScore !== undefined && (
                <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 text-center">
                  <CircularProgress score={result.overallScore} color="indigo" size={100} />
                  <p className="mt-3 font-semibold text-slate-900 dark:text-slate-100">
                    Overall Score
                  </p>
                  {result.overallSummary && (
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
                      {result.overallSummary}
                    </p>
                  )}
                </Card>
              )}

              {/* Dimension Score Cards */}
              {dimEntries.length > 0 && (
                <div className={`grid grid-cols-1 sm:grid-cols-2 ${dimEntries.length >= 5 ? "lg:grid-cols-5" : dimEntries.length >= 3 ? "lg:grid-cols-3" : "lg:grid-cols-2"} gap-4`}>
                  {dimEntries.map((dim) => {
                    const Icon = dim.icon;
                    return (
                      <Card
                        key={dim.key}
                        className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 text-center"
                      >
                        <CircularProgress score={dim.data.score} color={dim.color} size={70} />
                        <div className="flex items-center justify-center gap-1 mt-2">
                          <Icon className={`h-4 w-4 ${(DIM_COLORS[dim.color] || DIM_COLORS.indigo).text}`} />
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {dim.label}
                          </p>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Detailed Findings */}
              {dimEntries.map((dim) => {
                const Icon = dim.icon;
                const colors = DIM_COLORS[dim.color] || DIM_COLORS.indigo;
                const isExpanded = expanded[dim.key] ?? false;

                return (
                  <Card
                    key={dim.key}
                    className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800"
                  >
                    <button
                      onClick={() => toggleExpanded(dim.key)}
                      className="w-full flex items-center justify-between p-6"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-9 w-9 rounded-lg flex items-center justify-center ${colors.bg}`}
                        >
                          <Icon className={`h-5 w-5 ${colors.text}`} />
                        </div>
                        <div className="text-left">
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                            {dim.label}
                          </h3>
                          <p className="text-sm text-slate-500">Score: {dim.data.score}/100</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(
                              `${dim.label}: ${dim.data.score}/100\n${dim.data.summary}\n\n${dim.data.findings.map((f) => `- ${f}`).join("\n")}`,
                              dim.key
                            );
                          }}
                          className="text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                          {copied === dim.key ? (
                            <Check className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-6 pb-6 border-t border-slate-200 dark:border-slate-800 pt-4">
                        <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
                          {dim.data.summary}
                        </p>
                        {dim.data.findings.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                              Findings
                            </p>
                            <ul className="space-y-2">
                              {dim.data.findings.map((finding, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"
                                >
                                  <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${colors.ring.replace("stroke-", "bg-")}`} />
                                  {finding}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Audit History Sheet */}
      <Sheet open={showAuditHistory} onOpenChange={setShowAuditHistory}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Audit History</SheetTitle>
            <SheetDescription>Your recent plan audits</SheetDescription>
            <SheetClose onClose={() => setShowAuditHistory(false)} />
          </SheetHeader>
          <SheetBody>
            {isLoadingAuditHistory ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse bg-slate-100 dark:bg-slate-800 h-16 rounded-lg" />
                ))}
              </div>
            ) : auditHistoryRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Clock className="h-10 w-10 mb-3" />
                <p className="text-sm">No history yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {auditHistoryRecords.map((record) => (
                  <div
                    key={record.id}
                    onClick={() => loadAuditHistoryRecord(record)}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="info">{record.persona_title}</Badge>
                        <span className="text-xs text-slate-500">{record.document_count} doc{record.document_count !== 1 ? "s" : ""}</span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {new Date(record.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteAuditHistoryRecord(record.id); }}
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

      {/* CoC History Sheet */}
      <Sheet open={showCocHistory} onOpenChange={setShowCocHistory}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>CoC Assessment History</SheetTitle>
            <SheetDescription>Your recent CoC assessments</SheetDescription>
            <SheetClose onClose={() => setShowCocHistory(false)} />
          </SheetHeader>
          <SheetBody>
            {isLoadingCocHistory ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse bg-slate-100 dark:bg-slate-800 h-16 rounded-lg" />
                ))}
              </div>
            ) : cocHistoryRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Clock className="h-10 w-10 mb-3" />
                <p className="text-sm">No history yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cocHistoryRecords.map((record) => (
                  <div
                    key={record.id}
                    onClick={() => loadCocHistoryRecord(record)}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="info">CoC Assessment</Badge>
                        {record.document_names?.length > 0 && (
                          <span className="text-xs text-slate-500">{record.document_names.length} doc{record.document_names.length !== 1 ? "s" : ""}</span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">
                        {new Date(record.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteCocHistoryRecord(record.id); }}
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

"use client";

import { useState, useEffect } from "react";
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
  Copy,
  Check,
  Download,
  FileText,
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
  ClipboardList,
  Stethoscope,
  ArrowUpDown,
  HelpCircle,
  FolderOpen,
  Flag,
  AlertCircle,
  History,
  Clock,
  Trash2,
  FileDown,
} from "lucide-react";
import { exportCoCCoverLetterPdf } from "@/lib/pdfExportFeatures";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
  SheetBody,
} from "@/components/ui/Sheet";

// ---- Types ----

interface Participant {
  name: string;
  dateOfBirth: string;
  ndisNumber: string;
  address: string;
  email: string;
  phone: string;
}

interface PlanInfo {
  startDate: string;
  endDate: string;
  reportingPeriod: string;
}

interface KeyChange {
  title: string;
  description: string;
}

interface Assessment {
  measure: string;
  score: string;
  interpretation: string;
}

interface ClinicalEvidence {
  introText: string;
  assessments: Assessment[];
  conclusionText: string;
}

interface SCComparison {
  currentLevel: string;
  recommendedLevel: string;
  currentHoursAnnual: string;
  recommendedHoursAnnual: string;
  currentHoursMonthly: string;
  recommendedHoursMonthly: string;
}

interface SCActivity {
  area: string;
  description: string;
}

interface SCRequest {
  introText: string;
  comparison: SCComparison;
  activitiesIntro: string;
  activities: SCActivity[];
}

interface AnticipatedQuestion {
  question: string;
  response: string;
}

interface IncludedDocument {
  name: string;
  date: string;
  pages: string;
}

interface ProgressiveDocument {
  name: string;
  expectedDate: string;
}

interface Documents {
  included: IncludedDocument[];
  progressive: ProgressiveDocument[];
  progressiveNote: string;
}

interface Closing {
  statementText: string;
  priorityReasons: string[];
}

interface CoverLetterData {
  participant: Participant;
  plan: PlanInfo;
  overview: { summaryText: string };
  keyChanges: KeyChange[];
  clinicalEvidence: ClinicalEvidence;
  scRequest: SCRequest;
  anticipatedQuestions: AnticipatedQuestion[];
  documents: Documents;
  closing: Closing;
}

// ---- Helpers ----

function formatExportTxt(data: CoverLetterData): string {
  const today = new Date().toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const lines: string[] = [
    "CHANGE OF CIRCUMSTANCES COVER LETTER",
    "=====================================",
    `Date: ${today}`,
    "",
    "PARTICIPANT DETAILS",
    "-------------------",
    `Name: ${data.participant.name}`,
    `NDIS Number: ${data.participant.ndisNumber}`,
    `Date of Birth: ${data.participant.dateOfBirth}`,
    `Address: ${data.participant.address}`,
    `Email: ${data.participant.email}`,
    `Phone: ${data.participant.phone}`,
    "",
    "PLAN DETAILS",
    "------------",
    `Plan Period: ${data.plan.startDate} to ${data.plan.endDate}`,
    `Reporting Period: ${data.plan.reportingPeriod}`,
    "",
    "OVERVIEW",
    "--------",
    data.overview.summaryText,
    "",
    "KEY CHANGES IN CIRCUMSTANCES",
    "----------------------------",
  ];

  data.keyChanges.forEach((c, i) => {
    lines.push(`${i + 1}. ${c.title}`);
    lines.push(`   ${c.description}`);
    lines.push("");
  });

  lines.push("CLINICAL EVIDENCE");
  lines.push("-----------------");
  lines.push(data.clinicalEvidence.introText);
  lines.push("");
  if (data.clinicalEvidence.assessments.length > 0) {
    lines.push("Assessment Results:");
    data.clinicalEvidence.assessments.forEach((a) => {
      lines.push(`  - ${a.measure}: ${a.score} (${a.interpretation})`);
    });
    lines.push("");
  }
  lines.push(data.clinicalEvidence.conclusionText);
  lines.push("");

  lines.push("SUPPORT COORDINATION REQUEST");
  lines.push("----------------------------");
  lines.push(data.scRequest.introText);
  lines.push("");
  lines.push("Comparison:");
  lines.push(
    `  Current Level: ${data.scRequest.comparison.currentLevel}`
  );
  lines.push(
    `  Recommended Level: ${data.scRequest.comparison.recommendedLevel}`
  );
  lines.push(
    `  Current Hours (Annual): ${data.scRequest.comparison.currentHoursAnnual}`
  );
  lines.push(
    `  Recommended Hours (Annual): ${data.scRequest.comparison.recommendedHoursAnnual}`
  );
  lines.push(
    `  Current Hours (Monthly): ${data.scRequest.comparison.currentHoursMonthly}`
  );
  lines.push(
    `  Recommended Hours (Monthly): ${data.scRequest.comparison.recommendedHoursMonthly}`
  );
  lines.push("");
  lines.push(data.scRequest.activitiesIntro);
  data.scRequest.activities.forEach((a) => {
    lines.push(`  - ${a.area}: ${a.description}`);
  });
  lines.push("");

  lines.push("ANTICIPATED QUESTIONS");
  lines.push("---------------------");
  data.anticipatedQuestions.forEach((q, i) => {
    lines.push(`Q${i + 1}: ${q.question}`);
    lines.push(`A${i + 1}: ${q.response}`);
    lines.push("");
  });

  lines.push("SUPPORTING DOCUMENTS");
  lines.push("--------------------");
  lines.push("Included:");
  data.documents.included.forEach((d) => {
    lines.push(`  - ${d.name} (${d.date}, ${d.pages} pages)`);
  });
  if (data.documents.progressive.length > 0) {
    lines.push("");
    lines.push("Progressive:");
    data.documents.progressive.forEach((d) => {
      lines.push(`  - ${d.name} (Expected: ${d.expectedDate})`);
    });
    if (data.documents.progressiveNote) {
      lines.push(`  Note: ${data.documents.progressiveNote}`);
    }
  }
  lines.push("");

  lines.push("CLOSING STATEMENT");
  lines.push("-----------------");
  lines.push(data.closing.statementText);
  lines.push("");
  lines.push("Priority Reasons:");
  data.closing.priorityReasons.forEach((r, i) => {
    lines.push(`  ${i + 1}. ${r}`);
  });

  return lines.join("\n");
}

// ---- Component ----

export default function CoCCoverLetterPage() {
  const { isLoading: permLoading } = usePermissions();
  const [scLevel, setScLevel] = useState<2 | 3>(2);
  const [reportText, setReportText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [coverLetterData, setCoverLetterData] =
    useState<CoverLetterData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<
    Record<number, boolean>
  >({});
  const [showHistory, setShowHistory] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const canSubmit = reportText.trim().length > 0;

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("coc_cover_letter_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      setHistoryRecords(data || []);
    } catch (err) {
      console.error("Failed to load history:", err);
      toast.error("Failed to load history");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const loadHistoryRecord = (record: any) => {
    try {
      const parsed = typeof record.cover_letter_data === "string"
        ? JSON.parse(record.cover_letter_data)
        : record.cover_letter_data;
      setCoverLetterData(parsed);
      setShowHistory(false);
      toast.success("History record loaded");
    } catch {
      toast.error("Failed to parse history record");
    }
  };

  const deleteHistoryRecord = async (id: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from("coc_cover_letter_history").delete().eq("id", id);
      if (error) throw error;
      setHistoryRecords((prev) => prev.filter((r) => r.id !== id));
      toast.success("History record deleted");
    } catch (err) {
      console.error("Failed to delete history record:", err);
      toast.error("Failed to delete record");
    }
  };

  const saveToHistory = async (data: CoverLetterData) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const inputHash = btoa(reportText.slice(0, 200));
      await supabase.from("coc_cover_letter_history").insert({
        user_id: user.id,
        cover_letter_data: data,
        sc_level: String(scLevel),
        file_name: null,
        input_hash: inputHash,
      });
    } catch (err) {
      console.error("Failed to save to history:", err);
    }
  };

  const toggleQuestion = (idx: number) => {
    setExpandedQuestions((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(null), 2000);
  };

  const handleGenerate = async () => {
    if (!canSubmit) return;
    setIsProcessing(true);
    setError(null);
    setCoverLetterData(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      // Cache check
      const inputHash = btoa(reportText.slice(0, 200));
      if (user) {
        const { data: cached } = await supabase
          .from("coc_cover_letter_history")
          .select("cover_letter_data")
          .eq("input_hash", inputHash)
          .eq("user_id", user.id)
          .limit(1)
          .single();

        if (cached?.cover_letter_data) {
          const parsed = typeof cached.cover_letter_data === "string"
            ? JSON.parse(cached.cover_letter_data)
            : cached.cover_letter_data;
          setCoverLetterData(parsed);
          toast.info("Loaded from cache");
          setIsProcessing(false);
          return;
        }
      }

      const { data, error: fnError } = await invokeWithAuth(
        "coc-cover-letter-generator",
        {
          body: {
            reportText,
            scLevel,
          },
        }
      );

      if (fnError) throw fnError;

      if (!data?.success || !data?.coverLetterData) {
        throw new Error("Failed to generate cover letter. Please try again.");
      }

      setCoverLetterData(data.coverLetterData);
      await saveToHistory(data.coverLetterData);
      toast.success("Cover letter generated successfully!");
    } catch (err: unknown) {
      console.error("CoC cover letter generation failed:", err);
      toast.error("Generation failed. Please try again.");
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate cover letter."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportTxt = () => {
    if (!coverLetterData) return;
    const txt = formatExportTxt(coverLetterData);
    const blob = new Blob([txt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const name = coverLetterData.participant.name
      ? coverLetterData.participant.name.replace(/\s+/g, "_")
      : "Participant";
    a.download = `CoC_Cover_Letter_${name}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const CopyButton = ({
    sectionKey,
    text,
  }: {
    sectionKey: string;
    text: string;
  }) => (
    <button
      onClick={() => copyToClipboard(text, sectionKey)}
      className="text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
      title="Copy section"
    >
      {copied === sectionKey ? (
        <Check className="h-4 w-4 text-emerald-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </button>
  );

  if (permLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="CoC Cover Letter Generator" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="CoC Cover Letter Generator" />

      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* SC Level Toggle */}
          <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Support Coordinator Level
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setScLevel(2)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  scLevel === 2
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      scLevel === 2 ? "bg-indigo-500" : "bg-slate-300 dark:bg-slate-600"
                    }`}
                  />
                  <span
                    className={`font-semibold text-sm ${
                      scLevel === 2
                        ? "text-indigo-700 dark:text-indigo-300"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    Level 2
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 ml-5">
                  Support Coordinator
                </p>
              </button>
              <button
                onClick={() => setScLevel(3)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  scLevel === 3
                    ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      scLevel === 3 ? "bg-purple-500" : "bg-slate-300 dark:bg-slate-600"
                    }`}
                  />
                  <span
                    className={`font-semibold text-sm ${
                      scLevel === 3
                        ? "text-purple-700 dark:text-purple-300"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    Level 3
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 ml-5">
                  Senior Support Coordinator
                </p>
              </button>
            </div>
          </Card>

          {/* Report Text Input */}
          <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              SC Progress Report
            </h2>
            <textarea
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder="Paste your SC progress report here. The AI will extract all participant details, circumstances, and generate a professional Change of Circumstances cover letter..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
              style={{ minHeight: "300px" }}
            />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {reportText.length > 0
                ? `${reportText.length.toLocaleString()} characters`
                : "Paste your full progress report text above"}
            </p>
          </Card>

          {/* Generate Button */}
          <AIProcessingButton
            variant="indigo"
            onClick={handleGenerate}
            isProcessing={isProcessing}
            disabled={!canSubmit}
            label="Generate Cover Letter"
            type="assess"
          />

          {/* Generating overlay */}
          {isProcessing && (
            <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
              <GeneratingOverlay variant="coc" label="Generating Cover Letter..." />
            </Card>
          )}

          {/* Error */}
          {!isProcessing && error && (
            <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-red-300 dark:border-red-800 p-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            </Card>
          )}

          {/* Results */}
          {!isProcessing && coverLetterData && (
            <div className="space-y-4">
              {/* Header with Export */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Generated Cover Letter
                </h2>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => { setShowHistory(true); loadHistory(); }}
                    variant="outline"
                    className="flex items-center gap-2 text-sm"
                  >
                    <History className="h-4 w-4" />
                    History
                  </Button>
                  <Button
                    onClick={() => {
                      exportCoCCoverLetterPdf(coverLetterData!, scLevel);
                      toast.success("PDF exported!");
                    }}
                    variant="outline"
                    className="flex items-center gap-2 text-sm"
                  >
                    <FileDown className="h-4 w-4" />
                    Export PDF
                  </Button>
                  <Button
                    onClick={handleExportTxt}
                    variant="outline"
                    className="flex items-center gap-2 text-sm"
                  >
                    <Download className="h-4 w-4" />
                    Export as TXT
                  </Button>
                </div>
              </div>

              {/* Section 1: Participant & Plan Overview */}
              <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-indigo-600" />
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      Participant & Plan Overview
                    </h3>
                  </div>
                  <CopyButton
                    sectionKey="participant"
                    text={`Name: ${coverLetterData.participant.name}\nNDIS Number: ${coverLetterData.participant.ndisNumber}\nDOB: ${coverLetterData.participant.dateOfBirth}\nPlan: ${coverLetterData.plan.startDate} to ${coverLetterData.plan.endDate}`}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">
                        Name
                      </p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {coverLetterData.participant.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">
                        NDIS Number
                      </p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {coverLetterData.participant.ndisNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">
                        Date of Birth
                      </p>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {coverLetterData.participant.dateOfBirth}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">
                        Plan Period
                      </p>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {coverLetterData.plan.startDate} to{" "}
                        {coverLetterData.plan.endDate}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">
                        Reporting Period
                      </p>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {coverLetterData.plan.reportingPeriod}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">
                        Contact
                      </p>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {coverLetterData.participant.email}
                        {coverLetterData.participant.phone &&
                          ` | ${coverLetterData.participant.phone}`}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Section 2: Overview */}
              <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-indigo-600" />
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      Overview
                    </h3>
                  </div>
                  <CopyButton
                    sectionKey="overview"
                    text={coverLetterData.overview.summaryText}
                  />
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {coverLetterData.overview.summaryText}
                </p>
              </Card>

              {/* Section 3: Key Changes */}
              {coverLetterData.keyChanges.length > 0 && (
                <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-purple-600" />
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                        Key Changes in Circumstances
                      </h3>
                    </div>
                    <CopyButton
                      sectionKey="keyChanges"
                      text={coverLetterData.keyChanges
                        .map((c) => `${c.title}: ${c.description}`)
                        .join("\n\n")}
                    />
                  </div>
                  <div className="space-y-3">
                    {coverLetterData.keyChanges.map((change, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-100 dark:border-slate-700/50"
                      >
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                          {change.title}
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                          {change.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Section 4: Clinical Evidence */}
              <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-emerald-600" />
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      Clinical Evidence
                    </h3>
                  </div>
                  <CopyButton
                    sectionKey="clinical"
                    text={`${coverLetterData.clinicalEvidence.introText}\n\n${coverLetterData.clinicalEvidence.assessments.map((a) => `${a.measure}: ${a.score} - ${a.interpretation}`).join("\n")}\n\n${coverLetterData.clinicalEvidence.conclusionText}`}
                  />
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">
                  {coverLetterData.clinicalEvidence.introText}
                </p>
                {coverLetterData.clinicalEvidence.assessments.length > 0 && (
                  <div className="overflow-x-auto mb-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="text-left py-2 pr-4 font-medium text-slate-500">
                            Measure
                          </th>
                          <th className="text-left py-2 pr-4 font-medium text-slate-500">
                            Score
                          </th>
                          <th className="text-left py-2 font-medium text-slate-500">
                            Interpretation
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {coverLetterData.clinicalEvidence.assessments.map(
                          (assessment, idx) => (
                            <tr
                              key={idx}
                              className="border-b border-slate-100 dark:border-slate-800"
                            >
                              <td className="py-2 pr-4 text-slate-700 dark:text-slate-300 font-medium">
                                {assessment.measure}
                              </td>
                              <td className="py-2 pr-4">
                                <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-indigo-600 dark:text-indigo-400">
                                  {assessment.score}
                                </code>
                              </td>
                              <td className="py-2 text-slate-600 dark:text-slate-400">
                                {assessment.interpretation}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {coverLetterData.clinicalEvidence.conclusionText}
                </p>
              </Card>

              {/* Section 5: SC Request */}
              <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="h-5 w-5 text-indigo-600" />
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      Support Coordination Request
                    </h3>
                  </div>
                  <CopyButton
                    sectionKey="scRequest"
                    text={`${coverLetterData.scRequest.introText}\n\nCurrent: ${coverLetterData.scRequest.comparison.currentLevel} (${coverLetterData.scRequest.comparison.currentHoursAnnual} hrs/yr)\nRecommended: ${coverLetterData.scRequest.comparison.recommendedLevel} (${coverLetterData.scRequest.comparison.recommendedHoursAnnual} hrs/yr)`}
                  />
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">
                  {coverLetterData.scRequest.introText}
                </p>

                {/* Comparison Table */}
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-2 pr-4 font-medium text-slate-500">
                          Metric
                        </th>
                        <th className="text-left py-2 pr-4 font-medium text-slate-500">
                          Current
                        </th>
                        <th className="text-left py-2 font-medium text-slate-500">
                          Recommended
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-2 pr-4 text-slate-700 dark:text-slate-300 font-medium">
                          Level
                        </td>
                        <td className="py-2 pr-4 text-slate-600 dark:text-slate-400">
                          {coverLetterData.scRequest.comparison.currentLevel}
                        </td>
                        <td className="py-2">
                          <Badge variant="info">
                            {
                              coverLetterData.scRequest.comparison
                                .recommendedLevel
                            }
                          </Badge>
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-2 pr-4 text-slate-700 dark:text-slate-300 font-medium">
                          Hours (Annual)
                        </td>
                        <td className="py-2 pr-4 text-slate-600 dark:text-slate-400">
                          {
                            coverLetterData.scRequest.comparison
                              .currentHoursAnnual
                          }
                        </td>
                        <td className="py-2 font-medium text-indigo-600 dark:text-indigo-400">
                          {
                            coverLetterData.scRequest.comparison
                              .recommendedHoursAnnual
                          }
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-2 pr-4 text-slate-700 dark:text-slate-300 font-medium">
                          Hours (Monthly)
                        </td>
                        <td className="py-2 pr-4 text-slate-600 dark:text-slate-400">
                          {
                            coverLetterData.scRequest.comparison
                              .currentHoursMonthly
                          }
                        </td>
                        <td className="py-2 font-medium text-indigo-600 dark:text-indigo-400">
                          {
                            coverLetterData.scRequest.comparison
                              .recommendedHoursMonthly
                          }
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Activities */}
                {coverLetterData.scRequest.activities.length > 0 && (
                  <>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
                      {coverLetterData.scRequest.activitiesIntro}
                    </p>
                    <div className="space-y-2">
                      {coverLetterData.scRequest.activities.map(
                        (activity, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-3 text-sm"
                          >
                            <Badge variant="premium" className="shrink-0 mt-0.5">
                              {activity.area}
                            </Badge>
                            <span className="text-slate-600 dark:text-slate-400">
                              {activity.description}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </>
                )}
              </Card>

              {/* Section 6: Anticipated Questions */}
              {coverLetterData.anticipatedQuestions.length > 0 && (
                <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="h-5 w-5 text-amber-500" />
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                        Anticipated Questions
                      </h3>
                    </div>
                    <CopyButton
                      sectionKey="questions"
                      text={coverLetterData.anticipatedQuestions
                        .map(
                          (q) => `Q: ${q.question}\nA: ${q.response}`
                        )
                        .join("\n\n")}
                    />
                  </div>
                  <div className="space-y-2">
                    {coverLetterData.anticipatedQuestions.map((qa, idx) => (
                      <div
                        key={idx}
                        className="border border-slate-100 dark:border-slate-700/50 rounded-lg overflow-hidden"
                      >
                        <button
                          onClick={() => toggleQuestion(idx)}
                          className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100 pr-4">
                            {qa.question}
                          </span>
                          {expandedQuestions[idx] ? (
                            <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                          )}
                        </button>
                        {expandedQuestions[idx] && (
                          <div className="px-3 pb-3 border-t border-slate-100 dark:border-slate-700/50">
                            <p className="text-sm text-slate-600 dark:text-slate-400 pt-3 leading-relaxed">
                              {qa.response}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Section 7: Documents */}
              <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      Supporting Documents
                    </h3>
                  </div>
                  <CopyButton
                    sectionKey="documents"
                    text={`Included:\n${coverLetterData.documents.included.map((d) => `- ${d.name} (${d.date}, ${d.pages} pages)`).join("\n")}\n\nProgressive:\n${coverLetterData.documents.progressive.map((d) => `- ${d.name} (Expected: ${d.expectedDate})`).join("\n")}`}
                  />
                </div>

                {coverLetterData.documents.included.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs uppercase tracking-wide text-slate-500 mb-2">
                      Included Documents
                    </h4>
                    <div className="space-y-2">
                      {coverLetterData.documents.included.map((doc, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-indigo-600" />
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              {doc.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span>{doc.date}</span>
                            <span>{doc.pages} pages</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {coverLetterData.documents.progressive.length > 0 && (
                  <div>
                    <h4 className="text-xs uppercase tracking-wide text-slate-500 mb-2">
                      Progressive Documents
                    </h4>
                    <div className="space-y-2">
                      {coverLetterData.documents.progressive.map((doc, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-amber-500" />
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              {doc.name}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500">
                            Expected: {doc.expectedDate}
                          </span>
                        </div>
                      ))}
                    </div>
                    {coverLetterData.documents.progressiveNote && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 italic">
                        {coverLetterData.documents.progressiveNote}
                      </p>
                    )}
                  </div>
                )}
              </Card>

              {/* Section 8: Closing Statement */}
              <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Flag className="h-5 w-5 text-red-500" />
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      Closing Statement
                    </h3>
                  </div>
                  <CopyButton
                    sectionKey="closing"
                    text={`${coverLetterData.closing.statementText}\n\nPriority Reasons:\n${coverLetterData.closing.priorityReasons.map((r, i) => `${i + 1}. ${r}`).join("\n")}`}
                  />
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-4 leading-relaxed whitespace-pre-wrap">
                  {coverLetterData.closing.statementText}
                </p>
                {coverLetterData.closing.priorityReasons.length > 0 && (
                  <div>
                    <h4 className="text-xs uppercase tracking-wide text-slate-500 mb-2">
                      Priority Reasons
                    </h4>
                    <ul className="space-y-1.5">
                      {coverLetterData.closing.priorityReasons.map(
                        (reason, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"
                          >
                            <span className="text-indigo-500 font-medium shrink-0">
                              {idx + 1}.
                            </span>
                            {reason}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* History Sheet */}
      <Sheet open={showHistory} onOpenChange={setShowHistory}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Cover Letter History</SheetTitle>
            <SheetDescription>Your recent CoC cover letters</SheetDescription>
            <SheetClose onClose={() => setShowHistory(false)} />
          </SheetHeader>
          <SheetBody>
            {isLoadingHistory ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse bg-slate-100 dark:bg-slate-800 h-16 rounded-lg" />
                ))}
              </div>
            ) : historyRecords.length === 0 ? (
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
                        <Badge variant="info">Level {record.sc_level}</Badge>
                        {record.file_name && (
                          <span className="text-xs text-slate-500 truncate">{record.file_name}</span>
                        )}
                      </div>
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

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
  MessageSquareText,
  BookOpen,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  ShieldAlert,
  Info,
  History,
  Clock,
  Trash2,
  FileDown,
} from "lucide-react";
import { exportPlanManagementPdf } from "@/lib/pdfExportFeatures";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
  SheetBody,
} from "@/components/ui/Sheet";

interface AdvisoryResult {
  summary: string;
  sections: Array<{
    title: string;
    content: string;
  }>;
  pricingReferences: Array<{
    item: string;
    code: string;
    price: string;
    notes: string;
  }>;
  warnings: string[];
  recommendations: string[];
  confidenceLevel?: "high" | "medium" | "low";
  disclaimer?: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      // Remove data URL prefix: "data:application/pdf;base64,"
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function parseAdvisoryResult(data: any): AdvisoryResult {
  const result = data.result || data;
  const response = result.response || {};

  const sections: Array<{ title: string; content: string }> = [];

  if (response.mainAnswer) {
    sections.push({ title: "Analysis", content: response.mainAnswer });
  }
  if (response.keyPoints?.length) {
    sections.push({
      title: "Key Points",
      content: response.keyPoints.join("\n\n"),
    });
  }
  if (response.verificationChecklist?.length) {
    sections.push({
      title: "Verification Checklist",
      content: response.verificationChecklist.join("\n"),
    });
  }
  if (response.commonMistakes?.length) {
    sections.push({
      title: "Common Mistakes to Avoid",
      content: response.commonMistakes.join("\n"),
    });
  }
  if (result.questionsForUser?.length) {
    sections.push({
      title: "Questions for Clarification",
      content: result.questionsForUser
        .map((q: any) => `Q: ${q.question}\nContext: ${q.context}`)
        .join("\n\n"),
    });
  }

  const pricingReferences = (response.priceGuideReferences || []).map(
    (r: any) => ({
      item: r.lineItem || r.item || "",
      code: r.category || r.code || "",
      price: r.priceLimit || r.price || "",
      notes: r.notes || "",
    })
  );

  const docFindings = response.documentFindings;
  const warnings: string[] = [
    ...(docFindings?.issues?.map(
      (i: any) =>
        `[${i.severity?.toUpperCase()}] ${i.issue}: ${i.recommendation}`
    ) || []),
  ];

  const recommendations: string[] = [
    ...(response.practicalGuidance || []),
    ...(docFindings?.missingElements?.map((m: string) => `Missing: ${m}`) ||
      []),
  ];

  return {
    summary: result.summary || "",
    sections,
    pricingReferences,
    warnings,
    recommendations,
    confidenceLevel: result.confidenceLevel,
    disclaimer: result.disclaimer,
  };
}

const confidenceBadgeVariant: Record<string, "success" | "warning" | "error"> =
  {
    high: "success",
    medium: "warning",
    low: "error",
  };

export default function PlanManagementExpertPage() {
  const { isLoading: permLoading } = usePermissions();
  const [query, setQuery] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<AdvisoryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("plan_management_queries")
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
      const parsed = typeof record.response === "string" ? JSON.parse(record.response) : record.response;
      setResult(parseAdvisoryResult(parsed));
      if (record.query) setQuery(record.query);
      setShowHistory(false);
      toast.success("History record loaded");
    } catch {
      toast.error("Failed to parse history record");
    }
  };

  const deleteHistoryRecord = async (id: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from("plan_management_queries").delete().eq("id", id);
      if (error) throw error;
      setHistoryRecords((prev) => prev.filter((r) => r.id !== id));
      toast.success("History record deleted");
    } catch (err) {
      console.error("Failed to delete history record:", err);
      toast.error("Failed to delete record");
    }
  };

  const saveToHistory = async (resultData: any) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("plan_management_queries").insert({
        user_id: user.id,
        query: query.slice(0, 500),
        response: resultData,
        document_name: files[0]?.name ?? null,
      });
    } catch (err) {
      console.error("Failed to save to history:", err);
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

  const handleProcess = async () => {
    if (!query.trim() && files.length === 0) return;
    setProcessing(true);
    setResult(null);
    setError(null);

    try {
      const supabase = createClient();

      const body: Record<string, unknown> = { query };

      if (files.length > 0) {
        const file = files[0]; // Send first file
        const base64 = await fileToBase64(file);
        body.fileData = base64;
        body.fileMimeType = file.type || "application/pdf";
        body.fileName = file.name;
      }

      const { data, error: fnError } = await invokeWithAuth(
        "plan-management-expert",
        { body }
      );

      if (fnError) throw fnError;
      setResult(parseAdvisoryResult(data));
      await saveToHistory(data);
      toast.success("Expert advice generated successfully!");
    } catch (err) {
      console.error("Plan management query failed:", err);
      toast.error("Query failed. Please try again.");
      setError(
        err instanceof Error ? err.message : "Failed to get expert advice."
      );
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
    const parts: string[] = [];
    if (result.summary) parts.push(`## Summary\n${result.summary}`);
    if (result.sections) {
      result.sections.forEach((s) => parts.push(`## ${s.title}\n${s.content}`));
    }
    if (result.pricingReferences?.length) {
      parts.push(
        `## Pricing References\n${result.pricingReferences
          .map((p) => `${p.item} (${p.code}): ${p.price} - ${p.notes}`)
          .join("\n")}`
      );
    }
    if (result.warnings?.length) {
      parts.push(`## Warnings\n${result.warnings.join("\n")}`);
    }
    if (result.recommendations?.length) {
      parts.push(`## Recommendations\n${result.recommendations.join("\n")}`);
    }
    if (result.disclaimer) {
      parts.push(`## Disclaimer\n${result.disclaimer}`);
    }
    await copyToClipboard(parts.join("\n\n"), "all");
  };

  if (permLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Plan Management Expert" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Plan Management Expert" />

      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Query Input */}
          <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Your Question
            </h2>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a plan management question, e.g. 'Can this service agreement charge a cancellation fee for less than 7 days notice?' or 'Is this invoice correctly coded?'"
              className="w-full min-h-[200px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
            />
          </Card>

          {/* File Upload */}
          <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Upload Invoice / Service Agreement
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              One file at a time. The first file will be analysed alongside your
              question.
            </p>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-400 transition-colors"
            >
              <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Click to upload an invoice or service agreement
              </p>
              <p className="text-xs text-slate-500 mt-1">PDF, DOCX, TXT, CSV</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.csv"
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
                      <span className="text-xs text-slate-500">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                      {idx === 0 && (
                        <Badge variant="info">Will be sent</Badge>
                      )}
                      {idx > 0 && (
                        <Badge variant="default">Queued</Badge>
                      )}
                    </div>
                    <button
                      onClick={() => removeFile(idx)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Process Button */}
          <AIProcessingButton
            variant="indigo"
            onClick={handleProcess}
            isProcessing={processing}
            disabled={!query.trim() && files.length === 0}
            label="Get Expert Advice"
          />

          {/* Generating overlay */}
          {processing && (
            <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
              <GeneratingOverlay variant="general" label="Consulting Plan Management Expert..." />
            </Card>
          )}

          {/* Error */}
          {!processing && error && (
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
          {!processing && result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Advisory Response
                  </h2>
                  {result.confidenceLevel && (
                    <Badge
                      variant={
                        confidenceBadgeVariant[result.confidenceLevel] ||
                        "default"
                      }
                    >
                      {result.confidenceLevel.charAt(0).toUpperCase() +
                        result.confidenceLevel.slice(1)}{" "}
                      Confidence
                    </Badge>
                  )}
                </div>
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
                      exportPlanManagementPdf(result!, query, files[0]?.name);
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

              {/* Summary */}
              {result.summary && (
                <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MessageSquareText className="h-5 w-5 text-indigo-600" />
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                        Summary
                      </h3>
                    </div>
                    <button
                      onClick={() =>
                        copyToClipboard(result.summary!, "summary")
                      }
                      className="text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                      {copied === "summary" ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {result.summary}
                  </p>
                </Card>
              )}

              {/* Structured Sections */}
              {result.sections &&
                result.sections.map((section, idx) => (
                  <Card
                    key={idx}
                    className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-purple-600" />
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                          {section.title}
                        </h3>
                      </div>
                      <button
                        onClick={() =>
                          copyToClipboard(
                            `${section.title}\n${section.content}`,
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
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {section.content}
                    </p>
                  </Card>
                ))}

              {/* Pricing References */}
              {result.pricingReferences &&
                result.pricingReferences.length > 0 && (
                  <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-emerald-600" />
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                          Pricing Guide References
                        </h3>
                      </div>
                      <button
                        onClick={() =>
                          copyToClipboard(
                            result
                              .pricingReferences!.map(
                                (p) => `${p.item} (${p.code}): ${p.price}`
                              )
                              .join("\n"),
                            "pricing"
                          )
                        }
                        className="text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        {copied === "pricing" ? (
                          <Check className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-700">
                            <th className="text-left py-2 pr-4 font-medium text-slate-500">
                              Item
                            </th>
                            <th className="text-left py-2 pr-4 font-medium text-slate-500">
                              Code
                            </th>
                            <th className="text-left py-2 pr-4 font-medium text-slate-500">
                              Price
                            </th>
                            <th className="text-left py-2 font-medium text-slate-500">
                              Notes
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.pricingReferences.map((ref, idx) => (
                            <tr
                              key={idx}
                              className="border-b border-slate-100 dark:border-slate-800"
                            >
                              <td className="py-2 pr-4 text-slate-700 dark:text-slate-300">
                                {ref.item}
                              </td>
                              <td className="py-2 pr-4">
                                <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-indigo-600 dark:text-indigo-400">
                                  {ref.code}
                                </code>
                              </td>
                              <td className="py-2 pr-4 font-medium text-slate-900 dark:text-slate-100">
                                {ref.price}
                              </td>
                              <td className="py-2 text-slate-500">
                                {ref.notes}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}

              {/* Warnings */}
              {result.warnings && result.warnings.length > 0 && (
                <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      Warnings
                    </h3>
                  </div>
                  <ul className="space-y-2">
                    {result.warnings.map((warning, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400"
                      >
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        {warning}
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
                        <ClipboardList className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Disclaimer */}
              {result.disclaimer && (
                <Card className="bg-slate-50 dark:bg-slate-900/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                      {result.disclaimer}
                    </p>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {/* History Sheet */}
      <Sheet open={showHistory} onOpenChange={setShowHistory}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Query History</SheetTitle>
            <SheetDescription>Your recent plan management queries</SheetDescription>
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
                      <p className="text-sm text-slate-700 dark:text-slate-300 truncate">
                        {record.query?.slice(0, 50)}{record.query?.length > 50 ? "..." : ""}
                      </p>
                      <div className="flex items-center gap-2">
                        {record.document_name && (
                          <Badge variant="info">{record.document_name}</Badge>
                        )}
                        <span className="text-xs text-slate-400">
                          {new Date(record.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
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

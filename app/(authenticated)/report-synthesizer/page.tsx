"use client";

import { useState, useCallback, useRef, useEffect } from "react";
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
  Sparkles,
  ToggleLeft,
  ToggleRight,
  User,
  ShieldCheck,
  Heart,
  Activity,
  History,
  Clock,
  Trash2,
  FileDown,
} from "lucide-react";
import { exportReportSynthesizerPdf } from "@/lib/pdfExportFeatures";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
  SheetBody,
} from "@/components/ui/Sheet";

const PERSONAS = [
  {
    id: "sc-level-2",
    label: "SC Level 2",
    description: "Support Coordinator Level 2",
    icon: User,
  },
  {
    id: "ssc-level-3",
    label: "SSC Level 3",
    description: "Specialist Support Coordinator",
    icon: ShieldCheck,
  },
  {
    id: "recovery-coach",
    label: "Recovery Coach",
    description: "Psychosocial Recovery Coach",
    icon: Heart,
  },
  {
    id: "ot",
    label: "OT",
    description: "Occupational Therapist",
    icon: Activity,
  },
] as const;

const PERSONA_LABELS: Record<string, string> = {
  "sc-level-2": "Support Coordinator Level 2",
  "ssc-level-3": "Senior Support Coordinator Level 3",
  "recovery-coach": "Psychosocial Recovery Coach",
  "ot": "Occupational Therapist",
};

function parseReportResponse(data: any): Record<string, string> {
  // Mode 1: synthesizedText (long synthesis)
  if (data.synthesizedText) {
    return { "Synthesised Report": data.synthesizedText };
  }
  // Mode 2: templateData (structured extraction)
  if (data.templateData) {
    const td = data.templateData;
    const sections: Record<string, string> = {};
    const fieldLabels: Record<string, string> = {
      participant_name: "Participant Name",
      ndis_number: "NDIS Number",
      report_type: "Report Type",
      assessment_date: "Assessment Date",
      provider: "Provider",
      functional_capacity: "Functional Capacity",
      strengths: "Strengths",
      challenges: "Challenges",
      impact_on_daily_life: "Impact on Daily Life",
      risks: "Risks",
      mitigation_strategies: "Mitigation Strategies",
      recommended_supports: "Recommended Supports",
      frequency: "Frequency",
      duration: "Duration",
      goals: "Goals",
      summary: "Summary",
    };
    for (const [key, label] of Object.entries(fieldLabels)) {
      if (td[key]) sections[label] = td[key];
    }
    return sections;
  }
  // Fallback: try direct sections
  if (data.sections) return data.sections;
  return { Report: JSON.stringify(data) };
}

export default function ReportSynthesizerPage() {
  const { isLoading: permLoading } = usePermissions();
  const [files, setFiles] = useState<File[]>([]);
  const [persona, setPersona] = useState<string>("sc-level-2");
  const [agentMode, setAgentMode] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<Record<string, string> | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [generationCount, setGenerationCount] = useState(0);
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
        .from("synthesized_reports")
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
      const parsed = JSON.parse(record.full_report);
      setResult(parsed);
      setShowHistory(false);
      toast.success("History record loaded");
    } catch {
      toast.error("Failed to parse history record");
    }
  };

  const deleteHistoryRecord = async (id: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from("synthesized_reports").delete().eq("id", id);
      if (error) throw error;
      setHistoryRecords((prev) => prev.filter((r) => r.id !== id));
      toast.success("History record deleted");
    } catch (err) {
      console.error("Failed to delete history record:", err);
      toast.error("Failed to delete record");
    }
  };

  const saveToHistory = async (resultData: Record<string, string>) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("synthesized_reports").insert({
        user_id: user.id,
        persona_id: persona,
        persona_title: PERSONA_LABELS[persona] || persona,
        document_names: files.map((f) => f.name),
        document_count: files.length,
        agent_mode: agentMode,
        full_report: JSON.stringify(resultData),
      });
    } catch (err) {
      console.error("Failed to save to history:", err);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      [".pdf", ".docx", ".txt"].some((ext) => f.name.toLowerCase().endsWith(ext))
    );
    setFiles((prev) => [...prev, ...dropped]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setResult(null);
    setGenerationCount((c) => c + 1);

    try {
      const supabase = createClient();

      // Read all files as text
      const fileContents: string[] = await Promise.all(
        files.map(
          (file) =>
            new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) =>
                resolve(`[File: ${file.name}]\n${e.target?.result as string}\n`);
              reader.readAsText(file);
            })
        )
      );
      const combinedReportText = fileContents.join("\n\n---\n\n");

      // Build coordinator notes including persona
      const coordinatorNotes = `Synthesise this report from the perspective of a ${PERSONA_LABELS[persona] || persona}. ${agentMode ? "Perform a deep multi-pass analysis." : ""}`.trim();

      const { data, error } = await invokeWithAuth("synthesize-report", {
        body: {
          reportTexts: combinedReportText,
          coordinatorNotes: coordinatorNotes,
        },
      });

      if (error) throw error;
      const parsed = parseReportResponse(data);
      setResult(parsed);
      await saveToHistory(parsed);
      toast.success("Report synthesised successfully!");
    } catch (err) {
      console.error("Synthesis failed:", err);
      toast.error("Synthesis failed. Please try again.");
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
    const allText = Object.entries(result)
      .map(([key, value]) => `## ${key}\n${value}`)
      .join("\n\n");
    await copyToClipboard(allText, "all");
  };

  if (permLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Report Synthesizer" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Report Synthesizer" />

      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* File Upload Area */}
          <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Upload Documents
            </h2>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                dragOver
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20"
                  : "border-slate-300 dark:border-slate-700 hover:border-indigo-400"
              }`}
            >
              <Upload className="h-10 w-10 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-400 mb-1">
                Drag and drop files here, or click to browse
              </p>
              <p className="text-sm text-slate-500">Accepts .pdf, .docx, .txt</p>
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
                      <span className="text-xs text-slate-500">
                        ({(file.size / 1024).toFixed(1)} KB)
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

          {/* Persona Selector */}
          <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Select Persona
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {PERSONAS.map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPersona(p.id)}
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                      persona === p.id
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20"
                        : "border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                    }`}
                  >
                    <Icon
                      className={`h-6 w-6 ${
                        persona === p.id ? "text-indigo-600" : "text-slate-500"
                      }`}
                    />
                    <span
                      className={`text-sm font-medium ${
                        persona === p.id
                          ? "text-indigo-700 dark:text-indigo-300"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {p.label}
                    </span>
                    <span className="text-xs text-slate-500 text-center">{p.description}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Agent Mode Toggle & Process */}
          <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">Agent Mode</p>
                  <p className="text-sm text-slate-500">
                    Multi-pass synthesis for deeper analysis
                  </p>
                </div>
              </div>
              <button onClick={() => setAgentMode(!agentMode)} className="text-indigo-600">
                {agentMode ? (
                  <ToggleRight className="h-8 w-8" />
                ) : (
                  <ToggleLeft className="h-8 w-8 text-slate-400" />
                )}
              </button>
            </div>

            <AIProcessingButton
              variant="indigo"
              onClick={handleProcess}
              isProcessing={processing}
              disabled={files.length === 0}
              label="Synthesize Report"
            />
          </Card>

          {/* Generating overlay with NDIS tips */}
          {processing && (
            <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
              <GeneratingOverlay
                variant="report"
                label="Synthesising Report..."
                generationCount={generationCount}
              />
            </Card>
          )}

          {/* Results */}
          {!processing && result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Synthesis Results
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
                      exportReportSynthesizerPdf(result!, PERSONA_LABELS[persona], files.map(f => f.name));
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

              {Object.entries(result).map(([section, content]) => (
                <Card
                  key={section}
                  className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">{section}</h3>
                    <button
                      onClick={() => copyToClipboard(content, section)}
                      className="text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                      {copied === section ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{content}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* History Sheet */}
      <Sheet open={showHistory} onOpenChange={setShowHistory}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Report History</SheetTitle>
            <SheetDescription>Your recent synthesized reports</SheetDescription>
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
                        <Badge variant="info">{record.persona_title}</Badge>
                        <span className="text-xs text-slate-500">{record.document_count} doc{record.document_count !== 1 ? "s" : ""}</span>
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

"use client";

import { useState, useRef, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AIProcessingButton } from "@/components/ui/AIProcessingButton";
import { usePermissions } from "@/hooks/usePermissions";
import { createClient, invokeWithAuth } from "@/lib/supabase/client";
import { exportCaseNotePdf } from "@/lib/pdfExportFeatures";
import { exportCaseNoteDocx } from "@/lib/docxExport";
import { toast } from "sonner";
import { GeneratingOverlay } from "@/components/ui/GeneratingOverlay";
import {
  Camera,
  Copy,
  Check,
  X,
  User,
  Calendar,
  MessageSquare,
  Target,
  FileText,
  Eye,
  TrendingUp,
  ClipboardList,
  ShieldCheck,
  Heart,
  History,
  Clock,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";
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
  { id: "sc-level-2", label: "SC Level 2", description: "Support Coordinator Level 2", icon: User },
  { id: "ssc-level-3", label: "SSC Level 3", description: "Specialist Support Coordinator", icon: ShieldCheck },
  { id: "recovery-coach", label: "Recovery Coach", description: "Psychosocial Recovery Coach", icon: Heart },
] as const;

const SECTIONS = [
  { key: "caseNoteSubject", label: "Case Note Subject", icon: FileText, color: "indigo" },
  { key: "dateOfService", label: "Date of Service", icon: Calendar, color: "blue" },
  { key: "interactionType", label: "Interaction Type", icon: MessageSquare, color: "violet" },
  { key: "goalAlignment", label: "Goal Alignment", icon: Target, color: "purple" },
  { key: "detailsOfSupport", label: "Details of Support", icon: ClipboardList, color: "sky" },
  { key: "participantPresentation", label: "Participant Presentation", icon: Eye, color: "teal" },
  { key: "progressAndOutcomes", label: "Progress and Outcomes", icon: TrendingUp, color: "emerald" },
  { key: "actionPlan", label: "Action Plan", icon: ClipboardList, color: "amber" },
] as const;

const COLOR_MAP: Record<string, string> = {
  indigo: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30",
  blue: "text-blue-600 bg-blue-50 dark:bg-blue-950/30",
  violet: "text-violet-600 bg-violet-50 dark:bg-violet-950/30",
  purple: "text-purple-600 bg-purple-50 dark:bg-purple-950/30",
  sky: "text-sky-600 bg-sky-50 dark:bg-sky-950/30",
  teal: "text-teal-600 bg-teal-50 dark:bg-teal-950/30",
  emerald: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30",
  amber: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
};

const PERSONA_LABELS: Record<string, string> = {
  "sc-level-2": "Support Coordinator Level 2",
  "ssc-level-3": "Senior Support Coordinator Level 3",
  "recovery-coach": "Psychosocial Recovery Coach",
};

function parseCaseNote(caseNote: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const sectionDefs = [
    { key: "caseNoteSubject", labels: ["Case Note Subject"] },
    { key: "dateOfService", labels: ["Date of Service"] },
    { key: "interactionType", labels: ["Interaction Type"] },
    { key: "goalAlignment", labels: ["Goal Alignment"] },
    { key: "detailsOfSupport", labels: ["Details of Support Provided", "Details of Support"] },
    { key: "participantPresentation", labels: ["Participant Presentation and Engagement", "Participant Presentation"] },
    { key: "progressAndOutcomes", labels: ["Progress and Outcomes"] },
    { key: "actionPlan", labels: ["Action Plan and Next Steps", "Action Plan"] },
  ];

  for (let i = 0; i < sectionDefs.length; i++) {
    const { key, labels } = sectionDefs[i];
    for (const label of labels) {
      const nextLabels = sectionDefs
        .slice(i + 1)
        .flatMap((s) => s.labels)
        .map((l) => `${l}:`)
        .join("|");
      const lookahead = nextLabels ? `(?=${nextLabels}|$)` : "(?=$)";
      const regex = new RegExp(`${label}:?\\s*([\\s\\S]*?)${lookahead}`, "i");
      const match = caseNote.match(regex);
      if (match) {
        sections[key] = match[1].trim();
        break;
      }
    }
  }
  return sections;
}

export default function VisualCaseNotesPage() {
  const { isLoading: permLoading } = usePermissions();
  const [text, setText] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [persona, setPersona] = useState<string>("sc-level-2");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<Record<string, string> | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [historyPage, setHistoryPage] = useState(0);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const HISTORY_KEY = "careaxis_case_notes_history";
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) setHistoryRecords(JSON.parse(stored));
    } catch {}
  }, []);

  const saveToLocalHistory = (resultData: Record<string, string>) => {
    try {
      const record = {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        text_preview: text.slice(0, 80),
        persona,
        result: resultData,
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
    setShowHistory(false);
    toast.success("History record loaded");
  };

  const deleteHistoryRecord = (id: string) => {
    const updated = historyRecords.filter((r) => r.id !== id);
    setHistoryRecords(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    toast.success("History record deleted");
  };

  const paginatedHistory = historyRecords.slice(
    historyPage * ITEMS_PER_PAGE,
    (historyPage + 1) * ITEMS_PER_PAGE
  );
  const totalPages = Math.ceil(historyRecords.length / ITEMS_PER_PAGE);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    if (!text.trim() && images.length === 0) return;
    setProcessing(true);
    setResult(null);

    try {
      const supabase = createClient();

      // Build combined input with persona context
      let combinedInput = text;
      if (persona !== "sc-level-2") {
        combinedInput = `[Written from the perspective of a ${PERSONA_LABELS[persona]}]\n\n${text}`;
      }

      // Append image context if images are uploaded
      if (images.length > 0) {
        combinedInput += `\n\n[Note: ${images.length} image(s) uploaded for context - ${images.map((i) => i.name).join(", ")}]`;
      }

      const { data, error } = await invokeWithAuth("analyze-text", {
        body: { textInput: combinedInput },
      });

      if (error) throw error;

      if (!data?.success || !data?.caseNote) {
        throw new Error(data?.error || "Failed to generate case note");
      }

      // Parse the caseNote string into sections
      const parsed = parseCaseNote(data.caseNote);
      setResult(parsed);
      saveToLocalHistory(parsed);
      toast.success("Case note generated successfully!");
    } catch (err) {
      console.error("Analysis failed:", err);
      toast.error("Analysis failed. Please try again.");
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
    const allText = SECTIONS.map((s) => `## ${s.label}\n${result[s.key] ?? ""}`)
      .join("\n\n");
    await copyToClipboard(allText, "all");
  };

  if (permLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Visual Case Notes" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Visual Case Notes" />

      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Text Input */}
          <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Raw Notes
            </h2>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your raw case notes here..."
              className="w-full min-h-[200px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
            />

            {/* Image Upload */}
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <Button
                variant="outline"
                onClick={() => imageInputRef.current?.click()}
                className="flex items-center gap-2"
              >
                <Camera className="h-4 w-4" />
                Add Image
              </Button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-full px-3 py-1 text-sm text-slate-700 dark:text-slate-300"
                >
                  {img.name}
                  <button onClick={() => removeImage(idx)} className="text-slate-400 hover:text-red-500">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* Persona Selector */}
          <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Select Persona
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

          {/* Process Button */}
          <AIProcessingButton
            variant="indigo"
            onClick={handleAnalyze}
            isProcessing={processing}
            disabled={!text.trim() && images.length === 0}
            label="Analyze Case Notes"
          />

          {/* Generating overlay */}
          {processing && (
            <Card className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
              <GeneratingOverlay variant="case-note" label="Analysing Case Notes..." />
            </Card>
          )}

          {/* Results */}
          {!processing && result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Parsed Case Note
                </h2>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => exportCaseNotePdf(result, persona)}
                    variant="outline"
                    className="flex items-center gap-2 text-sm"
                  >
                    <Download className="h-4 w-4" />
                    Export PDF
                  </Button>
                  <Button
                    onClick={() => exportCaseNoteDocx(result, persona)}
                    variant="outline"
                    className="flex items-center gap-2 text-sm"
                  >
                    <FileText className="h-4 w-4" />
                    Export DOCX
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
                  <Button
                    onClick={() => { setShowHistory(true); setHistoryPage(0); }}
                    variant="outline"
                    className="flex items-center gap-2 text-sm"
                  >
                    <History className="h-4 w-4" />
                    History
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SECTIONS.map((section) => {
                  const Icon = section.icon;
                  const content = result[section.key] ?? "";
                  return (
                    <Card
                      key={section.key}
                      className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                              COLOR_MAP[section.color]
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                            {section.label}
                          </h3>
                        </div>
                        <button
                          onClick={() => copyToClipboard(content, section.key)}
                          className="text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                          {copied === section.key ? (
                            <Check className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {content || "No data parsed for this section."}
                      </p>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* History Sheet */}
      <Sheet open={showHistory} onOpenChange={setShowHistory}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Case Note History</SheetTitle>
            <SheetDescription>Your recent case notes (stored locally)</SheetDescription>
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
                {paginatedHistory.map((record) => (
                  <div
                    key={record.id}
                    onClick={() => loadHistoryRecord(record)}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <p className="text-sm text-slate-700 dark:text-slate-300 truncate">
                        {record.text_preview || "Case note"}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="info">
                          {PERSONA_LABELS[record.persona] || record.persona}
                        </Badge>
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

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
                    <Button
                      onClick={() => setHistoryPage((p) => Math.max(0, p - 1))}
                      variant="outline"
                      disabled={historyPage === 0}
                      className="flex items-center gap-1 text-xs"
                    >
                      <ChevronLeft className="h-3 w-3" />
                      Prev
                    </Button>
                    <span className="text-xs text-slate-500">
                      {historyPage + 1} / {totalPages}
                    </span>
                    <Button
                      onClick={() => setHistoryPage((p) => Math.min(totalPages - 1, p + 1))}
                      variant="outline"
                      disabled={historyPage >= totalPages - 1}
                      className="flex items-center gap-1 text-xs"
                    >
                      Next
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}

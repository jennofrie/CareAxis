"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { AIProcessingButton } from "@/components/ui/AIProcessingButton";
import { usePermissions } from "@/hooks/usePermissions";
import { createClient, invokeWithAuth } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Lock,
  Download,
  FileText,
  User,
  Hash,
  DollarSign,
  Tag,
  ClipboardList,
  Calendar,
  Building2,
  ShieldCheck,
  Target,
  AlertTriangle,
  Package,
  FileDown,
} from "lucide-react";
import { exportJustificationPdf } from "@/lib/pdfExportFeatures";

const CATEGORIES = ["Core Supports", "Capacity Building", "Capital"] as const;
type Category = (typeof CATEGORIES)[number];

const FUNCTIONAL_IMPAIRMENT_OPTIONS = [
  "Cognitive",
  "Physical",
  "Psychosocial",
  "Sensory",
  "Self-Care",
  "Communication",
] as const;

interface GenerationResult {
  justification: string;
  participantName: string;
  supportType: string;
  generatedAt: string;
}

export default function JustificationDrafterPage() {
  const { canAccessJustificationDrafter, isLoading: permLoading } = usePermissions();
  const supabase = createClient();

  // Participant Details
  const [participantName, setParticipantName] = useState("");
  const [ndisNumber, setNdisNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [planStartDate, setPlanStartDate] = useState("");
  const [planEndDate, setPlanEndDate] = useState("");

  // SC Details
  const [scName, setScName] = useState("");
  const [scOrganisation, setScOrganisation] = useState("");

  // AT Item Details
  const [itemName, setItemName] = useState("");
  const [itemCategory, setItemCategory] = useState<Category>("Core Supports");
  const [requestedAmount, setRequestedAmount] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [isReplacement, setIsReplacement] = useState(false);

  // Functional Need
  const [functionalImpairments, setFunctionalImpairments] = useState<string[]>([]);
  const [currentBarriers, setCurrentBarriers] = useState("");
  const [standardDevicesInsufficient, setStandardDevicesInsufficient] = useState("");
  const [dailyLivingImpact, setDailyLivingImpact] = useState("");

  // Goals & Alignment
  const [participantGoals, setParticipantGoals] = useState("");
  const [goalAlignment, setGoalAlignment] = useState("");

  // Additional
  const [therapistEndorsement, setTherapistEndorsement] = useState(false);
  const [additionalContext, setAdditionalContext] = useState("");

  // UI State
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    participantName.trim() &&
    ndisNumber.trim() &&
    itemName.trim() &&
    requestedAmount.trim() &&
    currentBarriers.trim() &&
    dailyLivingImpact.trim() &&
    participantGoals.trim() &&
    goalAlignment.trim() &&
    functionalImpairments.length > 0;

  function toggleImpairment(impairment: string) {
    setFunctionalImpairments((prev) =>
      prev.includes(impairment)
        ? prev.filter((i) => i !== impairment)
        : [...prev, impairment]
    );
  }

  async function handleGenerate() {
    if (!canSubmit) return;
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: fnError } = await invokeWithAuth(
        "generate-justification",
        {
          body: {
            participantName,
            ndisNumber,
            dateOfBirth,
            planStartDate,
            planEndDate,
            scName,
            scOrganisation,
            itemName,
            itemCategory,
            requestedAmount: parseFloat(requestedAmount),
            isReplacement,
            isLowRisk: true,
            trialRequired: false,
            functionalImpairments,
            currentBarriers,
            standardDevicesInsufficient,
            dailyLivingImpact,
            participantGoals,
            goalAlignment,
            supplierName,
            quoteAmount: parseFloat(quoteAmount) || 0,
            therapistEndorsement,
            additionalContext,
          },
        }
      );

      if (fnError) throw fnError;

      if (data?.success === false) {
        throw new Error(data?.error || "Generation failed.");
      }

      setResult({
        justification: data?.justification ?? JSON.stringify(data, null, 2),
        participantName: data?.participantName ?? participantName,
        supportType: data?.supportType ?? itemCategory,
        generatedAt: data?.generatedAt ?? new Date().toISOString(),
      });
      toast.success("Justification letter generated!");
    } catch (err: unknown) {
      toast.error("Generation failed. Please try again.");
      setError(err instanceof Error ? err.message : "Failed to generate justification.");
    } finally {
      setIsProcessing(false);
    }
  }

  function handleDownload() {
    if (!result) return;
    const blob = new Blob([result.justification], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Justification_${participantName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Justification letter downloaded!");
  }

  if (permLoading) {
    return (
      <>
        <Header title="Justification Drafter" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-slate-400 dark:text-slate-500 text-sm">
            Loading...
          </div>
        </div>
      </>
    );
  }

  if (!canAccessJustificationDrafter) {
    return (
      <>
        <Header title="Justification Drafter" />
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Card className="max-w-lg mx-auto text-center py-12">
            <Lock className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <Badge variant="premium" className="mb-3">
              Premium Feature
            </Badge>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Justification Drafter
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">
              Generate structured 11-section NDIS justification letters with AI. Upgrade
              to Premium to unlock this feature.
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
      <Header title="Justification Drafter" />
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Section 1: Participant Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-500" />
                Participant Details
              </CardTitle>
              <CardDescription>
                Basic participant information for the justification letter.
              </CardDescription>
            </CardHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  <User className="w-4 h-4" />
                  Participant Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  placeholder="e.g. Jane Smith"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  <Hash className="w-4 h-4" />
                  NDIS Number <span className="text-red-500">*</span>
                </label>
                <Input
                  value={ndisNumber}
                  onChange={(e) => setNdisNumber(e.target.value)}
                  placeholder="e.g. 4312345678"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  <Calendar className="w-4 h-4" />
                  Date of Birth
                </label>
                <Input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>
              <div className="hidden md:block" />
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  <Calendar className="w-4 h-4" />
                  Plan Start Date
                </label>
                <Input
                  type="date"
                  value={planStartDate}
                  onChange={(e) => setPlanStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  <Calendar className="w-4 h-4" />
                  Plan End Date
                </label>
                <Input
                  type="date"
                  value={planEndDate}
                  onChange={(e) => setPlanEndDate(e.target.value)}
                />
              </div>
            </div>
          </Card>

          {/* Section 2: SC Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-500" />
                Support Coordinator Details
              </CardTitle>
            </CardHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  SC Name
                </label>
                <Input
                  value={scName}
                  onChange={(e) => setScName(e.target.value)}
                  placeholder="e.g. John Doe"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  SC Organisation
                </label>
                <Input
                  value={scOrganisation}
                  onChange={(e) => setScOrganisation(e.target.value)}
                  placeholder="e.g. ABC Support Services"
                />
              </div>
            </div>
          </Card>

          {/* Section 3: AT Item Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-500" />
                AT Item Details
              </CardTitle>
              <CardDescription>
                Details about the assistive technology item being requested.
              </CardDescription>
            </CardHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  <ClipboardList className="w-4 h-4" />
                  Item Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Powered wheelchair"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  <DollarSign className="w-4 h-4" />
                  Requested Amount ($) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={requestedAmount}
                  onChange={(e) => setRequestedAmount(e.target.value)}
                  placeholder="e.g. 5400.00"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Supplier Name
                </label>
                <Input
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="e.g. Mobility Solutions Pty Ltd"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  <DollarSign className="w-4 h-4" />
                  Quote Amount ($)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={quoteAmount}
                  onChange={(e) => setQuoteAmount(e.target.value)}
                  placeholder="e.g. 5400.00"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                <Tag className="w-4 h-4" />
                Item Category
              </label>
              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setItemCategory(cat)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      itemCategory === cat
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsReplacement(!isReplacement)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                  isReplacement ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                    isReplacement ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                This is a replacement item
              </span>
            </div>
          </Card>

          {/* Section 4: Functional Need */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-indigo-500" />
                Functional Need
              </CardTitle>
              <CardDescription>
                Describe the participant&apos;s functional impairments and how the current situation
                impacts their daily living.
              </CardDescription>
            </CardHeader>

            <div className="mb-4">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                Functional Impairments <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2 flex-wrap">
                {FUNCTIONAL_IMPAIRMENT_OPTIONS.map((impairment) => (
                  <button
                    key={impairment}
                    onClick={() => toggleImpairment(impairment)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border ${
                      functionalImpairments.includes(impairment)
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500"
                    }`}
                  >
                    {functionalImpairments.includes(impairment) ? "\u2713 " : ""}
                    {impairment}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Current Barriers <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={currentBarriers}
                  onChange={(e) => setCurrentBarriers(e.target.value)}
                  placeholder="Describe the barriers the participant currently faces in their daily life..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 min-h-[100px] text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors duration-200 outline-none resize-y"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Why Standard Devices Are Insufficient
                </label>
                <textarea
                  value={standardDevicesInsufficient}
                  onChange={(e) => setStandardDevicesInsufficient(e.target.value)}
                  placeholder="Explain why standard or lower-cost alternatives do not meet the participant's needs..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 min-h-[100px] text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors duration-200 outline-none resize-y"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Daily Living Impact <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={dailyLivingImpact}
                  onChange={(e) => setDailyLivingImpact(e.target.value)}
                  placeholder="Describe how the participant's disability impacts their daily living activities..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 min-h-[100px] text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors duration-200 outline-none resize-y"
                />
              </div>
            </div>
          </Card>

          {/* Section 5: Goals & Alignment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-500" />
                Goals &amp; Alignment
              </CardTitle>
              <CardDescription>
                Describe the participant&apos;s goals and how the requested item aligns with their NDIS plan.
              </CardDescription>
            </CardHeader>

            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Participant Goals <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={participantGoals}
                  onChange={(e) => setParticipantGoals(e.target.value)}
                  placeholder="List the participant's NDIS plan goals relevant to this request..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 min-h-[100px] text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors duration-200 outline-none resize-y"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Goal Alignment <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={goalAlignment}
                  onChange={(e) => setGoalAlignment(e.target.value)}
                  placeholder="Explain how the requested item directly supports achieving these goals..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 min-h-[100px] text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors duration-200 outline-none resize-y"
                />
              </div>
            </div>
          </Card>

          {/* Section 6: Additional */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-500" />
                Additional Information
              </CardTitle>
            </CardHeader>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setTherapistEndorsement(!therapistEndorsement)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                    therapistEndorsement ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                      therapistEndorsement ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Therapist endorsement obtained
                </span>
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  <FileText className="w-4 h-4" />
                  Additional Context
                </label>
                <textarea
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  placeholder="Any other relevant information, clinical notes, or supporting evidence..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 min-h-[120px] text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors duration-200 outline-none resize-y"
                />
              </div>
            </div>
          </Card>

          {/* Generate Button */}
          <div className="flex justify-end">
            <AIProcessingButton
              isProcessing={isProcessing}
              onClick={handleGenerate}
              disabled={!canSubmit}
              label="Generate Justification"
              variant="indigo"
              type="audit"
            />
          </div>

          {/* Error */}
          {error && (
            <Card className="border-red-300 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </Card>
          )}

          {/* Results */}
          {result && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Generated Justification</CardTitle>
                  <CardDescription>
                    11-section structured justification letter for{" "}
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {result.participantName}
                    </span>
                    {" "}&middot;{" "}
                    <span className="text-slate-500 dark:text-slate-400">
                      {result.supportType}
                    </span>
                    {" "}&middot;{" "}
                    <span className="text-slate-500 dark:text-slate-400 text-xs">
                      {new Date(result.generatedAt).toLocaleString()}
                    </span>
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    exportJustificationPdf(result!.justification, participantName, itemName);
                    toast.success("PDF exported!");
                  }}>
                    <FileDown className="w-4 h-4 mr-1.5" />
                    Export PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownload}>
                    <Download className="w-4 h-4 mr-1.5" />
                    Download .txt
                  </Button>
                </div>
              </CardHeader>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <pre className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                  {result.justification}
                </pre>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

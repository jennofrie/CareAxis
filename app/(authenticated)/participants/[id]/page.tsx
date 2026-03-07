"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Loader2,
  Calendar,
  Clock,
  FileText,
  StickyNote,
  Scale,
  BadgeDollarSign,
  Check,
  X,
} from "lucide-react";

import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { usePermissions } from "@/hooks/usePermissions";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Participant {
  id: string;
  participant_first_name: string | null;
  participant_last_name: string | null;
  status: "Active" | "Review" | "Pending";
  plan_start_date: string | null;
  plan_end_date: string | null;
  ndis_number: string | null;
  notes: string | null;
  created_at: string;
  user_id: string;
}

type Status = "Active" | "Review" | "Pending";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<string, string> = {
  Active:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
  Review:
    "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  Pending:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil(
    (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}

function getInitials(first?: string | null, last?: string | null): string {
  return `${first?.charAt(0) ?? "?"}${last?.charAt(0) ?? ""}`.toUpperCase();
}

// ---------------------------------------------------------------------------
// AI tool definitions
// ---------------------------------------------------------------------------

const AI_TOOLS = [
  {
    label: "Report Synthesizer",
    href: "/report-synthesizer",
    icon: FileText,
    description: "Synthesise reports for this participant",
  },
  {
    label: "Visual Case Notes",
    href: "/visual-case-notes",
    icon: StickyNote,
    description: "Create structured case notes",
  },
  {
    label: "Senior Planner",
    href: "/senior-planner",
    icon: Scale,
    description: "Get expert planning advice",
  },
  {
    label: "Plan Management",
    href: "/plan-management-expert",
    icon: BadgeDollarSign,
    description: "Budget and plan guidance",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ParticipantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { isLoading: permLoading } = usePermissions();
  const supabase = createClient();

  const [participant, setParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Participant>>({});

  const fetchParticipant = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cases")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      setParticipant(data as Participant);
    } catch {
      toast.error("Failed to load participant.");
      router.push("/participants");
    } finally {
      setLoading(false);
    }
  }, [id, supabase, router]);

  useEffect(() => {
    if (!permLoading) fetchParticipant();
  }, [permLoading, fetchParticipant]);

  const startEditing = () => {
    if (!participant) return;
    setEditForm({ ...participant });
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditForm({});
  };

  const handleSave = async () => {
    if (!participant) return;
    if (
      !editForm.participant_first_name?.trim() ||
      !editForm.participant_last_name?.trim()
    ) {
      toast.error("First and last name are required.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("cases")
        .update({
          participant_first_name: editForm.participant_first_name?.trim(),
          participant_last_name: editForm.participant_last_name?.trim(),
          status: editForm.status,
          plan_start_date: editForm.plan_start_date || null,
          plan_end_date: editForm.plan_end_date || null,
          ndis_number: editForm.ndis_number?.trim() || null,
          notes: editForm.notes?.trim() || null,
        })
        .eq("id", participant.id);

      if (error) throw error;

      setParticipant((prev) =>
        prev ? ({ ...prev, ...editForm } as Participant) : prev
      );
      setEditing(false);
      setEditForm({});
      toast.success("Participant updated.");
    } catch {
      toast.error("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!participant) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("cases")
        .delete()
        .eq("id", participant.id);
      if (error) throw error;
      toast.success("Participant deleted.");
      router.push("/participants");
    } catch {
      toast.error("Failed to delete participant.");
      setDeleting(false);
    }
  };

  if (permLoading || loading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Participant" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </div>
    );
  }

  if (!participant) return null;

  const fullName =
    `${participant.participant_first_name ?? ""} ${participant.participant_last_name ?? ""}`.trim();
  const days = daysUntil(participant.plan_end_date);

  return (
    <div className="flex flex-col h-full">
      <Header title={fullName || "Participant"} />

      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Back + action bar */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push("/participants")}
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Participants
            </button>

            <div className="flex items-center gap-2">
              {editing ? (
                <>
                  <Button
                    variant="outline"
                    onClick={cancelEditing}
                    disabled={saving}
                  >
                    <X className="h-4 w-4 mr-1.5" />
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={startEditing}>
                    <Edit2 className="h-4 w-4 mr-1.5" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Hero */}
          <Card className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6">
            <div className="flex items-center gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-xl font-bold text-white">
                {getInitials(
                  participant.participant_first_name,
                  participant.participant_last_name
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {fullName}
                </h2>
                {participant.ndis_number && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    NDIS {participant.ndis_number}
                  </p>
                )}
                <span
                  className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    STATUS_STYLES[participant.status] ?? STATUS_STYLES.Pending
                  }`}
                >
                  {participant.status}
                </span>
              </div>
            </div>
          </Card>

          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/20">
                  <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Plan Start
                  </p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {formatDate(participant.plan_start_date)}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-50 dark:bg-purple-900/20">
                  <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Plan End
                  </p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {formatDate(participant.plan_end_date)}
                  </p>
                </div>
              </div>
            </Card>

            <Card
              className={`border p-5 ${
                days === null
                  ? "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                  : days < 0
                  ? "border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-950/20"
                  : days < 30
                  ? "border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-950/20"
                  : "border-emerald-200 bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-950/20"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    days === null
                      ? "bg-slate-100 dark:bg-slate-800"
                      : days < 0
                      ? "bg-red-100 dark:bg-red-900/30"
                      : days < 30
                      ? "bg-amber-100 dark:bg-amber-900/30"
                      : "bg-emerald-100 dark:bg-emerald-900/30"
                  }`}
                >
                  <Clock
                    className={`h-5 w-5 ${
                      days === null
                        ? "text-slate-500"
                        : days < 0
                        ? "text-red-600 dark:text-red-400"
                        : days < 30
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Days Until Review
                  </p>
                  <p
                    className={`text-sm font-semibold ${
                      days === null
                        ? "text-slate-900 dark:text-white"
                        : days < 0
                        ? "text-red-700 dark:text-red-400"
                        : days < 30
                        ? "text-amber-700 dark:text-amber-400"
                        : "text-emerald-700 dark:text-emerald-400"
                    }`}
                  >
                    {days === null
                      ? "—"
                      : days < 0
                      ? "Plan Expired"
                      : `${days} days`}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Details card */}
          <Card className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6">
            <h3 className="mb-5 font-semibold text-slate-900 dark:text-white">
              Participant Details
            </h3>

            {editing ? (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 dark:text-slate-300">
                      First Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={editForm.participant_first_name ?? ""}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          participant_first_name: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 dark:text-slate-300">
                      Last Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={editForm.participant_last_name ?? ""}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          participant_last_name: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-slate-700 dark:text-slate-300">
                    Status
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {(["Active", "Review", "Pending"] as Status[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() =>
                          setEditForm((p) => ({ ...p, status: s }))
                        }
                        className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                          editForm.status === s
                            ? s === "Active"
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                              : s === "Review"
                              ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                              : "border-slate-400 bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                            : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 dark:text-slate-300">
                      Plan Start Date
                    </Label>
                    <Input
                      type="date"
                      value={editForm.plan_start_date ?? ""}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          plan_start_date: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 dark:text-slate-300">
                      Plan End Date
                    </Label>
                    <Input
                      type="date"
                      value={editForm.plan_end_date ?? ""}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          plan_end_date: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-slate-700 dark:text-slate-300">
                    NDIS Number
                  </Label>
                  <Input
                    placeholder="43XXXXXXXX"
                    value={editForm.ndis_number ?? ""}
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        ndis_number: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-slate-700 dark:text-slate-300">
                    Notes
                  </Label>
                  <Textarea
                    value={editForm.notes ?? ""}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, notes: e.target.value }))
                    }
                    rows={4}
                  />
                </div>
              </div>
            ) : (
              <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                {[
                  {
                    label: "First Name",
                    value: participant.participant_first_name ?? "—",
                  },
                  {
                    label: "Last Name",
                    value: participant.participant_last_name ?? "—",
                  },
                  { label: "Status", value: participant.status },
                  {
                    label: "NDIS Number",
                    value: participant.ndis_number ?? "—",
                  },
                  {
                    label: "Plan Start",
                    value: formatDate(participant.plan_start_date),
                  },
                  {
                    label: "Plan End",
                    value: formatDate(participant.plan_end_date),
                  },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                      {label}
                    </dt>
                    <dd className="text-sm font-medium text-slate-900 dark:text-white">
                      {value}
                    </dd>
                  </div>
                ))}

                {participant.notes && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                      Notes
                    </dt>
                    <dd className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {participant.notes}
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </Card>

          {/* AI Tools */}
          <Card className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6">
            <h3 className="mb-1 font-semibold text-slate-900 dark:text-white">
              AI Tools
            </h3>
            <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
              Launch any tool below — use{" "}
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {fullName}
              </span>{" "}
              as the participant name to scope the output.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {AI_TOOLS.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.href}
                    onClick={() => router.push(tool.href)}
                    className="flex items-center gap-4 rounded-lg border border-slate-200 dark:border-slate-700 p-4 text-left transition-all hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:border-indigo-700 dark:hover:bg-indigo-900/10"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                      <Icon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {tool.label}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {tool.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Participant</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{fullName}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              )}
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

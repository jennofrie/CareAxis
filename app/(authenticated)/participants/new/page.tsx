"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePermissions } from "@/hooks/usePermissions";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Status = "Active" | "Review" | "Pending";

interface FormData {
  participant_first_name: string;
  participant_last_name: string;
  status: Status;
  plan_start_date: string;
  plan_end_date: string;
  ndis_number: string;
  notes: string;
}

interface FormErrors {
  participant_first_name?: string;
  participant_last_name?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewParticipantPage() {
  const router = useRouter();
  const { isLoading: permLoading } = usePermissions();
  const supabase = createClient();

  const [form, setForm] = useState<FormData>({
    participant_first_name: "",
    participant_last_name: "",
    status: "Active",
    plan_start_date: "",
    plan_end_date: "",
    ndis_number: "",
    notes: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const setField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key in errors) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!form.participant_first_name.trim())
      newErrors.participant_first_name = "First name is required.";
    if (!form.participant_last_name.trim())
      newErrors.participant_last_name = "Last name is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be signed in.");
        return;
      }

      const { error } = await supabase.from("cases").insert({
        user_id: user.id,
        participant_first_name: form.participant_first_name.trim(),
        participant_last_name: form.participant_last_name.trim(),
        status: form.status,
        plan_start_date: form.plan_start_date || null,
        plan_end_date: form.plan_end_date || null,
        ndis_number: form.ndis_number.trim() || null,
        notes: form.notes.trim() || null,
      });

      if (error) throw error;

      toast.success("Participant added successfully.");
      router.push("/participants");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save participant.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (permLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Add Participant" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Add Participant" />

      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => router.push("/participants")}
            className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Participants
          </button>

          <Card className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 lg:p-8">
            <h2 className="mb-6 text-lg font-semibold text-slate-900 dark:text-white">
              New Participant
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="first-name"
                    className="text-slate-700 dark:text-slate-300"
                  >
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="first-name"
                    placeholder="Jane"
                    value={form.participant_first_name}
                    onChange={(e) =>
                      setField("participant_first_name", e.target.value)
                    }
                    className={
                      errors.participant_first_name
                        ? "border-red-400 focus:border-red-400"
                        : ""
                    }
                  />
                  {errors.participant_first_name && (
                    <p className="text-xs text-red-500">
                      {errors.participant_first_name}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="last-name"
                    className="text-slate-700 dark:text-slate-300"
                  >
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="last-name"
                    placeholder="Smith"
                    value={form.participant_last_name}
                    onChange={(e) =>
                      setField("participant_last_name", e.target.value)
                    }
                    className={
                      errors.participant_last_name
                        ? "border-red-400 focus:border-red-400"
                        : ""
                    }
                  />
                  {errors.participant_last_name && (
                    <p className="text-xs text-red-500">
                      {errors.participant_last_name}
                    </p>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label className="text-slate-700 dark:text-slate-300">
                  Status <span className="text-red-500">*</span>
                </Label>
                <div className="flex flex-wrap items-center gap-2">
                  {(["Active", "Review", "Pending"] as Status[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setField("status", s)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                        form.status === s
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

              {/* Plan dates */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="plan-start"
                    className="text-slate-700 dark:text-slate-300"
                  >
                    Plan Start Date
                  </Label>
                  <Input
                    id="plan-start"
                    type="date"
                    value={form.plan_start_date}
                    onChange={(e) =>
                      setField("plan_start_date", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="plan-end"
                    className="text-slate-700 dark:text-slate-300"
                  >
                    Plan End Date
                  </Label>
                  <Input
                    id="plan-end"
                    type="date"
                    value={form.plan_end_date}
                    onChange={(e) => setField("plan_end_date", e.target.value)}
                  />
                </div>
              </div>

              {/* NDIS Number */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="ndis-number"
                  className="text-slate-700 dark:text-slate-300"
                >
                  NDIS Number{" "}
                  <span className="font-normal text-slate-400">(optional)</span>
                </Label>
                <Input
                  id="ndis-number"
                  placeholder="43XXXXXXXX"
                  value={form.ndis_number}
                  onChange={(e) => setField("ndis_number", e.target.value)}
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="notes"
                  className="text-slate-700 dark:text-slate-300"
                >
                  Notes{" "}
                  <span className="font-normal text-slate-400">(optional)</span>
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Any relevant context or notes for this participant..."
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  rows={4}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/participants")}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700"
                >
                  {submitting && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {submitting ? "Saving..." : "Add Participant"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

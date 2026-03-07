"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Search,
  Loader2,
  ChevronRight,
  Calendar,
} from "lucide-react";

import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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

function getInitials(first?: string | null, last?: string | null): string {
  return `${first?.charAt(0) ?? "?"}${last?.charAt(0) ?? ""}`.toUpperCase();
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysUntilEnd(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil(
    (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const STATUS_FILTERS = ["All", "Active", "Review", "Pending"] as const;

export default function ParticipantsPage() {
  const router = useRouter();
  const { isLoading: permLoading } = usePermissions();
  const supabase = createClient();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  const fetchParticipants = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setParticipants([]);
        return;
      }
      const { data, error } = await supabase
        .from("cases")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setParticipants((data as Participant[]) ?? []);
    } catch {
      toast.error("Failed to load participants.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (!permLoading) fetchParticipants();
  }, [permLoading, fetchParticipants]);

  const filtered = participants.filter((p) => {
    const name =
      `${p.participant_first_name ?? ""} ${p.participant_last_name ?? ""}`.toLowerCase();
    const matchesSearch =
      !search ||
      name.includes(search.toLowerCase()) ||
      (p.ndis_number ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "All" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (permLoading || loading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Participants" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Participants" />

      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        {/* Toolbar */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search participants..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-56 sm:w-64"
              />
            </div>

            <div className="flex items-center gap-1">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    statusFilter === s
                      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={() => router.push("/participants/new")}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700"
          >
            <Plus className="h-4 w-4" />
            Add Participant
          </Button>
        </div>

        {/* Count */}
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          {filtered.length} participant{filtered.length !== 1 ? "s" : ""}
          {statusFilter !== "All" ? ` · ${statusFilter}` : ""}
        </p>

        {/* Empty state */}
        {filtered.length === 0 && (
          <Card className="border border-slate-200 bg-white p-16 text-center dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/20">
              <Users className="h-8 w-8 text-indigo-400" />
            </div>
            <h3 className="mb-1 font-semibold text-slate-900 dark:text-white">
              {search || statusFilter !== "All"
                ? "No participants found"
                : "No participants yet"}
            </h3>
            <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
              {search || statusFilter !== "All"
                ? "Try adjusting your search or filter."
                : "Add your first participant to start tracking cases."}
            </p>
            {!search && statusFilter === "All" && (
              <Button
                onClick={() => router.push("/participants/new")}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700"
              >
                <Plus className="h-4 w-4" />
                Add First Participant
              </Button>
            )}
          </Card>
        )}

        {/* Table */}
        {filtered.length > 0 && (
          <Card className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="px-5 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                      Participant
                    </th>
                    <th className="px-5 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                      Status
                    </th>
                    <th className="hidden px-5 py-3 text-left font-medium text-slate-500 dark:text-slate-400 md:table-cell">
                      Plan Start
                    </th>
                    <th className="hidden px-5 py-3 text-left font-medium text-slate-500 dark:text-slate-400 md:table-cell">
                      Plan End
                    </th>
                    <th className="hidden px-5 py-3 text-left font-medium text-slate-500 dark:text-slate-400 lg:table-cell">
                      Days Left
                    </th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.map((p) => {
                    const days = daysUntilEnd(p.plan_end_date);
                    const daysLabel =
                      days === null
                        ? "—"
                        : days < 0
                        ? "Expired"
                        : `${days}d`;
                    const daysColor =
                      days === null
                        ? "text-slate-600 dark:text-slate-400"
                        : days < 0
                        ? "text-red-600 dark:text-red-400"
                        : days < 30
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-slate-600 dark:text-slate-400";

                    return (
                      <tr
                        key={p.id}
                        onClick={() => router.push(`/participants/${p.id}`)}
                        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-xs font-semibold text-white">
                              {getInitials(
                                p.participant_first_name,
                                p.participant_last_name
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white">
                                {p.participant_first_name}{" "}
                                {p.participant_last_name}
                              </p>
                              {p.ndis_number && (
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  NDIS {p.ndis_number}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              STATUS_STYLES[p.status] ?? STATUS_STYLES.Pending
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>

                        <td className="hidden px-5 py-4 md:table-cell">
                          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {formatDate(p.plan_start_date)}
                          </span>
                        </td>

                        <td className="hidden px-5 py-4 md:table-cell">
                          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {formatDate(p.plan_end_date)}
                          </span>
                        </td>

                        <td
                          className={`hidden px-5 py-4 font-medium lg:table-cell ${daysColor}`}
                        >
                          {daysLabel}
                        </td>

                        <td className="px-5 py-4">
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

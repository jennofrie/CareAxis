"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  FileText,
  Clock,
  TrendingUp,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Activity,
  Trash2,
  Loader2,
  Calendar,
} from "lucide-react";

import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { usePermissions } from "@/hooks/usePermissions";
import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Case {
  id: string;
  participant_first_name: string | null;
  participant_last_name: string | null;
  status: "Active" | "Review" | "Pending";
  plan_start_date: string | null;
  plan_end_date: string | null;
  created_at: string;
  user_id: string;
}

interface ActivityLog {
  id: string;
  user_id: string;
  user_email: string;
  action: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calculateMinutesSaved(caseNotes: number, reports: number): number {
  return caseNotes * 20 + reports * 45;
}

function getInitials(first?: string | null, last?: string | null): string {
  const f = first?.charAt(0) ?? "?";
  const l = last?.charAt(0) ?? "";
  return `${f}${l}`.toUpperCase();
}

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function planProgress(start: string | null, end: string | null): number {
  if (!start || !end) return 0;
  const now = new Date().getTime();
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (now <= s) return 0;
  if (now >= e) return 100;
  return Math.round(((now - s) / (e - s)) * 100);
}

const statusColors: Record<string, string> = {
  Active:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
  Review:
    "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  Pending:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

// ---------------------------------------------------------------------------
// Dummy / fallback data
// ---------------------------------------------------------------------------

const DUMMY_CASES: Case[] = [
  {
    id: "1",
    participant_first_name: "Sarah",
    participant_last_name: "Mitchell",
    status: "Active",
    plan_start_date: "2025-11-01",
    plan_end_date: "2026-05-01",
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    user_id: "",
  },
  {
    id: "2",
    participant_first_name: "James",
    participant_last_name: "Chen",
    status: "Review",
    plan_start_date: "2025-09-15",
    plan_end_date: "2026-03-15",
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    user_id: "",
  },
  {
    id: "3",
    participant_first_name: "Maria",
    participant_last_name: "Garcia",
    status: "Active",
    plan_start_date: "2026-01-10",
    plan_end_date: "2026-07-10",
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    user_id: "",
  },
  {
    id: "4",
    participant_first_name: "David",
    participant_last_name: "Thompson",
    status: "Pending",
    plan_start_date: null,
    plan_end_date: null,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    user_id: "",
  },
  {
    id: "5",
    participant_first_name: "Emily",
    participant_last_name: "Nguyen",
    status: "Active",
    plan_start_date: "2025-12-01",
    plan_end_date: "2026-06-01",
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    user_id: "",
  },
  {
    id: "6",
    participant_first_name: "Robert",
    participant_last_name: "Williams",
    status: "Review",
    plan_start_date: "2025-10-01",
    plan_end_date: "2026-04-01",
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    user_id: "",
  },
  {
    id: "7",
    participant_first_name: "Lisa",
    participant_last_name: "Park",
    status: "Active",
    plan_start_date: "2026-02-01",
    plan_end_date: "2026-08-01",
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    user_id: "",
  },
];

const DUMMY_ACTIVITY: ActivityLog[] = [
  {
    id: "a1",
    user_id: "",
    user_email: "you@example.com",
    action: "Created case note for Sarah Mitchell",
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: "a2",
    user_id: "",
    user_email: "you@example.com",
    action: "Synthesized Report for James Chen",
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "a3",
    user_id: "",
    user_email: "you@example.com",
    action: "Updated plan for Maria Garcia",
    created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CASES_PER_PAGE = 6;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const router = useRouter();
  const { canAccessReportSynthesizer, canAccessCaseNotes } = usePermissions();
  const supabase = createClient();

  // State
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<Case[]>([]);
  const [totalCases, setTotalCases] = useState(0);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [caseNotesCount, setCaseNotesCount] = useState(0);
  const [reportsCount, setReportsCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Use dummy data when not authenticated or in dev
        setCases(DUMMY_CASES);
        setTotalCases(DUMMY_CASES.length);
        setActivityLogs(DUMMY_ACTIVITY);
        setCaseNotesCount(12);
        setReportsCount(4);
        setLoading(false);
        return;
      }

      // Fetch cases
      const { data: casesData, count: casesCount } = await supabase
        .from("cases")
        .select("*", { count: "exact" })
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      // Fetch activity logs
      const { data: activityData } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      // Count case notes
      const { count: notesCount } = await supabase
        .from("activity_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .ilike("action", "%case note%");

      // Count reports
      const { count: rptCount } = await supabase
        .from("activity_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .like("action", "Synthesized Report%");

      const fetchedCases = (casesData as Case[] | null) ?? [];
      const fetchedActivity = (activityData as ActivityLog[] | null) ?? [];

      // Fall back to dummy data if nothing exists
      if (fetchedCases.length === 0 && fetchedActivity.length === 0) {
        setCases(DUMMY_CASES);
        setTotalCases(DUMMY_CASES.length);
        setActivityLogs(DUMMY_ACTIVITY);
        setCaseNotesCount(12);
        setReportsCount(4);
      } else {
        setCases(fetchedCases);
        setTotalCases(casesCount ?? fetchedCases.length);
        setActivityLogs(fetchedActivity);
        setCaseNotesCount(notesCount ?? 0);
        setReportsCount(rptCount ?? 0);
      }
    } catch {
      // Fallback to dummy data on error
      setCases(DUMMY_CASES);
      setTotalCases(DUMMY_CASES.length);
      setActivityLogs(DUMMY_ACTIVITY);
      setCaseNotesCount(12);
      setReportsCount(4);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const minutesSaved = calculateMinutesSaved(caseNotesCount, reportsCount);
  const completionRate =
    totalCases > 0
      ? Math.round(
          (cases.filter((c) => c.status === "Active").length / totalCases) * 100
        )
      : 0;

  const filteredCases = cases.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.participant_first_name ?? "").toLowerCase().includes(q) ||
      (c.participant_last_name ?? "").toLowerCase().includes(q) ||
      c.status.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredCases.length / CASES_PER_PAGE));
  const paginatedCases = filteredCases.slice(
    (currentPage - 1) * CASES_PER_PAGE,
    currentPage * CASES_PER_PAGE
  );

  // ---------------------------------------------------------------------------
  // Stats config
  // ---------------------------------------------------------------------------

  const stats = [
    {
      label: "Total Notes",
      value: caseNotesCount,
      icon: FileText,
      iconBg: "bg-indigo-50 dark:bg-indigo-900/20",
      iconColor: "text-indigo-600 dark:text-indigo-400",
    },
    {
      label: "Reports Generated",
      value: reportsCount,
      icon: TrendingUp,
      iconBg: "bg-purple-50 dark:bg-purple-900/20",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
    {
      label: "Time Saved",
      value: `${minutesSaved}m`,
      icon: Clock,
      iconBg: "bg-emerald-50 dark:bg-emerald-900/20",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Completion Rate",
      value: `${completionRate}%`,
      icon: Users,
      iconBg: "bg-amber-50 dark:bg-amber-900/20",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
  ];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex h-screen flex-col">
        <Header title="Dashboard" />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <Header title="Dashboard" />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        {/* ---------------------------------------------------------------- */}
        {/* Stats Grid                                                       */}
        {/* ---------------------------------------------------------------- */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.label}
                className="border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${stat.iconBg}`}
                  >
                    <Icon className={`h-6 w-6 ${stat.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {stat.value}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Case Overview                                                    */}
        {/* ---------------------------------------------------------------- */}
        <section className="mb-8">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Case Overview
            </h2>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search cases..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9"
                />
              </div>

              <Button
                onClick={() => router.push("/participants/new")}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700"
              >
                <Plus className="h-4 w-4" />
                New Case
              </Button>
            </div>
          </div>

          {/* Case cards grid */}
          {paginatedCases.length === 0 ? (
            <Card className="border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
              <Users className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No cases found.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedCases.map((c) => {
                const initials = getInitials(
                  c.participant_first_name,
                  c.participant_last_name
                );
                const progress = planProgress(c.plan_start_date, c.plan_end_date);

                return (
                  <Card
                    key={c.id}
                    className="border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="mb-4 flex items-center gap-3">
                      {/* Avatar */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-sm font-semibold text-white">
                        {initials}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-900 dark:text-white">
                          {c.participant_first_name ?? ""} {c.participant_last_name ?? ""}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {timeAgo(c.created_at)}
                        </p>
                      </div>

                      {/* Status badge */}
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          statusColors[c.status] ?? statusColors.Pending
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>

                    {/* Plan timeline progress */}
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Plan Progress
                        </span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-indigo-600 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <span className="text-sm text-slate-600 dark:text-slate-400">
                Page {currentPage} of {totalPages}
              </span>

              <Button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Recent Activity                                                  */}
        {/* ---------------------------------------------------------------- */}
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
            Recent Activity
          </h2>

          <Card className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            {activityLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12">
                <Activity className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No recent activity.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {activityLogs.map((log) => (
                  <li
                    key={log.id}
                    className="flex items-center gap-4 px-5 py-3"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/20">
                      <Activity className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-slate-900 dark:text-white">
                        {log.action}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {log.user_email} &middot; {timeAgo(log.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Quick Actions                                                    */}
        {/* ---------------------------------------------------------------- */}
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
            Quick Actions
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Generate Report */}
            <Card
              className={`group border border-slate-200 bg-white p-5 transition-shadow dark:border-slate-800 dark:bg-slate-900 ${
                canAccessReportSynthesizer
                  ? "cursor-pointer hover:shadow-md"
                  : "opacity-50"
              }`}
              onClick={() =>
                canAccessReportSynthesizer &&
                router.push("/report-synthesizer")
              }
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/20">
                <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-medium text-slate-900 dark:text-white">
                Generate Report
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Synthesize case data into structured reports.
              </p>
            </Card>

            {/* Visual Case Notes */}
            <Card
              className={`group border border-slate-200 bg-white p-5 transition-shadow dark:border-slate-800 dark:bg-slate-900 ${
                canAccessCaseNotes
                  ? "cursor-pointer hover:shadow-md"
                  : "opacity-50"
              }`}
              onClick={() =>
                canAccessCaseNotes && router.push("/visual-case-notes")
              }
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="font-medium text-slate-900 dark:text-white">
                Visual Case Notes
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Create and manage visual case notes.
              </p>
            </Card>

            {/* Add Participant */}
            <Card
              className="group cursor-pointer border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              onClick={() => router.push("/participants/new")}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="font-medium text-slate-900 dark:text-white">
                Add Participant
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Register a new participant to begin tracking.
              </p>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}

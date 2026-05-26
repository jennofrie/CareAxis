"use client";

import { useState, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  User,
  Users,
  CheckCircle2,
  Loader2,
  XCircle,
  CalendarDays,
  Filter,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ShiftStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
type SupportType =
  | "Core Supports"
  | "Capacity Building"
  | "Community Access"
  | "Personal Care"
  | "Domestic Assistance";

interface Shift {
  id: string;
  participant_first_name: string;
  participant_last_name: string;
  support_worker_name: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  support_type: SupportType;
  status: ShiftStatus;
  notes?: string;
  created_at: string;
}

type FilterStatus = "all" | ShiftStatus;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Monday = 0 offset
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatWeekRange(start: Date): string {
  const end = addDays(start, 6);
  const fmt = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" });
  return `${fmt.format(start)} – ${fmt.format(end)}, ${start.getFullYear()}`;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  ShiftStatus,
  { label: string; badgeVariant: "info" | "warning" | "success" | "error"; color: string }
> = {
  scheduled: { label: "Scheduled", badgeVariant: "info", color: "bg-indigo-500" },
  in_progress: { label: "In Progress", badgeVariant: "warning", color: "bg-amber-500" },
  completed: { label: "Completed", badgeVariant: "success", color: "bg-emerald-500" },
  cancelled: { label: "Cancelled", badgeVariant: "error", color: "bg-red-500" },
};

const SUPPORT_TYPES: SupportType[] = [
  "Core Supports",
  "Capacity Building",
  "Community Access",
  "Personal Care",
  "Domestic Assistance",
];

const AVATAR_COLORS = [
  "bg-indigo-500",
  "bg-purple-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-teal-500",
  "bg-sky-500",
];

function avatarColor(name: string): string {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

// ─── Dummy Data ───────────────────────────────────────────────────────────────
// TODO: Replace dummy data with Supabase query

const DUMMY_SHIFTS: Shift[] = [
  {
    id: "shift-001",
    participant_first_name: "Sarah",
    participant_last_name: "Mitchell",
    support_worker_name: "Alex Turner",
    date: "2026-03-23",
    start_time: "09:00",
    end_time: "11:00",
    support_type: "Personal Care",
    status: "completed",
    notes: "Morning routine assistance. Sarah was in good spirits.",
    created_at: "2026-03-20T08:00:00Z",
  },
  {
    id: "shift-002",
    participant_first_name: "James",
    participant_last_name: "Chen",
    support_worker_name: "Sophie Nguyen",
    date: "2026-03-23",
    start_time: "13:00",
    end_time: "15:30",
    support_type: "Community Access",
    status: "completed",
    notes: "Library visit and lunch outing.",
    created_at: "2026-03-20T08:05:00Z",
  },
  {
    id: "shift-003",
    participant_first_name: "Maria",
    participant_last_name: "Garcia",
    support_worker_name: "Mark Davies",
    date: "2026-03-24",
    start_time: "08:00",
    end_time: "10:00",
    support_type: "Domestic Assistance",
    status: "completed",
    notes: "Cleaning and meal prep.",
    created_at: "2026-03-20T08:10:00Z",
  },
  {
    id: "shift-004",
    participant_first_name: "David",
    participant_last_name: "Thompson",
    support_worker_name: "Rachel Kim",
    date: "2026-03-24",
    start_time: "10:00",
    end_time: "12:00",
    support_type: "Core Supports",
    status: "in_progress",
    notes: "Daily living support and medication management.",
    created_at: "2026-03-20T08:15:00Z",
  },
  {
    id: "shift-005",
    participant_first_name: "Emily",
    participant_last_name: "Nguyen",
    support_worker_name: "Alex Turner",
    date: "2026-03-24",
    start_time: "14:00",
    end_time: "16:30",
    support_type: "Capacity Building",
    status: "scheduled",
    notes: "Life skills training — cooking and budgeting.",
    created_at: "2026-03-20T08:20:00Z",
  },
  {
    id: "shift-006",
    participant_first_name: "Robert",
    participant_last_name: "Williams",
    support_worker_name: "Sophie Nguyen",
    date: "2026-03-25",
    start_time: "09:00",
    end_time: "11:30",
    support_type: "Community Access",
    status: "scheduled",
    notes: "Gym session and social group activity at the community centre.",
    created_at: "2026-03-20T08:25:00Z",
  },
  {
    id: "shift-007",
    participant_first_name: "Lisa",
    participant_last_name: "Park",
    support_worker_name: "Mark Davies",
    date: "2026-03-25",
    start_time: "13:00",
    end_time: "15:00",
    support_type: "Personal Care",
    status: "scheduled",
    notes: "Afternoon personal care routine.",
    created_at: "2026-03-20T08:30:00Z",
  },
  {
    id: "shift-008",
    participant_first_name: "Sarah",
    participant_last_name: "Mitchell",
    support_worker_name: "Rachel Kim",
    date: "2026-03-25",
    start_time: "17:00",
    end_time: "19:00",
    support_type: "Domestic Assistance",
    status: "scheduled",
    notes: "Evening meal preparation and light housekeeping.",
    created_at: "2026-03-20T08:35:00Z",
  },
  {
    id: "shift-009",
    participant_first_name: "James",
    participant_last_name: "Chen",
    support_worker_name: "Alex Turner",
    date: "2026-03-26",
    start_time: "10:00",
    end_time: "13:00",
    support_type: "Core Supports",
    status: "scheduled",
    notes: "Morning support including personal care and community outing.",
    created_at: "2026-03-20T08:40:00Z",
  },
  {
    id: "shift-010",
    participant_first_name: "Maria",
    participant_last_name: "Garcia",
    support_worker_name: "Sophie Nguyen",
    date: "2026-03-26",
    start_time: "14:00",
    end_time: "16:00",
    support_type: "Capacity Building",
    status: "scheduled",
    notes: "Communication and social skills session.",
    created_at: "2026-03-20T08:45:00Z",
  },
  {
    id: "shift-011",
    participant_first_name: "David",
    participant_last_name: "Thompson",
    support_worker_name: "Mark Davies",
    date: "2026-03-27",
    start_time: "09:00",
    end_time: "11:00",
    support_type: "Personal Care",
    status: "scheduled",
    notes: "Morning routine and medical appointment transport.",
    created_at: "2026-03-20T08:50:00Z",
  },
  {
    id: "shift-012",
    participant_first_name: "Emily",
    participant_last_name: "Nguyen",
    support_worker_name: "Rachel Kim",
    date: "2026-03-27",
    start_time: "12:00",
    end_time: "14:00",
    support_type: "Community Access",
    status: "scheduled",
    notes: "Volunteer program at local animal shelter.",
    created_at: "2026-03-20T08:55:00Z",
  },
  {
    id: "shift-013",
    participant_first_name: "Robert",
    participant_last_name: "Williams",
    support_worker_name: "Alex Turner",
    date: "2026-03-28",
    start_time: "10:00",
    end_time: "12:30",
    support_type: "Core Supports",
    status: "scheduled",
    notes: "Saturday activity support.",
    created_at: "2026-03-20T09:00:00Z",
  },
  {
    id: "shift-014",
    participant_first_name: "Lisa",
    participant_last_name: "Park",
    support_worker_name: "Sophie Nguyen",
    date: "2026-03-28",
    start_time: "13:30",
    end_time: "16:00",
    support_type: "Domestic Assistance",
    status: "scheduled",
    notes: "Weekly home management session.",
    created_at: "2026-03-20T09:05:00Z",
  },
  {
    id: "shift-015",
    participant_first_name: "Sarah",
    participant_last_name: "Mitchell",
    support_worker_name: "Mark Davies",
    date: "2026-03-29",
    start_time: "11:00",
    end_time: "13:00",
    support_type: "Community Access",
    status: "cancelled",
    notes: "Cancelled — participant unwell.",
    created_at: "2026-03-20T09:10:00Z",
  },
];

// ─── Form State ───────────────────────────────────────────────────────────────

interface ShiftFormData {
  participant_first_name: string;
  participant_last_name: string;
  support_worker_name: string;
  date: string;
  start_time: string;
  end_time: string;
  support_type: SupportType;
  notes: string;
}

const EMPTY_FORM: ShiftFormData = {
  participant_first_name: "",
  participant_last_name: "",
  support_worker_name: "",
  date: "",
  start_time: "",
  end_time: "",
  support_type: "Core Supports",
  notes: "",
};

// ─── Shift Card (calendar cell) ───────────────────────────────────────────────

function ShiftCard({ shift, onClick }: { shift: Shift; onClick: () => void }) {
  const status = STATUS_CONFIG[shift.status];
  const initials = getInitials(shift.participant_first_name, shift.participant_last_name);
  const color = avatarColor(shift.participant_first_name + shift.participant_last_name);

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-sm transition-all duration-150 group"
    >
      <div className="flex items-start gap-2">
        <div
          className={`w-7 h-7 rounded-full ${color} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
            {shift.participant_first_name} {shift.participant_last_name}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{shift.support_worker_name}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            {shift.start_time} – {shift.end_time}
          </p>
        </div>
      </div>
      <div className="mt-1.5">
        <Badge variant={status.badgeVariant} className="text-[10px] px-1.5 py-0">
          {status.label}
        </Badge>
      </div>
    </button>
  );
}

// ─── New / Edit Shift Modal ───────────────────────────────────────────────────

interface ShiftFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ShiftFormData) => void;
  initialData?: ShiftFormData;
  mode: "create" | "edit";
}

function ShiftFormModal({ open, onClose, onSubmit, initialData, mode }: ShiftFormModalProps) {
  const [form, setForm] = useState<ShiftFormData>(initialData ?? EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof ShiftFormData, string>>>({});

  // Sync when initialData changes (e.g. when editing a different shift)
  useState(() => {
    setForm(initialData ?? EMPTY_FORM);
    setErrors({});
  });

  const handleChange = (field: keyof ShiftFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ShiftFormData, string>> = {};
    if (!form.participant_first_name.trim()) newErrors.participant_first_name = "Required";
    if (!form.participant_last_name.trim()) newErrors.participant_last_name = "Required";
    if (!form.support_worker_name.trim()) newErrors.support_worker_name = "Required";
    if (!form.date) newErrors.date = "Required";
    if (!form.start_time) newErrors.start_time = "Required";
    if (!form.end_time) newErrors.end_time = "Required";
    if (form.start_time && form.end_time && form.start_time >= form.end_time) {
      newErrors.end_time = "End time must be after start time";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit(form);
    setForm(EMPTY_FORM);
    setErrors({});
  };

  const handleClose = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-white">
            {mode === "create" ? "New Shift" : "Edit Shift"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Participant name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Sarah"
                value={form.participant_first_name}
                onChange={(e) => handleChange("participant_first_name", e.target.value)}
                className={errors.participant_first_name ? "border-red-400 focus:border-red-400" : ""}
              />
              {errors.participant_first_name && (
                <p className="text-red-500 text-[11px] mt-0.5">{errors.participant_first_name}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Mitchell"
                value={form.participant_last_name}
                onChange={(e) => handleChange("participant_last_name", e.target.value)}
                className={errors.participant_last_name ? "border-red-400 focus:border-red-400" : ""}
              />
              {errors.participant_last_name && (
                <p className="text-red-500 text-[11px] mt-0.5">{errors.participant_last_name}</p>
              )}
            </div>
          </div>

          {/* Support Worker */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Support Worker <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Alex Turner"
              value={form.support_worker_name}
              onChange={(e) => handleChange("support_worker_name", e.target.value)}
              className={errors.support_worker_name ? "border-red-400 focus:border-red-400" : ""}
            />
            {errors.support_worker_name && (
              <p className="text-red-500 text-[11px] mt-0.5">{errors.support_worker_name}</p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => handleChange("date", e.target.value)}
              className={errors.date ? "border-red-400 focus:border-red-400" : ""}
            />
            {errors.date && <p className="text-red-500 text-[11px] mt-0.5">{errors.date}</p>}
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Start Time <span className="text-red-500">*</span>
              </label>
              <Input
                type="time"
                value={form.start_time}
                onChange={(e) => handleChange("start_time", e.target.value)}
                className={errors.start_time ? "border-red-400 focus:border-red-400" : ""}
              />
              {errors.start_time && (
                <p className="text-red-500 text-[11px] mt-0.5">{errors.start_time}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                End Time <span className="text-red-500">*</span>
              </label>
              <Input
                type="time"
                value={form.end_time}
                onChange={(e) => handleChange("end_time", e.target.value)}
                className={errors.end_time ? "border-red-400 focus:border-red-400" : ""}
              />
              {errors.end_time && (
                <p className="text-red-500 text-[11px] mt-0.5">{errors.end_time}</p>
              )}
            </div>
          </div>

          {/* Support Type */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Support Type <span className="text-red-500">*</span>
            </label>
            <select
              value={form.support_type}
              onChange={(e) => handleChange("support_type", e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors duration-200"
            >
              {SUPPORT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Notes
            </label>
            <Textarea
              placeholder="Any additional notes about this shift…"
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {mode === "create" ? "Create Shift" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Shift Detail Modal ───────────────────────────────────────────────────────

interface ShiftDetailModalProps {
  shift: Shift | null;
  onClose: () => void;
  onStatusChange: (id: string, status: ShiftStatus) => void;
  onEdit: (shift: Shift) => void;
}

function ShiftDetailModal({ shift, onClose, onStatusChange, onEdit }: ShiftDetailModalProps) {
  if (!shift) return null;
  const status = STATUS_CONFIG[shift.status];

  return (
    <Dialog open={!!shift} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-white">Shift Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Participant */}
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full ${avatarColor(
                shift.participant_first_name + shift.participant_last_name
              )} flex items-center justify-center text-white text-sm font-bold shrink-0`}
            >
              {getInitials(shift.participant_first_name, shift.participant_last_name)}
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">
                {shift.participant_first_name} {shift.participant_last_name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Participant</p>
            </div>
            <div className="ml-auto">
              <Badge variant={status.badgeVariant}>{status.label}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-400">Support Worker</p>
                <p className="font-medium">{shift.support_worker_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-400">Date</p>
                <p className="font-medium">
                  {new Intl.DateTimeFormat("en-AU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }).format(new Date(shift.date + "T00:00:00"))}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-400">Time</p>
                <p className="font-medium">
                  {shift.start_time} – {shift.end_time}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Users className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-400">Support Type</p>
                <p className="font-medium">{shift.support_type}</p>
              </div>
            </div>
          </div>

          {shift.notes && (
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Notes</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{shift.notes}</p>
            </div>
          )}

          {/* Status Actions */}
          {shift.status !== "cancelled" && shift.status !== "completed" && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              {shift.status === "scheduled" && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onStatusChange(shift.id, "in_progress")}
                  className="flex items-center gap-1.5"
                >
                  <Loader2 className="w-3.5 h-3.5" />
                  Mark as In Progress
                </Button>
              )}
              {(shift.status === "scheduled" || shift.status === "in_progress") && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onStatusChange(shift.id, "completed")}
                  className="flex items-center gap-1.5 !text-emerald-600 dark:!text-emerald-400"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Mark as Completed
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onStatusChange(shift.id, "cancelled")}
                className="flex items-center gap-1.5 !text-red-600 dark:!text-red-400"
              >
                <XCircle className="w-3.5 h-3.5" />
                Cancel Shift
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {shift.status !== "cancelled" && shift.status !== "completed" && (
            <Button variant="primary" onClick={() => onEdit(shift)}>
              Edit Shift
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ShiftsPage() {
  // Week navigation
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date("2026-03-24")));

  // Shifts state
  const [shifts, setShifts] = useState<Shift[]>(DUMMY_SHIFTS);

  // Filter
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  // Modals
  const [showNewShift, setShowNewShift] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [detailShift, setDetailShift] = useState<Shift | null>(null);

  // ── Week days ──────────────────────────────────────────────────────────────

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const weekDateStrings = useMemo(() => weekDays.map(formatDate), [weekDays]);

  // ── Filtered shifts for current week ──────────────────────────────────────

  const weekShifts = useMemo(() => {
    return shifts.filter((s) => weekDateStrings.includes(s.date));
  }, [shifts, weekDateStrings]);

  const displayShifts = useMemo(() => {
    if (filterStatus === "all") return weekShifts;
    return weekShifts.filter((s) => s.status === filterStatus);
  }, [weekShifts, filterStatus]);

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = weekShifts.length;
    const completed = weekShifts.filter((s) => s.status === "completed").length;
    const inProgress = weekShifts.filter((s) => s.status === "in_progress").length;
    const upcoming = weekShifts.filter((s) => s.status === "scheduled").length;
    return { total, completed, inProgress, upcoming };
  }, [weekShifts]);

  // ── Shifts by day (for calendar grid) ─────────────────────────────────────

  const shiftsByDay = useMemo(() => {
    const map: Record<string, Shift[]> = {};
    weekDateStrings.forEach((d) => (map[d] = []));
    displayShifts.forEach((s) => {
      if (map[s.date]) map[s.date].push(s);
    });
    return map;
  }, [displayShifts, weekDateStrings]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const prevWeek = () => setWeekStart((d) => addDays(d, -7));
  const nextWeek = () => setWeekStart((d) => addDays(d, 7));

  const handleCreate = (data: ShiftFormData) => {
    const newShift: Shift = {
      ...data,
      id: `shift-${generateId()}`,
      status: "scheduled",
      created_at: new Date().toISOString(),
    };
    setShifts((prev) => [...prev, newShift]);
    setShowNewShift(false);
  };

  const handleEdit = (data: ShiftFormData) => {
    if (!editingShift) return;
    setShifts((prev) =>
      prev.map((s) => (s.id === editingShift.id ? { ...s, ...data } : s))
    );
    setEditingShift(null);
    setDetailShift(null);
  };

  const handleStatusChange = (id: string, status: ShiftStatus) => {
    setShifts((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
    setDetailShift((prev) => (prev?.id === id ? { ...prev, status } : prev));
  };

  const openEdit = (shift: Shift) => {
    setDetailShift(null);
    setEditingShift(shift);
  };

  const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const today = formatDate(new Date("2026-03-24"));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Shifts" />

      <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">

        {/* ── Stats Bar ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total This Week</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.total}</p>
              </div>
              <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Completed</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.completed}</p>
              </div>
              <div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">In Progress</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{stats.inProgress}</p>
              </div>
              <div className="w-9 h-9 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Upcoming</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.upcoming}</p>
              </div>
              <div className="w-9 h-9 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </div>
            </div>
          </Card>
        </div>

        {/* ── Toolbar: Week Nav + Filter + New Shift ───────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Week navigator */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={prevWeek} aria-label="Previous week">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-sm font-semibold text-slate-900 dark:text-white min-w-[200px] text-center">
              {formatWeekRange(weekStart)}
            </div>
            <Button variant="outline" size="icon" onClick={nextWeek} aria-label="Next week">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter bar */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
              <Filter className="w-3.5 h-3.5 text-slate-400 ml-1" />
              {(["all", "scheduled", "in_progress", "completed", "cancelled"] as FilterStatus[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterStatus(f)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 capitalize ${
                    filterStatus === f
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
                >
                  {f === "in_progress" ? "In Progress" : f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {/* New Shift */}
            <Button variant="primary" size="sm" onClick={() => setShowNewShift(true)} className="flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              New Shift
            </Button>
          </div>
        </div>

        {/* ── Desktop: Weekly Calendar Grid ────────────────────────────────── */}
        <div className="hidden md:block">
          <div className="grid grid-cols-7 gap-3">
            {weekDays.map((day, i) => {
              const dateStr = formatDate(day);
              const isToday = dateStr === today;
              const dayShifts = shiftsByDay[dateStr] ?? [];
              const dayName = DAYS_SHORT[i];
              const dayNum = day.getDate();

              return (
                <div key={dateStr} className="flex flex-col gap-2 min-h-[200px]">
                  {/* Day header */}
                  <div
                    className={`text-center py-2 rounded-lg ${
                      isToday
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <p className="text-[11px] font-medium uppercase tracking-wide">{dayName}</p>
                    <p className={`text-lg font-bold leading-none mt-0.5 ${isToday ? "text-white" : "text-slate-900 dark:text-white"}`}>
                      {dayNum}
                    </p>
                  </div>

                  {/* Shift cards */}
                  <div className="flex flex-col gap-1.5 flex-1">
                    {dayShifts.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center">
                        <p className="text-[11px] text-slate-300 dark:text-slate-600 text-center px-2">No shifts</p>
                      </div>
                    ) : (
                      dayShifts.map((shift) => (
                        <ShiftCard key={shift.id} shift={shift} onClick={() => setDetailShift(shift)} />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Mobile: List View ─────────────────────────────────────────────── */}
        <div className="md:hidden space-y-4">
          {weekDays.map((day, i) => {
            const dateStr = formatDate(day);
            const isToday = dateStr === today;
            const dayShifts = shiftsByDay[dateStr] ?? [];
            const dayName = DAYS_SHORT[i];

            return (
              <div key={dateStr}>
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      isToday
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {dayName} {day.getDate()}
                  </div>
                  {dayShifts.length > 0 && (
                    <span className="text-xs text-slate-400">{dayShifts.length} shift{dayShifts.length !== 1 ? "s" : ""}</span>
                  )}
                </div>

                {dayShifts.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-600 ml-2 mb-3">No shifts scheduled.</p>
                ) : (
                  <div className="space-y-2">
                    {dayShifts.map((shift) => {
                      const status = STATUS_CONFIG[shift.status];
                      const initials = getInitials(shift.participant_first_name, shift.participant_last_name);
                      const color = avatarColor(shift.participant_first_name + shift.participant_last_name);

                      return (
                        <button
                          key={shift.id}
                          onClick={() => setDetailShift(shift)}
                          className="w-full text-left flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-400 transition-all duration-150"
                        >
                          <div
                            className={`w-9 h-9 rounded-full ${color} flex items-center justify-center text-white text-xs font-bold shrink-0`}
                          >
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                              {shift.participant_first_name} {shift.participant_last_name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{shift.support_worker_name}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {shift.start_time}–{shift.end_time}
                            </p>
                            <Badge variant={status.badgeVariant} className="text-[10px] mt-0.5">
                              {status.label}
                            </Badge>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty state when filter returns nothing */}
        {displayShifts.length === 0 && filterStatus !== "all" && (
          <Card className="py-12 text-center">
            <CalendarDays className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400 font-medium">No {filterStatus.replace("_", " ")} shifts this week</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
              Try a different filter or navigate to another week.
            </p>
          </Card>
        )}

      </div>

      {/* ── Modals ────────────────────────────────────────────────────────────── */}

      {/* New Shift */}
      <ShiftFormModal
        open={showNewShift}
        onClose={() => setShowNewShift(false)}
        onSubmit={handleCreate}
        mode="create"
      />

      {/* Edit Shift */}
      <ShiftFormModal
        open={!!editingShift}
        onClose={() => setEditingShift(null)}
        onSubmit={handleEdit}
        initialData={
          editingShift
            ? {
                participant_first_name: editingShift.participant_first_name,
                participant_last_name: editingShift.participant_last_name,
                support_worker_name: editingShift.support_worker_name,
                date: editingShift.date,
                start_time: editingShift.start_time,
                end_time: editingShift.end_time,
                support_type: editingShift.support_type,
                notes: editingShift.notes ?? "",
              }
            : undefined
        }
        mode="edit"
      />

      {/* Shift Detail */}
      <ShiftDetailModal
        shift={detailShift}
        onClose={() => setDetailShift(null)}
        onStatusChange={handleStatusChange}
        onEdit={openEdit}
      />
    </div>
  );
}

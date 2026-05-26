"use client";

import { useState, useMemo } from "react";
import {
  Users,
  Plus,
  Search,
  Filter,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  UserCheck,
  UserX,
  Clock,
  Star,
  Download,
  Edit,
  Trash2,
  Eye,
  X,
} from "lucide-react";

import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CredentialBadge } from "@/components/staff/CredentialBadge";
import {
  StaffMember,
  StaffRole,
  EmploymentType,
  StaffStatus,
  getCredentialStatus,
  getOverallComplianceScore,
} from "@/lib/staff-utils";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Demo seed data — mirrors what you'd fetch from Supabase `staff` table
// ---------------------------------------------------------------------------

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

const SEED_STAFF: StaffMember[] = [
  {
    id: "s1",
    firstName: "Amara",
    lastName: "Osei",
    role: "Support Worker",
    employmentType: "Full-time",
    status: "Active",
    phone: "0412 345 678",
    email: "amara.osei@careaxis.au",
    ndisScreening: { number: "NSW-2024-001234", expiryDate: daysFromNow(320) },
    wwcCheck: { number: "WWC-0098765-A", expiryDate: daysFromNow(200) },
    firstAid: { provider: "St John Ambulance", expiryDate: daysFromNow(380) },
    policeCheck: { date: "2023-06-15", expiryDate: daysFromNow(650) },
  },
  {
    id: "s2",
    firstName: "Liam",
    lastName: "Thornton",
    role: "Team Leader",
    employmentType: "Full-time",
    status: "Active",
    phone: "0421 987 654",
    email: "liam.thornton@careaxis.au",
    ndisScreening: { number: "NSW-2023-009876", expiryDate: daysFromNow(25) }, // expiring soon
    wwcCheck: { number: "WWC-0054321-B", expiryDate: daysFromNow(150) },
    firstAid: { provider: "Red Cross", expiryDate: daysFromNow(90) },
    policeCheck: { date: "2022-11-01", expiryDate: daysFromNow(-30) }, // expired
  },
  {
    id: "s3",
    firstName: "Priya",
    lastName: "Sharma",
    role: "Coordinator",
    employmentType: "Full-time",
    status: "Active",
    phone: "0455 222 111",
    email: "priya.sharma@careaxis.au",
    ndisScreening: { number: "VIC-2024-005678", expiryDate: daysFromNow(500) },
    wwcCheck: { number: "WWC-1122334-C", expiryDate: daysFromNow(480) },
    firstAid: { provider: "St John Ambulance", expiryDate: daysFromNow(290) },
    policeCheck: { date: "2024-01-10", expiryDate: daysFromNow(700) },
  },
  {
    id: "s4",
    firstName: "Marcus",
    lastName: "Webb",
    role: "Support Worker",
    employmentType: "Casual",
    status: "Active",
    phone: "0488 765 432",
    email: "marcus.webb@careaxis.au",
    ndisScreening: { number: "QLD-2023-007654", expiryDate: daysFromNow(-10) }, // expired
    wwcCheck: { number: "", expiryDate: "" }, // missing
    firstAid: { provider: "Surf Life Saving", expiryDate: daysFromNow(180) },
    policeCheck: { date: "2023-04-20", expiryDate: daysFromNow(400) },
  },
  {
    id: "s5",
    firstName: "Chloe",
    lastName: "Nakamura",
    role: "Support Worker",
    employmentType: "Part-time",
    status: "On Leave",
    phone: "0411 333 222",
    email: "chloe.nakamura@careaxis.au",
    ndisScreening: { number: "NSW-2024-003456", expiryDate: daysFromNow(410) },
    wwcCheck: { number: "WWC-9988776-D", expiryDate: daysFromNow(400) },
    firstAid: { provider: "St John Ambulance", expiryDate: daysFromNow(28) }, // expiring soon
    policeCheck: { date: "2024-03-01", expiryDate: daysFromNow(900) },
  },
  {
    id: "s6",
    firstName: "David",
    lastName: "Mensah",
    role: "Support Worker",
    employmentType: "Full-time",
    status: "Inactive",
    phone: "0432 111 888",
    email: "david.mensah@careaxis.au",
    ndisScreening: { number: "NSW-2022-000123", expiryDate: daysFromNow(-120) }, // expired
    wwcCheck: { number: "WWC-4433221-E", expiryDate: daysFromNow(-60) }, // expired
    firstAid: { provider: "Red Cross", expiryDate: daysFromNow(-200) }, // expired
    policeCheck: { date: "2021-08-15", expiryDate: daysFromNow(-180) }, // expired
  },
  {
    id: "s7",
    firstName: "Fatima",
    lastName: "Al-Hassan",
    role: "Admin",
    employmentType: "Part-time",
    status: "Active",
    phone: "0477 444 555",
    email: "fatima.alhassan@careaxis.au",
    ndisScreening: { number: "NSW-2024-008890", expiryDate: daysFromNow(600) },
    wwcCheck: { number: "WWC-5566778-F", expiryDate: daysFromNow(550) },
    firstAid: { provider: "N/A – Admin Only", expiryDate: "" },
    policeCheck: { date: "2024-05-10", expiryDate: daysFromNow(1000) },
  },
];

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type SortField = "name" | "role" | "compliance" | "status";
type SortDir = "asc" | "desc";

const STATUS_COLORS: Record<StaffStatus, string> = {
  Active:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
  Inactive:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  "On Leave":
    "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
};

const EMPLOYMENT_COLORS: Record<EmploymentType, string> = {
  "Full-time": "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400",
  "Part-time": "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
  Casual: "bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400",
  Contractor: "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
};

// ---------------------------------------------------------------------------
// Compliance score ring
// ---------------------------------------------------------------------------

function ComplianceRing({ score }: { score: number }) {
  const color =
    score === 100
      ? "text-emerald-500"
      : score >= 75
      ? "text-indigo-500"
      : score >= 50
      ? "text-amber-500"
      : "text-red-500";

  const bg =
    score === 100
      ? "bg-emerald-50 dark:bg-emerald-900/20"
      : score >= 75
      ? "bg-indigo-50 dark:bg-indigo-900/20"
      : score >= 50
      ? "bg-amber-50 dark:bg-amber-900/20"
      : "bg-red-50 dark:bg-red-900/20";

  return (
    <div
      className={cn(
        "flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-full font-bold text-sm",
        bg,
        color
      )}
    >
      {score}%
    </div>
  );
}

// ---------------------------------------------------------------------------
// Staff detail panel (slide-in drawer)
// ---------------------------------------------------------------------------

interface StaffDrawerProps {
  staff: StaffMember;
  onClose: () => void;
}

function StaffDrawer({ staff, onClose }: StaffDrawerProps) {
  const compliance = getOverallComplianceScore(staff);

  const credentials = [
    {
      label: "NDIS Worker Screening",
      value: staff.ndisScreening.number,
      expiryDate: staff.ndisScreening.expiryDate,
    },
    {
      label: "Working with Children",
      value: staff.wwcCheck.number,
      expiryDate: staff.wwcCheck.expiryDate,
    },
    {
      label: "First Aid Certificate",
      value: staff.firstAid.provider,
      expiryDate: staff.firstAid.expiryDate,
    },
    {
      label: "Police Check",
      value: `Issued ${staff.policeCheck.date}`,
      expiryDate: staff.policeCheck.expiryDate,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl dark:bg-slate-900 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Staff Profile
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 p-6">
          {/* Identity */}
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-xl font-bold text-white">
              {staff.firstName[0]}{staff.lastName[0]}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {staff.firstName} {staff.lastName}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {staff.role} &middot;{" "}
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                    STATUS_COLORS[staff.status]
                  )}
                >
                  {staff.status}
                </span>
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                {staff.employmentType}
              </p>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Contact
            </h4>
            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <Phone className="h-4 w-4 shrink-0 text-slate-400" />
              {staff.phone}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <Mail className="h-4 w-4 shrink-0 text-slate-400" />
              {staff.email}
            </div>
          </div>

          {/* Compliance score */}
          <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Compliance Score
                </h4>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Based on 4 credential checks
                </p>
              </div>
              <ComplianceRing score={compliance} />
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  compliance === 100
                    ? "bg-emerald-500"
                    : compliance >= 75
                    ? "bg-indigo-500"
                    : compliance >= 50
                    ? "bg-amber-500"
                    : "bg-red-500"
                )}
                style={{ width: `${compliance}%` }}
              />
            </div>
          </div>

          {/* Credentials */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Credentials &amp; Compliance
            </h4>
            {credentials.map((cred) => (
              <div
                key={cred.label}
                className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {cred.label}
                  </p>
                </div>
                <CredentialBadge
                  label={cred.label}
                  value={cred.value}
                  expiryDate={cred.expiryDate}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-slate-200 p-4 dark:border-slate-800 flex gap-2">
          <Button variant="outline" className="flex-1 gap-2">
            <Edit className="h-4 w-4" />
            Edit Profile
          </Button>
          <Button variant="destructive" size="icon" className="shrink-0">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add / Edit staff modal
// ---------------------------------------------------------------------------

interface AddStaffModalProps {
  onClose: () => void;
  onAdd: (staff: StaffMember) => void;
}

const ROLES: StaffRole[] = ["Support Worker", "Team Leader", "Coordinator", "Admin"];
const EMP_TYPES: EmploymentType[] = ["Full-time", "Part-time", "Casual", "Contractor"];

function AddStaffModal({ onClose, onAdd }: AddStaffModalProps) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    role: "Support Worker" as StaffRole,
    employmentType: "Full-time" as EmploymentType,
    phone: "",
    email: "",
    ndisNumber: "",
    ndisExpiry: "",
    wwcNumber: "",
    wwcExpiry: "",
    firstAidProvider: "",
    firstAidExpiry: "",
    policeCheckDate: "",
    policeCheckExpiry: "",
  });

  const set = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newStaff: StaffMember = {
      id: `s-${Date.now()}`,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      role: form.role,
      employmentType: form.employmentType,
      status: "Active",
      phone: form.phone.trim(),
      email: form.email.trim(),
      ndisScreening: { number: form.ndisNumber, expiryDate: form.ndisExpiry },
      wwcCheck: { number: form.wwcNumber, expiryDate: form.wwcExpiry },
      firstAid: { provider: form.firstAidProvider, expiryDate: form.firstAidExpiry },
      policeCheck: { date: form.policeCheckDate, expiryDate: form.policeCheckExpiry },
    };
    onAdd(newStaff);
    onClose();
  };

  const field = (
    label: string,
    key: string,
    type: string = "text",
    placeholder = ""
  ) => (
    <div>
      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
        {label}
      </label>
      <Input
        type={type}
        value={(form as Record<string, string>)[key]}
        onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Add Staff Member
          </h2>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {/* Basic info */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-3">
              Basic Information
            </p>
            <div className="grid grid-cols-2 gap-3">
              {field("First Name", "firstName", "text", "e.g. Amara")}
              {field("Last Name", "lastName", "text", "e.g. Osei")}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => set("role", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                >
                  {ROLES.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Employment Type</label>
                <select
                  value={form.employmentType}
                  onChange={(e) => set("employmentType", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                >
                  {EMP_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              {field("Phone", "phone", "tel", "0412 345 678")}
              {field("Email", "email", "email", "name@example.com")}
            </div>
          </div>

          {/* Credentials */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-3">
              Credentials &amp; Compliance
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {field("NDIS Screening Number", "ndisNumber", "text", "NSW-2024-xxxxxx")}
                {field("NDIS Expiry Date", "ndisExpiry", "date")}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {field("WWC Check Number", "wwcNumber", "text", "WWC-xxxxxxx-A")}
                {field("WWC Expiry Date", "wwcExpiry", "date")}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {field("First Aid Provider", "firstAidProvider", "text", "St John Ambulance")}
                {field("First Aid Expiry", "firstAidExpiry", "date")}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {field("Police Check Date", "policeCheckDate", "date")}
                {field("Police Check Expiry", "policeCheckExpiry", "date")}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gradient"
              className="flex-1"
              disabled={!form.firstName || !form.lastName || !form.email}
            >
              Add Staff Member
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function StaffManagementPage() {
  const [staff, setStaff] = useState<StaffMember[]>(SEED_STAFF);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<StaffRole | "All">("All");
  const [statusFilter, setStatusFilter] = useState<StaffStatus | "All">("All");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [complianceAlertFilter, setComplianceAlertFilter] = useState(false);

  // Derived stats
  const stats = useMemo(() => {
    const active = staff.filter((s) => s.status === "Active").length;
    const expiringSoon = staff.filter((s) => {
      const statuses = [
        getCredentialStatus(s.ndisScreening.expiryDate),
        getCredentialStatus(s.wwcCheck.expiryDate),
        getCredentialStatus(s.firstAid.expiryDate),
        getCredentialStatus(s.policeCheck.expiryDate),
      ];
      return statuses.includes("expiring");
    }).length;
    const nonCompliant = staff.filter((s) => getOverallComplianceScore(s) < 100).length;
    const fullCompliance = staff.filter((s) => getOverallComplianceScore(s) === 100).length;
    return { total: staff.length, active, expiringSoon, nonCompliant, fullCompliance };
  }, [staff]);

  // Filtered + sorted
  const filtered = useMemo(() => {
    let list = [...staff];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.firstName.toLowerCase().includes(q) ||
          s.lastName.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.role.toLowerCase().includes(q)
      );
    }
    if (roleFilter !== "All") list = list.filter((s) => s.role === roleFilter);
    if (statusFilter !== "All") list = list.filter((s) => s.status === statusFilter);
    if (complianceAlertFilter) {
      list = list.filter((s) => getOverallComplianceScore(s) < 100);
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "name")
        cmp = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      else if (sortField === "role") cmp = a.role.localeCompare(b.role);
      else if (sortField === "status") cmp = a.status.localeCompare(b.status);
      else if (sortField === "compliance")
        cmp = getOverallComplianceScore(a) - getOverallComplianceScore(b);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [staff, search, roleFilter, statusFilter, sortField, sortDir, complianceAlertFilter]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field)
      return <ChevronDown className="h-3 w-3 opacity-30" />;
    return sortDir === "asc" ? (
      <ChevronUp className="h-3 w-3" />
    ) : (
      <ChevronDown className="h-3 w-3" />
    );
  }

  // Export CSV (simplified)
  function exportCSV() {
    const rows = [
      ["Name", "Role", "Employment", "Status", "Email", "Phone", "Compliance %"],
      ...staff.map((s) => [
        `${s.firstName} ${s.lastName}`,
        s.role,
        s.employmentType,
        s.status,
        s.email,
        s.phone,
        String(getOverallComplianceScore(s)),
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `careaxis-staff-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <Header title="Staff Management" />

      <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
        {/* ── Summary Stats ── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            {
              label: "Total Staff",
              value: stats.total,
              icon: Users,
              bg: "bg-indigo-50 dark:bg-indigo-900/20",
              color: "text-indigo-600 dark:text-indigo-400",
            },
            {
              label: "Active",
              value: stats.active,
              icon: UserCheck,
              bg: "bg-emerald-50 dark:bg-emerald-900/20",
              color: "text-emerald-600 dark:text-emerald-400",
            },
            {
              label: "Expiring Soon",
              value: stats.expiringSoon,
              icon: Clock,
              bg: "bg-amber-50 dark:bg-amber-900/20",
              color: "text-amber-600 dark:text-amber-400",
            },
            {
              label: "Non-Compliant",
              value: stats.nonCompliant,
              icon: AlertTriangle,
              bg: "bg-red-50 dark:bg-red-900/20",
              color: "text-red-600 dark:text-red-400",
            },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <Card
                key={s.label}
                className="border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                      s.bg
                    )}
                  >
                    <Icon className={cn("h-5 w-5", s.color)} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {s.value}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* ── Compliance Alert Banner ── */}
        {stats.nonCompliant > 0 && (
          <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 px-5 py-3 dark:bg-amber-900/10 dark:border-amber-900/30">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <strong>{stats.nonCompliant} staff member{stats.nonCompliant !== 1 ? "s" : ""}</strong> have expired or expiring credentials.{" "}
              <button
                className="underline underline-offset-2 font-medium hover:no-underline"
                onClick={() => setComplianceAlertFilter(!complianceAlertFilter)}
              >
                {complianceAlertFilter ? "Clear filter" : "View non-compliant"}
              </button>
            </p>
          </div>
        )}

        {/* ── Controls ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search staff..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-60"
              />
            </div>

            {/* Role filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as StaffRole | "All")}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="All">All Roles</option>
              {ROLES.map((r) => <option key={r}>{r}</option>)}
            </select>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StaffStatus | "All")}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="All">All Statuses</option>
              <option>Active</option>
              <option>Inactive</option>
              <option>On Leave</option>
            </select>

            {complianceAlertFilter && (
              <span className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                <Filter className="h-3 w-3" />
                Non-compliant only
                <button onClick={() => setComplianceAlertFilter(false)}>
                  <X className="h-3 w-3 ml-1" />
                </button>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button
              size="sm"
              variant="gradient"
              onClick={() => setShowAddModal(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Staff
            </Button>
          </div>
        </div>

        {/* ── Staff Table ── */}
        <Card className="border border-slate-200 bg-white p-0 dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Users className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No staff found matching your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-5 py-3 text-left">
                      <button
                        onClick={() => toggleSort("name")}
                        className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        Name <SortIcon field="name" />
                      </button>
                    </th>
                    <th className="px-5 py-3 text-left">
                      <button
                        onClick={() => toggleSort("role")}
                        className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        Role <SortIcon field="role" />
                      </button>
                    </th>
                    <th className="hidden md:table-cell px-5 py-3 text-left">
                      <button
                        onClick={() => toggleSort("status")}
                        className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        Status <SortIcon field="status" />
                      </button>
                    </th>
                    <th className="hidden lg:table-cell px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      NDIS Screening
                    </th>
                    <th className="hidden lg:table-cell px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      WWC / First Aid
                    </th>
                    <th className="px-5 py-3 text-left">
                      <button
                        onClick={() => toggleSort("compliance")}
                        className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        Compliance <SortIcon field="compliance" />
                      </button>
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.map((s) => {
                    const score = getOverallComplianceScore(s);
                    return (
                      <tr
                        key={s.id}
                        className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        {/* Name */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-xs font-bold text-white">
                              {s.firstName[0]}{s.lastName[0]}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white">
                                {s.firstName} {s.lastName}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {s.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            <p className="text-slate-900 dark:text-white">{s.role}</p>
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                                EMPLOYMENT_COLORS[s.employmentType]
                              )}
                            >
                              {s.employmentType}
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="hidden md:table-cell px-5 py-4">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                              STATUS_COLORS[s.status]
                            )}
                          >
                            {s.status}
                          </span>
                        </td>

                        {/* NDIS */}
                        <td className="hidden lg:table-cell px-5 py-4">
                          <CredentialBadge
                            label="NDIS"
                            value={s.ndisScreening.number}
                            expiryDate={s.ndisScreening.expiryDate}
                          />
                        </td>

                        {/* WWC / First Aid */}
                        <td className="hidden lg:table-cell px-5 py-4">
                          <div className="space-y-2">
                            <CredentialBadge
                              label="WWC"
                              value={s.wwcCheck.number}
                              expiryDate={s.wwcCheck.expiryDate}
                            />
                            <CredentialBadge
                              label="First Aid"
                              value={s.firstAid.provider}
                              expiryDate={s.firstAid.expiryDate}
                            />
                          </div>
                        </td>

                        {/* Compliance */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <ComplianceRing score={score} />
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setSelectedStaff(s)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-700 dark:hover:text-indigo-400"
                              title="View profile"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Results count */}
        <p className="text-center text-xs text-slate-400 dark:text-slate-600">
          Showing {filtered.length} of {staff.length} staff members
        </p>
      </div>

      {/* Drawers & Modals */}
      {selectedStaff && (
        <StaffDrawer
          staff={selectedStaff}
          onClose={() => setSelectedStaff(null)}
        />
      )}
      {showAddModal && (
        <AddStaffModal
          onClose={() => setShowAddModal(false)}
          onAdd={(s) => setStaff((prev) => [s, ...prev])}
        />
      )}
    </div>
  );
}

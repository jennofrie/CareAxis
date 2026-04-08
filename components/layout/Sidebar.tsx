"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  StickyNote,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  FileCheck,
  Calendar,
  Users,
  Scale,
  BadgeDollarSign,
  Bot,
  FileOutput,
  Brain,
  PenTool,
  Contact,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";

const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, superAdminOnly: false },
  { title: "Participants", href: "/participants", icon: Contact, superAdminOnly: false },
  { title: "Report Synthesizer", href: "/report-synthesizer", icon: FileText, superAdminOnly: false },
  { title: "CoC Cover Letter", href: "/coc-cover-letter", icon: FileOutput, superAdminOnly: false },
  { title: "Visual Case Notes", href: "/visual-case-notes", icon: StickyNote, superAdminOnly: false },
  { title: "Budget Forecaster", href: "/budget-forecaster", icon: TrendingUp, superAdminOnly: false },
  { title: "Weekly Summary", href: "/weekly-summary", icon: Calendar, superAdminOnly: false },
  { title: "Roster Analyzer", href: "/roster-analyzer", icon: Users, superAdminOnly: false },
  { title: "Justification Drafter", href: "/justification-drafter", icon: FileCheck, superAdminOnly: false },
  { title: "Senior Planner", href: "/senior-planner", icon: Scale, superAdminOnly: false },
  { title: "Plan Management", href: "/plan-management-expert", icon: BadgeDollarSign, superAdminOnly: false },
  { title: "QuantumSign", href: "/dashboard/quantum-sign", icon: PenTool, superAdminOnly: false },
  { title: "RAG Agent", href: "/rag-agent", icon: Bot, superAdminOnly: true },
  { title: "Settings", href: "/settings", icon: Settings, superAdminOnly: false },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const permissions = usePermissions();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
  };

  return (
    <aside
      className={cn(
        "h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 shrink-0",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo / Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-slate-900 dark:text-white">CareAxis</span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems
          .filter((item) => !item.superAdminOnly || permissions.isSuperAdmin)
          .map((item) => {
            const isActive =
            item.href === "/dashboard"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200",
                  collapsed && "justify-center px-2"
                )}
                title={collapsed ? item.title : undefined}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!collapsed && (
                  <span className="flex items-center gap-2 truncate">
                    {item.title}
                    {item.superAdminOnly && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                        Admin
                      </span>
                    )}
                  </span>
                )}
              </Link>
            );
          })}
      </nav>

      {/* Sign Out */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={handleSignOut}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
            "text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}

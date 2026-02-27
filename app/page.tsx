"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import {
  Shield,
  Cpu,
  FileCheck,
  Zap,
  Brain,
  FileText,
  BarChart3,
  Users,
  ClipboardCheck,
  Target,
  TrendingUp,
  BookOpen,
  ArrowRight,
  Sparkles,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Scroll-reveal hook                                                 */
/* ------------------------------------------------------------------ */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const children = el.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    children.forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, []);

  return ref;
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */
const highlights = [
  {
    icon: Shield,
    title: "Section 34 Compliance",
    description:
      "Every output is engineered to meet NDIS Section 34 reasonable-and-necessary criteria out of the box.",
  },
  {
    icon: Cpu,
    title: "Production-Grade AI",
    description:
      "Powered by advanced language models fine-tuned for disability-sector terminology and workflows.",
  },
  {
    icon: FileCheck,
    title: "Audit-Ready Documentation",
    description:
      "Generate plans, reports, and notes that withstand NDIA audit scrutiny with zero rework.",
  },
  {
    icon: Zap,
    title: "Lightning-Fast Results",
    description:
      "Cut documentation time by 90%. What used to take hours now takes seconds with guided AI prompts.",
  },
];

const premiumFeatures = [
  {
    icon: Brain,
    title: "CareAxis AI Chat",
    description:
      "Conversational AI assistant trained on NDIS legislation, pricing guides, and best-practice frameworks.",
  },
  {
    icon: FileText,
    title: "Report Generator",
    description:
      "Produce comprehensive participant reports with structured findings, goals, and recommendations.",
  },
  {
    icon: BarChart3,
    title: "Budget Forecaster",
    description:
      "AI-powered budget projections aligned to plan categories, support items, and utilisation history.",
  },
  {
    icon: Users,
    title: "Participant Profiler",
    description:
      "Build rich participant profiles from intake data, assessments, and historical service records.",
  },
  {
    icon: ClipboardCheck,
    title: "Compliance Auditor",
    description:
      "Automated compliance checks against NDIS Practice Standards and Section 34 requirements.",
  },
  {
    icon: Target,
    title: "Goal Architect",
    description:
      "Transform vague aspirations into measurable, SMART-aligned NDIS goals with clear milestones.",
  },
  {
    icon: TrendingUp,
    title: "Progress Tracker",
    description:
      "Track participant outcomes against plan goals with visual dashboards and trend analysis.",
  },
  {
    icon: BookOpen,
    title: "Session Note Writer",
    description:
      "Generate structured, compliant session notes from brief dot points or voice memos.",
  },
  {
    icon: Sparkles,
    title: "Plan Synthesiser",
    description:
      "Synthesise complex multi-source data into coherent plan review summaries and proposals.",
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function LandingPage() {
  const containerRef = useScrollReveal();

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50"
    >
      {/* ==================  NAV  ================================== */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">CareAxis</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/auth"
              className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-shadow"
            >
              Staff Login
            </Link>
          </div>
        </div>
      </nav>

      {/* ==================  HERO  ================================= */}
      <section className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute top-20 right-0 h-[400px] w-[400px] rounded-full bg-purple-500/10 blur-3xl" />
        </div>

        <div className="mx-auto max-w-5xl px-6 pb-24 pt-20 text-center md:pt-32 md:pb-32">
          <div className="reveal">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 px-4 py-1.5 text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-8">
              <Shield className="h-4 w-4" />
              CDSSVIC Internal Platform
            </span>
          </div>

          <h1 className="reveal text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Clarity
            </span>{" "}
            in Coordination
          </h1>

          <p className="reveal mx-auto mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-400 sm:text-xl">
            The AI-powered documentation toolkit built for CDSSVIC staff.
            Generate compliant NDIS documentation, audit plans, forecast
            budgets, and synthesise complex reports — securely within your
            organisation.
          </p>

          <div className="reveal mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all"
            >
              Staff Portal →
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-7 py-3.5 text-base font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-600 transition-colors"
            >
              Learn More
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="reveal mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-500" />
              Section 34
            </span>
            <span className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-500" />
              10x Faster
            </span>
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-500" />
              Invite Only
            </span>
          </div>
        </div>
      </section>

      {/* ==================  WHAT IS CAREAXIS  ===================== */}
      <section
        id="about"
        className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 py-24"
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="reveal mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              What is{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                CareAxis
              </span>
              ?
            </h2>
            <p className="mt-4 text-slate-600 dark:text-slate-400">
              CareAxis is an AI-powered professional toolkit purpose-built for
              NDIS coordinators, plan managers, and support workers who need
              compliant, high-quality documentation — fast.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {highlights.map((item) => (
              <div
                key={item.title}
                className="reveal bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 hover:shadow-md transition-shadow"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/50">
                  <item.icon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================  PREMIUM FEATURES  ===================== */}
      <section
        id="features"
        className="border-t border-slate-200 dark:border-slate-800 py-24"
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="reveal mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Complete AI Toolkit
            </h2>
            <p className="mt-4 text-slate-600 dark:text-slate-400">
              Nine purpose-built AI tools covering every aspect of NDIS
              professional documentation and analysis.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {premiumFeatures.map((feat) => (
              <div
                key={feat.title}
                className="reveal bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 hover:shadow-md transition-shadow"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/50">
                  <feat.icon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold">{feat.title}</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {feat.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================  BOTTOM CTA  =========================== */}
      <section className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 py-24">
        <div className="reveal mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Exclusive Access for CDSSVIC Staff
          </h2>
          <p className="mt-4 text-slate-600 dark:text-slate-400">
            CareAxis is exclusively available to authorised CDSSVIC staff.
            Contact your administrator to request access.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-all"
            >
              Staff Login
            </Link>
          </div>
        </div>
      </section>

      {/* ==================  FOOTER  =============================== */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 py-10">
        <div className="mx-auto max-w-7xl px-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-indigo-600 to-purple-600">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold">CareAxis</span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            &copy; 2026 CareAxis. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

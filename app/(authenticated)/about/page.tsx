"use client";

import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Sparkles,
  FileText,
  Brain,
  ShieldCheck,
  BarChart3,
  MessageSquare,
  ExternalLink,
  Zap,
} from "lucide-react";

const FEATURES = [
  {
    icon: FileText,
    title: "Visual Case Notes",
    description:
      "Generate structured, NDIS-compliant case notes with AI-powered analysis and formatting.",
  },
  {
    icon: Brain,
    title: "Report Synthesizer",
    description:
      "Synthesize complex reports from multiple sources into clear, actionable summaries.",
  },
  {
    icon: Zap,
    title: "Justification Drafter",
    description:
      "Create 11-section structured justification letters for NDIS funding requests.",
  },
  {
    icon: BarChart3,
    title: "Budget Forecaster",
    description:
      "Forecast NDIS plan spending with AI-powered projections and budget analysis.",
  },
  {
    icon: MessageSquare,
    title: "Senior Planner",
    description:
      "AI-assisted planning for complex participant scenarios and support coordination.",
  },
  {
    icon: ShieldCheck,
    title: "Compliance Tools",
    description:
      "Built-in NDIS compliance checking and audit-ready documentation generation.",
  },
];

export default function AboutPage() {
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0";

  return (
    <>
      <Header title="About CareAxis" />
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Hero */}
          <Card className="text-center py-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/25">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              CareAxis
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              AI-Powered NDIS Practice Management
            </p>
            <Badge variant="info">Version {appVersion}</Badge>
          </Card>

          {/* What is CareAxis */}
          <Card>
            <CardHeader>
              <CardTitle>What is CareAxis?</CardTitle>
            </CardHeader>
            <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              <p>
                CareAxis is an AI-powered platform designed specifically for NDIS
                (National Disability Insurance Scheme) practitioners and support
                coordinators. It streamlines documentation, compliance, and plan
                management workflows with intelligent automation.
              </p>
              <p>
                Built for the Australian disability services sector, CareAxis
                combines cutting-edge AI with deep domain expertise to help
                practitioners deliver better outcomes for participants while
                reducing administrative burden.
              </p>
              <p>
                From generating compliant case notes to drafting justification
                letters and forecasting budgets, CareAxis handles the paperwork so
                you can focus on what matters most -- supporting your participants.
              </p>
            </div>
          </Card>

          {/* Feature Highlights */}
          <Card>
            <CardHeader>
              <CardTitle>Feature Highlights</CardTitle>
              <CardDescription>
                Tools designed for NDIS practitioners and support coordinators.
              </CardDescription>
            </CardHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                >
                  <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center shrink-0">
                    <feature.icon className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {feature.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* NDIS Compliance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                NDIS Compliance
              </CardTitle>
            </CardHeader>
            <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              <p>
                CareAxis is built with NDIS compliance at its core. All AI-generated
                content follows NDIS Practice Standards and is aligned with the NDIS
                Quality and Safeguards Commission requirements.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  Case notes follow NDIS documentation standards
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  Justification letters are structured per NDIA guidelines
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  Budget forecasting uses official NDIS price guide rates
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  Data is encrypted and stored securely in compliance with privacy law
                </li>
              </ul>
            </div>
          </Card>

          {/* Footer Links */}
          <Card className="text-center py-6">
            <a
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              Visit our landing page
              <ExternalLink className="w-4 h-4" />
            </a>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
              CareAxis v{appVersion} -- Built with care for NDIS practitioners.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}

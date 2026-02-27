"use client";

import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Play,
  FileText,
  Brain,
  BarChart3,
  Zap,
  ArrowRight,
} from "lucide-react";

const DEMO_HIGHLIGHTS = [
  {
    icon: FileText,
    title: "Case Note Generation",
    description: "See how AI transforms session observations into structured, compliant case notes in seconds.",
  },
  {
    icon: Brain,
    title: "Report Synthesis",
    description: "Watch the AI synthesize complex multi-source reports into clear, actionable summaries.",
  },
  {
    icon: Zap,
    title: "Justification Drafting",
    description: "Learn how to generate 11-section justification letters with clinical reasoning and evidence.",
  },
  {
    icon: BarChart3,
    title: "Budget Forecasting",
    description: "Discover how CareAxis projects NDIS plan spending and identifies potential overspending.",
  },
];

export default function WatchDemoPage() {
  return (
    <>
      <Header title="Watch Demo" />
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Video Player */}
          <Card className="p-0 overflow-hidden">
            <div className="relative aspect-video bg-slate-900 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/50 to-purple-900/50" />
              <div className="relative z-10 text-center">
                <button className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mx-auto mb-4 hover:bg-white/20 transition-all duration-300 hover:scale-105 group">
                  <Play className="w-8 h-8 text-white ml-1 group-hover:scale-110 transition-transform" />
                </button>
                <h3 className="text-lg font-semibold text-white mb-1">
                  CareAxis Platform Demo
                </h3>
                <p className="text-sm text-slate-300">
                  See how CareAxis transforms NDIS practice management
                </p>
              </div>
            </div>
          </Card>

          {/* Demo Description */}
          <Card>
            <CardHeader>
              <CardTitle>What You Will See</CardTitle>
              <CardDescription>
                A walkthrough of CareAxis&apos;s core features and how they streamline
                your NDIS workflows.
              </CardDescription>
            </CardHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DEMO_HIGHLIGHTS.map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                >
                  <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center shrink-0">
                    <item.icon className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* CTA */}
          <Card className="text-center py-10 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/10 dark:to-purple-900/10 border-indigo-200 dark:border-indigo-800/30">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Ready to get started?
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
              Start your free trial today and experience how CareAxis can transform
              your NDIS practice management workflow.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="gradient"
                size="lg"
                onClick={() => (window.location.href = "/auth")}
              >
                Start Free Trial
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => (window.location.href = "/auth")}
              >
                Sign In
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

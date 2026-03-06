import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/Button";
import { UploadCloud, FileSignature, Clock, CheckCircle2, FileText, ChevronRight } from "lucide-react";

interface StartDashboardProps {
    onCreateRequest: () => void;
    actionRequired: number;
    waitingOnOthers: number;
    completed: number;
}

export function StartDashboard({ onCreateRequest, actionRequired, waitingOnOthers, completed }: StartDashboardProps) {
    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 translate-x-1/3 -translate-y-1/3 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <h2 className="text-3xl font-display font-bold">Good morning, Planner!</h2>
                        <p className="text-slate-300 text-lg">Here&apos;s what needs your attention today.</p>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 min-w-[140px] border border-white/10 hover:bg-white/15 transition-colors cursor-pointer group">
                            <div className="flex items-center gap-2 text-blue-200 mb-1">
                                <FileSignature className="w-4 h-4" />
                                <span className="text-sm font-medium">Action Required</span>
                            </div>
                            <p className="text-3xl font-bold group-hover:scale-105 transition-transform origin-left">{actionRequired}</p>
                        </div>

                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 min-w-[140px] border border-white/10 hover:bg-white/15 transition-colors cursor-pointer group">
                            <div className="flex items-center gap-2 text-yellow-200 mb-1">
                                <Clock className="w-4 h-4" />
                                <span className="text-sm font-medium">Waiting on Others</span>
                            </div>
                            <p className="text-3xl font-bold group-hover:scale-105 transition-transform origin-left">{waitingOnOthers}</p>
                        </div>

                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 min-w-[140px] border border-white/10 hover:bg-white/15 transition-colors cursor-pointer group">
                            <div className="flex items-center gap-2 text-green-200 mb-1">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="text-sm font-medium">Completed</span>
                            </div>
                            <p className="text-3xl font-bold group-hover:scale-105 transition-transform origin-left">{completed}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <GlassCard className="h-full min-h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group p-8">
                        <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <UploadCloud className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Drag & drop a document here</h3>
                        <p className="text-muted-foreground mb-6 text-center max-w-sm">
                            Upload a PDF, Word, or image file to add fields and send for signature.
                        </p>
                        <div className="flex gap-4">
                            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25" onClick={onCreateRequest}>
                                Browse Files
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-6">
                            Supported formats: PDF, DOCX, PNG, JPG (Max 25MB)
                        </p>
                    </GlassCard>
                </div>

                <div>
                    <GlassCard className="h-full p-6 flex flex-col">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                                <FileText className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-bold">Quick Start from Template</h3>
                        </div>

                        <p className="text-sm text-muted-foreground mb-6">
                            Select one of your saved templates to quickly generate and send a new document.
                        </p>

                        <div className="space-y-3 flex-grow">
                            <button className="w-full text-left p-4 rounded-xl border bg-card hover:border-purple-500/50 hover:shadow-md transition-all flex items-center justify-between group">
                                <div className="truncate pr-4">
                                    <p className="font-medium text-sm text-foreground truncate">NDIS Service Agreement</p>
                                    <p className="text-xs text-muted-foreground">Used 14 times</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-purple-500 transform group-hover:translate-x-1 transition-all" />
                            </button>

                            <button className="w-full text-left p-4 rounded-xl border bg-card hover:border-purple-500/50 hover:shadow-md transition-all flex items-center justify-between group">
                                <div className="truncate pr-4">
                                    <p className="font-medium text-sm text-foreground truncate">Consent to Share Info</p>
                                    <p className="text-xs text-muted-foreground">Used 8 times</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-purple-500 transform group-hover:translate-x-1 transition-all" />
                            </button>

                            <button className="w-full text-left p-4 rounded-xl border bg-card hover:border-purple-500/50 hover:shadow-md transition-all flex items-center justify-between group">
                                <div className="truncate pr-4">
                                    <p className="font-medium text-sm text-foreground truncate">Incident Report Form</p>
                                    <p className="text-xs text-muted-foreground">Used 3 times</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-purple-500 transform group-hover:translate-x-1 transition-all" />
                            </button>
                        </div>

                        <Button variant="ghost" className="w-full mt-4 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300">
                            View All Templates
                        </Button>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}

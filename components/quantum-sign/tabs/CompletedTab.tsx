import { GlassCard } from "@/components/GlassCard";
import { SignatureRequestList } from "@/components/quantum-sign/SignatureRequestList";
import { SignatureRequest } from "@/hooks/useSignatureRequests";
import { CheckCircle2 } from "lucide-react";

interface CompletedTabProps {
    requests: SignatureRequest[];
    onViewDetails: (request: SignatureRequest) => void;
}

export function CompletedTab({ requests, onViewDetails }: CompletedTabProps) {
    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-slate-900 via-emerald-900/60 to-slate-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 translate-x-1/3 -translate-y-1/3 w-64 h-64 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <h2 className="text-3xl font-display font-bold">Completed</h2>
                        <p className="text-slate-300 text-lg">Fully executed and signed documents.</p>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 min-w-[140px] border border-white/10">
                            <div className="flex items-center gap-2 text-green-200 mb-1">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="text-sm font-medium">Signed</span>
                            </div>
                            <p className="text-3xl font-bold">{requests.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            <GlassCard className="p-0 overflow-hidden border-t-4 border-t-green-500">
                <div className="p-6 border-b bg-muted/20">
                    <h2 className="text-xl font-bold">Document Archive</h2>
                </div>
                <SignatureRequestList requests={requests} onViewDetails={onViewDetails} />
            </GlassCard>
        </div>
    );
}

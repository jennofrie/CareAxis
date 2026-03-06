import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Upload, FileText } from "lucide-react";

export function MyTemplatesTab() {
    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-slate-900 via-purple-900/60 to-slate-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 translate-x-1/3 -translate-y-1/3 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <h2 className="text-3xl font-display font-bold">My Templates</h2>
                        <p className="text-slate-300 text-lg">Manage your reusable document templates.</p>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/25">
                            <Upload className="w-4 h-4 mr-2" />
                            Upload New Template
                        </Button>
                    </div>
                </div>
            </div>

            <GlassCard className="p-0 overflow-hidden border-t-4 border-t-purple-500">
                <div className="p-6 border-b bg-muted/20">
                    <h2 className="text-xl font-bold">Template Library</h2>
                </div>
                <div className="text-center py-16 text-muted-foreground">
                    <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                    </div>
                    <p className="text-lg font-medium text-foreground mb-2">No templates yet</p>
                    <p className="max-w-sm mx-auto">Upload your frequently used forms (like NDIS Service Agreements) to send them faster next time.</p>
                </div>
            </GlassCard>
        </div>
    );
}

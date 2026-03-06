'use client';

import { useState, useEffect } from "react";
import { PenTool, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StartDashboard } from "@/components/quantum-sign/tabs/StartDashboard";
import { InboxTab } from "@/components/quantum-sign/tabs/InboxTab";
import { SentTab } from "@/components/quantum-sign/tabs/SentTab";
import { CompletedTab } from "@/components/quantum-sign/tabs/CompletedTab";
import { MyTemplatesTab } from "@/components/quantum-sign/tabs/MyTemplatesTab";
import { useSignatureRequests, SignatureRequest } from "@/hooks/useSignatureRequests";
import { createClient } from "@/lib/supabase/client";
import { RequestDetailModal } from "@/components/quantum-sign/RequestDetailModal";
import { CreateRequestModal } from "@/components/quantum-sign/CreateRequestModal";

export default function QuantumSign() {
  const [activeTab, setActiveTab] = useState("start");
  const { data: requests, isLoading } = useSignatureRequests();
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<SignatureRequest | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setCurrentUserEmail(session.user.email);
      }
    });
  }, []);

  const handleViewDetails = (request: SignatureRequest) => {
    setSelectedRequest(request);
    setDetailModalOpen(true);
  };

  const safeRequests = requests || [];

  const inboxRequests = safeRequests.filter(
    (r) =>
      r.recipient_email === currentUserEmail &&
      (r.status === 'PENDING' || r.status === 'VIEWED')
  );

  const sentRequests = safeRequests.filter(
    (r) =>
      r.sender_email === currentUserEmail &&
      (r.status === 'PENDING' || r.status === 'VIEWED')
  );

  const completedRequests = safeRequests.filter((r) => r.status === 'SIGNED');

  return (
    <main className="flex-1 overflow-auto">
      <div className="relative bg-gradient-to-br from-purple-900/40 via-background to-background border-b border-border overflow-hidden">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>
        <div className="absolute top-0 right-0 p-12 opacity-20 pointer-events-none">
          <PenTool className="w-64 h-64 text-purple-500/20 blur-3xl" />
        </div>

        <div className="relative z-10 p-8 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-purple-500/20 shadow-inner border border-purple-500/30">
                  <PenTool className="w-6 h-6 text-purple-400" />
                </div>
                <h1 className="font-display text-4xl font-bold text-foreground tracking-tight">QuantumSign</h1>
              </div>
              <p className="text-lg text-muted-foreground ml-12">Secure document signing & templates</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-8">
              <TabsTrigger value="start">Start or New</TabsTrigger>
              <TabsTrigger value="inbox">
                Inbox {inboxRequests.length > 0 && <span className="ml-2 bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full">{inboxRequests.length}</span>}
              </TabsTrigger>
              <TabsTrigger value="sent">
                Sent {sentRequests.length > 0 && <span className="ml-2 bg-yellow-500 text-white text-[10px] px-2 py-0.5 rounded-full">{sentRequests.length}</span>}
              </TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="templates">My Templates</TabsTrigger>
            </TabsList>

            <TabsContent value="start" className="mt-0">
              <StartDashboard
                onCreateRequest={() => setCreateModalOpen(true)}
                actionRequired={inboxRequests.length}
                waitingOnOthers={sentRequests.length}
                completed={completedRequests.length}
              />
            </TabsContent>

            <TabsContent value="inbox" className="mt-0">
              <InboxTab requests={inboxRequests} onViewDetails={handleViewDetails} />
            </TabsContent>

            <TabsContent value="sent" className="mt-0">
              <SentTab requests={sentRequests} onViewDetails={handleViewDetails} />
            </TabsContent>

            <TabsContent value="completed" className="mt-0">
              <CompletedTab requests={completedRequests} onViewDetails={handleViewDetails} />
            </TabsContent>

            <TabsContent value="templates" className="mt-0">
              <MyTemplatesTab />
            </TabsContent>
          </Tabs>
        )}

        <CreateRequestModal open={createModalOpen} onOpenChange={setCreateModalOpen} />
        <RequestDetailModal
          request={selectedRequest}
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
        />
      </div>
    </main>
  );
}

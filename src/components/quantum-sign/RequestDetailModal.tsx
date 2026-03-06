'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { RequestStatusBadge } from "./RequestStatusBadge";
import { SignatureRequest, useDownloadSignatureDocument } from "@/hooks/useSignatureRequests";

interface RequestDetailModalProps {
  request: SignatureRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RequestDetailModal({ request, open, onOpenChange }: RequestDetailModalProps) {
  const downloadDoc = useDownloadSignatureDocument();

  if (!request) return null;

  const handleDownload = async (type: 'original' | 'signed') => {
    const result = await downloadDoc.mutateAsync({ requestId: request.id, type });
    window.open(result.url, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle>{request.document_title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <RequestStatusBadge status={request.status} />
          </div>

          {request.document_description && (
            <div>
              <span className="text-sm text-muted-foreground">Description:</span>
              <p className="text-sm mt-1">{request.document_description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Recipient</p>
              <p className="font-medium">{request.recipient_name}</p>
              <p className="text-muted-foreground">{request.recipient_email}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="font-medium">{new Date(request.created_at).toLocaleDateString('en-AU', { dateStyle: 'medium' })}</p>
            </div>
          </div>

          {request.signed_at && (
            <div className="text-sm">
              <p className="text-muted-foreground">Signed on</p>
              <p className="font-medium">{new Date(request.signed_at).toLocaleString('en-AU')}</p>
            </div>
          )}

          {request.decline_reason && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm">
              <p className="font-medium text-destructive">Decline reason:</p>
              <p className="text-muted-foreground mt-1">{request.decline_reason}</p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => handleDownload('original')}>
              <Download className="w-4 h-4 mr-1" />
              Original PDF
            </Button>
            {request.status === 'SIGNED' && (
              <Button size="sm" onClick={() => handleDownload('signed')}>
                <Download className="w-4 h-4 mr-1" />
                Signed PDF
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

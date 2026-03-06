'use client';

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCreateSignatureRequest } from "@/hooks/useSignatureRequests";
import { useToast } from "@/hooks/use-toast";

interface CreateRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRequestModal({ open, onOpenChange }: CreateRequestModalProps) {
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentDescription, setDocumentDescription] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const createRequest = useCreateSignatureRequest();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    try {
      setUploading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { generateUUID } = await import('@/lib/uuid');
      const requestId = generateUUID();
      const filePath = `${user.id}/original/${requestId}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from("signature-documents")
        .upload(filePath, file, { contentType: "application/pdf" });

      if (uploadError) throw uploadError;

      await createRequest.mutateAsync({
        documentTitle,
        documentDescription: documentDescription || undefined,
        recipientName,
        recipientEmail,
        filePath,
      });

      toast({
        title: "Request sent",
        description: `Signature request sent to ${recipientEmail}`,
      });

      setDocumentTitle("");
      setDocumentDescription("");
      setRecipientName("");
      setRecipientEmail("");
      setFile(null);
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create request",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle>New Signature Request</DialogTitle>
          <DialogDescription>Upload a PDF and send it for signing.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="documentTitle">Document Title</Label>
            <Input
              id="documentTitle"
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              placeholder="e.g. Service Agreement"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="documentDescription">Description (optional)</Label>
            <Textarea
              id="documentDescription"
              value={documentDescription}
              onChange={(e) => setDocumentDescription(e.target.value)}
              placeholder="Brief description of the document"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="recipientName">Recipient Name</Label>
              <Input
                id="recipientName"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipientEmail">Recipient Email</Label>
              <Input
                id="recipientEmail"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="john@example.com"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pdfFile">PDF Document</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-purple-500/50 transition-colors">
              <input
                id="pdfFile"
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                required
              />
              <label htmlFor="pdfFile" className="cursor-pointer">
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {file ? file.name : "Click to upload PDF (max 10MB)"}
                </p>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploading || !file || !documentTitle || !recipientName || !recipientEmail}>
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send for Signing"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

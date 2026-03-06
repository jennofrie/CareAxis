'use client';

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PDFViewer } from "@/components/quantum-sign/PDFViewer";
import { SignaturePad, SignaturePadRef } from "@/components/quantum-sign/SignaturePad";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CareAxisLogo } from "@/components/CareAxisLogo";
import { Loader2, CheckCircle, XCircle, AlertTriangle, RotateCcw } from "lucide-react";

const PUBLIC_EDGE_FUNCTION = "quantum-sign-public";

interface SigningRequest {
  id: string;
  document_title: string;
  document_description: string | null;
  sender_name: string;
  recipient_name: string;
  recipient_email: string;
  status: string;
  token_expires_at: string;
  document_url: string;
}

interface SignaturePosition {
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}

interface SignDocumentProps {
  token: string;
}

export default function SignDocument({ token }: SignDocumentProps) {
  const signaturePadRef = useRef<SignaturePadRef>(null);

  const [request, setRequest] = useState<SigningRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [completed, setCompleted] = useState<"signed" | "declined" | null>(null);
  const [showDecline, setShowDecline] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [, setCurrentPage] = useState(0);
  const [, setTotalPages] = useState(0);

  const [signaturePosition, setSignaturePosition] = useState<SignaturePosition | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

  useEffect(() => {
    if (!token) return;

    async function fetchRequest() {
      try {
        const { data, error: fetchError } = await supabase.functions.invoke(
          PUBLIC_EDGE_FUNCTION,
          { body: { action: "get", token } }
        );

        if (fetchError) throw fetchError;
        if (data.error) throw new Error(data.error);

        setRequest(data);

        await supabase.functions.invoke(PUBLIC_EDGE_FUNCTION, {
          body: { action: "view", token },
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load signing request");
      } finally {
        setLoading(false);
      }
    }

    fetchRequest();
  }, [token]);

  const handlePageClick = (position: { x: number; y: number; page: number }) => {
    const sigWidth = 200;
    const sigHeight = 60;

    setSignaturePosition({
      x: position.x - sigWidth / 2,
      y: position.y - sigHeight / 2,
      width: sigWidth,
      height: sigHeight,
      page: position.page,
    });

    setIsSignatureModalOpen(true);
  };

  const handleSignatureComplete = (dataUrl: string) => {
    setSignatureDataUrl(dataUrl);
    setIsSignatureModalOpen(false);
  };

  const handleClearSignature = () => {
    setSignatureDataUrl(null);
    setSignaturePosition(null);
  };

  const handleSign = async () => {
    if (!signatureDataUrl || !signaturePosition) {
      alert("Please click on the document where you want to place your signature.");
      return;
    }

    try {
      setSigning(true);

      const { data, error: signError } = await supabase.functions.invoke(
        PUBLIC_EDGE_FUNCTION,
        {
          body: {
            action: "sign",
            token,
            signatureDataUrl,
            signaturePosition,
          },
        }
      );

      if (signError) throw signError;
      if (data.error) throw new Error(data.error);

      setCompleted("signed");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to sign document");
    } finally {
      setSigning(false);
    }
  };

  const handleDecline = async () => {
    try {
      setSigning(true);
      const { data, error: declineError } = await supabase.functions.invoke(
        PUBLIC_EDGE_FUNCTION,
        { body: { action: "decline", token, declineReason } }
      );

      if (declineError) throw declineError;
      if (data.error) throw new Error(data.error);

      setCompleted("declined");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to decline");
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Unable to Load Document</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          {completed === "signed" ? (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-xl font-bold mb-2">Document Signed</h1>
              <p className="text-muted-foreground">
                Your signature has been applied. {request?.sender_name} has been notified.
              </p>
            </>
          ) : (
            <>
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-xl font-bold mb-2">Signing Declined</h1>
              <p className="text-muted-foreground">
                {request?.sender_name} has been notified of your decision.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <CareAxisLogo size="sm" />
          <span className="text-sm text-muted-foreground">QuantumSign</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{request?.document_title}</h1>
          <p className="text-muted-foreground mt-1">
            Sent by <strong>{request?.sender_name}</strong> for{" "}
            <strong>{request?.recipient_name}</strong>
          </p>
          {request?.document_description && (
            <p className="text-sm text-muted-foreground mt-2">
              {request.document_description}
            </p>
          )}
        </div>

        {request?.document_url && (
          <PDFViewer
            url={request.document_url}
            onPageChange={(page, total) => {
              setCurrentPage(page - 1);
              setTotalPages(total);
            }}
            interactive={!signatureDataUrl}
            onPageClick={handlePageClick}
            signaturePosition={signaturePosition}
            signatureDataUrl={signatureDataUrl}
          />
        )}

        {signatureDataUrl && (
          <div className="border border-border rounded-lg p-6 bg-muted/10 space-y-4">
            <h2 className="text-lg font-semibold">Your Signature</h2>
            <div className="flex items-center gap-4">
              <div className="border border-border rounded-lg p-3 bg-white">
                <img
                  src={signatureDataUrl}
                  alt="Your signature"
                  className="h-16 object-contain"
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleClearSignature}>
                <RotateCcw className="w-4 h-4 mr-1" />
                Clear & Redo
              </Button>
            </div>
          </div>
        )}

        {!showDecline ? (
          <div className="space-y-4">
            {!signatureDataUrl && (
              <p className="text-sm text-muted-foreground">
                Click on the document above where you want to place your signature.
              </p>
            )}
            <div className="flex gap-3">
              <Button
                onClick={handleSign}
                disabled={signing || !signatureDataUrl}
                className="flex-1"
              >
                {signing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Sign Document
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDecline(true)}
                disabled={signing}
              >
                Decline
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Decline Signing</h2>
            <Textarea
              placeholder="Reason for declining (optional)"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={3}
            />
            <div className="flex gap-3">
              <Button variant="destructive" onClick={handleDecline} disabled={signing}>
                {signing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Confirm Decline
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDecline(false)}
                disabled={signing}
              >
                Back
              </Button>
            </div>
          </div>
        )}
      </main>

      <Dialog open={isSignatureModalOpen} onOpenChange={setIsSignatureModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Draw Your Signature</DialogTitle>
          </DialogHeader>
          <SignaturePad ref={signaturePadRef} />
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="outline" onClick={() => setIsSignatureModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (signaturePadRef.current?.isEmpty()) {
                  alert("Please draw your signature first.");
                  return;
                }
                const dataUrl = signaturePadRef.current?.toDataURL();
                if (dataUrl) handleSignatureComplete(dataUrl);
              }}
            >
              Confirm Signature
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

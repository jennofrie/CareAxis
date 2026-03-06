'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Send, Trash2, Download, Eye, XCircle } from "lucide-react";
import { RequestStatusBadge } from "./RequestStatusBadge";
import { SignatureRequest, useCancelSignatureRequest, useRemindSignatureRequest, useDeleteSignatureRequest, useDownloadSignatureDocument } from "@/hooks/useSignatureRequests";
import { useToast } from "@/hooks/use-toast";

interface SignatureRequestListProps {
  requests: SignatureRequest[];
  onViewDetails: (request: SignatureRequest) => void;
}

export function SignatureRequestList({ requests, onViewDetails }: SignatureRequestListProps) {
  const cancelRequest = useCancelSignatureRequest();
  const remindRequest = useRemindSignatureRequest();
  const deleteRequest = useDeleteSignatureRequest();
  const downloadDoc = useDownloadSignatureDocument();
  const { toast } = useToast();

  const handleRemind = async (id: string) => {
    try {
      await remindRequest.mutateAsync(id);
      toast({ title: "Reminder sent", description: "A reminder email has been sent." });
    } catch {
      toast({ title: "Error", description: "Failed to send reminder.", variant: "destructive" });
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelRequest.mutateAsync(id);
      toast({ title: "Request cancelled" });
    } catch {
      toast({ title: "Error", description: "Failed to cancel request.", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRequest.mutateAsync(id);
      toast({ title: "Request deleted" });
    } catch {
      toast({ title: "Error", description: "Failed to delete request.", variant: "destructive" });
    }
  };

  const handleDownload = async (id: string, type: 'original' | 'signed') => {
    try {
      const result = await downloadDoc.mutateAsync({ requestId: id, type });
      window.open(result.url, '_blank');
    } catch {
      toast({ title: "Error", description: "Failed to download document.", variant: "destructive" });
    }
  };

  if (requests.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">No signature requests yet.</p>
        <p className="text-sm mt-1">Create your first request to get started.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Document</TableHead>
          <TableHead>Recipient</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((request) => (
          <TableRow key={request.id} className="cursor-pointer" onClick={() => onViewDetails(request)}>
            <TableCell className="font-medium">{request.document_title}</TableCell>
            <TableCell>
              <div>
                <p className="text-sm">{request.recipient_name}</p>
                <p className="text-xs text-muted-foreground">{request.recipient_email}</p>
              </div>
            </TableCell>
            <TableCell>
              <RequestStatusBadge status={request.status} />
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {new Date(request.created_at).toLocaleDateString('en-AU')}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={() => onViewDetails(request)}>
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload(request.id, 'original')}>
                    <Download className="w-4 h-4 mr-2" />
                    Download Original
                  </DropdownMenuItem>
                  {request.status === 'SIGNED' && (
                    <DropdownMenuItem onClick={() => handleDownload(request.id, 'signed')}>
                      <Download className="w-4 h-4 mr-2" />
                      Download Signed
                    </DropdownMenuItem>
                  )}
                  {(request.status === 'PENDING' || request.status === 'VIEWED') && (
                    <>
                      <DropdownMenuItem onClick={() => handleRemind(request.id)}>
                        <Send className="w-4 h-4 mr-2" />
                        Send Reminder
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCancel(request.id)}>
                        <XCircle className="w-4 h-4 mr-2" />
                        Cancel Request
                      </DropdownMenuItem>
                    </>
                  )}
                  {(request.status === 'EXPIRED' || request.status === 'DECLINED') && (
                    <DropdownMenuItem onClick={() => handleDelete(request.id)} className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

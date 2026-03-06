import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export interface SignatureRequest {
  id: string;
  document_title: string;
  document_description: string | null;
  original_document_path: string;
  signed_document_path: string | null;
  sender_id: string;
  sender_name: string;
  sender_email: string;
  recipient_name: string;
  recipient_email: string;
  signing_token: string;
  token_expires_at: string;
  status: 'PENDING' | 'VIEWED' | 'SIGNED' | 'DECLINED' | 'EXPIRED';
  viewed_at: string | null;
  signed_at: string | null;
  declined_at: string | null;
  decline_reason: string | null;
  created_at: string;
  updated_at: string;
}

const EDGE_FUNCTION_URL = 'quantum-sign';

async function callEdgeFunction(action: string, data: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await supabase.functions.invoke(EDGE_FUNCTION_URL, {
    body: { action, ...data },
  });

  if (response.error) throw new Error(response.error.message);
  return response.data;
}

export function useSignatureRequests() {
  return useQuery<SignatureRequest[]>({
    queryKey: ['signature-requests'],
    queryFn: async () => {
      const result = await callEdgeFunction('list');
      return result.data || [];
    },
  });
}

export function useCreateSignatureRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      documentTitle: string;
      documentDescription?: string;
      recipientName: string;
      recipientEmail: string;
      filePath: string;
    }) => callEdgeFunction('create', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signature-requests'] });
    },
  });
}

export function useCancelSignatureRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) =>
      callEdgeFunction('cancel', { requestId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signature-requests'] });
    },
  });
}

export function useRemindSignatureRequest() {
  return useMutation({
    mutationFn: async (requestId: string) =>
      callEdgeFunction('remind', { requestId }),
  });
}

export function useDeleteSignatureRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) =>
      callEdgeFunction('delete', { requestId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signature-requests'] });
    },
  });
}

export function useDownloadSignatureDocument() {
  return useMutation({
    mutationFn: async ({ requestId, type }: { requestId: string; type: 'original' | 'signed' }) =>
      callEdgeFunction('download', { requestId, type }),
  });
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, ...params } = await req.json();

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const senderName = user.user_metadata?.full_name || user.email || 'Unknown';
    const appUrl = Deno.env.get('APP_URL') || 'https://cdss-careaxis.netlify.app';

    // LIST
    if (action === 'list') {
      const { data, error } = await supabase
        .from('signature_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CREATE
    if (action === 'create') {
      const { documentTitle, documentDescription, recipientName, recipientEmail, filePath } = params;

      if (!documentTitle || !recipientName || !recipientEmail || !filePath) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: documentTitle, recipientName, recipientEmail, filePath' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: request, error: insertError } = await supabase
        .from('signature_requests')
        .insert({
          document_title: documentTitle,
          document_description: documentDescription || null,
          recipient_name: recipientName,
          recipient_email: recipientEmail,
          original_document_path: filePath,
          sender_id: user.id,
          sender_name: senderName,
          sender_email: user.email || '',
          status: 'PENDING',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      if (!resendApiKey) {
        throw new Error('RESEND_API_KEY not configured in Supabase secrets');
      }

      const signingUrl = `${appUrl}/sign/${request.signing_token}`;

      const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f3f4f6;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg,#8A2BE2 0%,#00D9FF 100%);padding:32px 24px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">CareAxis</h1>
      <p style="margin:8px 0 0 0;color:#ffffff;font-size:14px;opacity:0.9;">Document Signature Request</p>
    </div>
    <div style="padding:32px 24px;">
      <h2 style="margin:0 0 16px 0;color:#111827;font-size:20px;font-weight:600;">Hello ${recipientName},</h2>
      <p style="margin:0 0 24px 0;color:#6b7280;font-size:15px;line-height:1.6;">
        <strong>${senderName}</strong> has sent you a document to review and sign.
      </p>
      <div style="background-color:#f9fafb;border-radius:8px;padding:20px;margin-bottom:24px;">
        <h3 style="margin:0 0 12px 0;color:#374151;font-size:16px;font-weight:600;">Document Details</h3>
        <div style="margin-bottom:8px;"><span style="color:#6b7280;font-size:14px;">Title:</span><span style="color:#111827;font-size:14px;font-weight:600;margin-left:8px;">${documentTitle}</span></div>
        ${documentDescription ? `<div style="margin-bottom:8px;"><span style="color:#6b7280;font-size:14px;">Description:</span><span style="color:#111827;font-size:14px;margin-left:8px;">${documentDescription}</span></div>` : ''}
        <div><span style="color:#6b7280;font-size:14px;">Sent by:</span><span style="color:#111827;font-size:14px;font-weight:600;margin-left:8px;">${senderName}</span></div>
      </div>
      <div style="text-align:center;margin-top:32px;">
        <a href="${signingUrl}" style="display:inline-block;padding:14px 36px;background-color:#8A2BE2;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:16px;">Review &amp; Sign Document</a>
      </div>
      <p style="margin:24px 0 0 0;color:#9ca3af;font-size:13px;text-align:center;line-height:1.5;">If the button above doesn't work, copy and paste this link:<br><a href="${signingUrl}" style="color:#8A2BE2;word-break:break-all;">${signingUrl}</a></p>
    </div>
    <div style="background-color:#f9fafb;padding:24px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0 0 8px 0;color:#6b7280;font-size:12px;">This is an automated message from CareAxis QuantumSign</p>
      <p style="margin:0;color:#9ca3af;font-size:11px;">&copy; ${new Date().getFullYear()} CareAxis. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'CareAxis <send@spectrandis.online>',
          to: [recipientEmail],
          subject: `${senderName} has sent you a document to sign - ${documentTitle}`,
          html: emailHtml,
        }),
      });

      let emailSent = false;
      let emailError: string | null = null;
      if (!resendResponse.ok) {
        const errorData = await resendResponse.text();
        console.error('Resend API error:', errorData);
        emailError = errorData;
      } else {
        emailSent = true;
      }

      return new Response(
        JSON.stringify({ success: true, data: request, emailSent, emailError }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CANCEL
    if (action === 'cancel') {
      const { requestId } = params;
      if (!requestId) {
        return new Response(JSON.stringify({ error: 'Missing required field: requestId' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data, error } = await supabase
        .from('signature_requests')
        .update({ status: 'EXPIRED' })
        .eq('id', requestId)
        .eq('status', 'PENDING')
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // REMIND
    if (action === 'remind') {
      const { requestId } = params;
      if (!requestId) {
        return new Response(JSON.stringify({ error: 'Missing required field: requestId' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: request, error: fetchError } = await supabase
        .from('signature_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      if (request.status !== 'PENDING' && request.status !== 'VIEWED') {
        return new Response(JSON.stringify({ error: `Cannot send reminder for request with status: ${request.status}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      if (!resendApiKey) throw new Error('RESEND_API_KEY not configured');

      const signingUrl = `${appUrl}/sign/${request.signing_token}`;

      const reminderHtml = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f3f4f6;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg,#8A2BE2 0%,#00D9FF 100%);padding:32px 24px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">CareAxis</h1>
      <p style="margin:8px 0 0 0;color:#ffffff;font-size:14px;opacity:0.9;">Signature Reminder</p>
    </div>
    <div style="padding:32px 24px;">
      <h2 style="margin:0 0 16px 0;color:#111827;font-size:20px;">Hello ${request.recipient_name},</h2>
      <p style="margin:0 0 24px 0;color:#6b7280;font-size:15px;line-height:1.6;">This is a friendly reminder that <strong>${senderName}</strong> is waiting for your signature on: <strong>${request.document_title}</strong></p>
      <div style="text-align:center;margin-top:32px;">
        <a href="${signingUrl}" style="display:inline-block;padding:14px 36px;background-color:#8A2BE2;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:16px;">Review &amp; Sign Document</a>
      </div>
    </div>
    <div style="background-color:#f9fafb;padding:24px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#6b7280;font-size:12px;">Automated reminder from CareAxis QuantumSign</p>
    </div>
  </div>
</body></html>`;

      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'CareAxis <send@spectrandis.online>',
          to: [request.recipient_email],
          subject: `Reminder: ${senderName} is waiting for your signature - ${request.document_title}`,
          html: reminderHtml,
        }),
      });

      if (!resendResponse.ok) {
        const errorData = await resendResponse.text();
        throw new Error(`Resend API error: ${errorData}`);
      }

      return new Response(JSON.stringify({ success: true, message: 'Reminder sent successfully' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // DELETE
    if (action === 'delete') {
      const { requestId } = params;
      if (!requestId) {
        return new Response(JSON.stringify({ error: 'Missing required field: requestId' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: request, error: fetchError } = await supabase
        .from('signature_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      const filesToDelete: string[] = [];
      if (request.original_document_path) filesToDelete.push(request.original_document_path);
      if (request.signed_document_path) filesToDelete.push(request.signed_document_path);

      if (filesToDelete.length > 0) {
        const { error: storageError } = await supabaseAdmin.storage.from('signature-documents').remove(filesToDelete);
        if (storageError) console.error('Storage deletion error:', storageError);
      }

      const { error: deleteError } = await supabase.from('signature_requests').delete().eq('id', requestId);
      if (deleteError) throw deleteError;

      return new Response(JSON.stringify({ success: true, message: 'Signature request deleted successfully' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // DOWNLOAD
    if (action === 'download') {
      const { requestId, type } = params;
      if (!requestId) {
        return new Response(JSON.stringify({ error: 'Missing required field: requestId' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: request, error: fetchError } = await supabase
        .from('signature_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      const filePath = type === 'signed' ? request.signed_document_path : request.original_document_path;

      if (!filePath) {
        return new Response(JSON.stringify({ error: `No ${type === 'signed' ? 'signed' : 'original'} document available` }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage.from('signature-documents').createSignedUrl(filePath, 300);
      if (signedUrlError) throw signedUrlError;

      return new Response(JSON.stringify({ success: true, url: signedUrlData.signedUrl }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error in quantum-sign function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

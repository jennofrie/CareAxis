import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, token, signatureDataUrl, signaturePosition, declineReason } = await req.json();

    if (!action || !token) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: action, token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET
    if (action === "get") {
      const { data: requests, error } = await supabase.rpc(
        "get_signature_request_by_token",
        { p_token: token }
      );

      const request = Array.isArray(requests) ? requests[0] : requests;

      if (error || !request) {
        return new Response(
          JSON.stringify({ error: "Signature request not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: signedUrlData, error: signedUrlError } =
        await supabase.storage
          .from("signature-documents")
          .createSignedUrl(request.original_document_path, 1800);

      if (signedUrlError) {
        return new Response(
          JSON.stringify({ error: "Failed to generate document URL" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ ...request, document_url: signedUrlData.signedUrl }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // VIEW
    if (action === "view") {
      const { error } = await supabase
        .from("signature_requests")
        .update({ status: "VIEWED", viewed_at: new Date().toISOString() })
        .eq("signing_token", token)
        .eq("status", "PENDING");

      if (error) {
        return new Response(
          JSON.stringify({ error: "Failed to update view status" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SIGN
    if (action === "sign") {
      if (!signatureDataUrl || !signaturePosition) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: signatureDataUrl, signaturePosition" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: request, error: fetchError } = await supabase
        .from("signature_requests")
        .select("*")
        .eq("signing_token", token)
        .in("status", ["PENDING", "VIEWED"])
        .single();

      if (fetchError || !request) {
        return new Response(
          JSON.stringify({ error: "Signature request not found or already signed" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: pdfData, error: downloadError } = await supabase.storage
        .from("signature-documents")
        .download(request.original_document_path);

      if (downloadError || !pdfData) {
        return new Response(
          JSON.stringify({ error: "Failed to download document" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const pdfBytes = new Uint8Array(await pdfData.arrayBuffer());
      const pdfDoc = await PDFDocument.load(pdfBytes);

      const signatureBase64 = signatureDataUrl.replace(/^data:image\/png;base64,/, "");
      const signatureBytes = Uint8Array.from(atob(signatureBase64), (c: string) => c.charCodeAt(0));
      const signatureImage = await pdfDoc.embedPng(signatureBytes);

      const { x, y, width, height, page: pageIndex } = signaturePosition;
      const pages = pdfDoc.getPages();
      const targetPage = pages[pageIndex] || pages[0];
      const pageHeight = targetPage.getHeight();
      targetPage.drawImage(signatureImage, {
        x,
        y: pageHeight - y - height,
        width,
        height,
      });

      const signedPdfBytes = await pdfDoc.save();

      const signedPath = request.original_document_path
        .replace("/original/", "/signed/")
        .replace(".pdf", "_signed.pdf");

      const { error: uploadError } = await supabase.storage
        .from("signature-documents")
        .upload(signedPath, signedPdfBytes, { contentType: "application/pdf", upsert: true });

      if (uploadError) {
        return new Response(
          JSON.stringify({ error: "Failed to upload signed document" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const signerIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "unknown";
      const signerUserAgent = req.headers.get("user-agent") || "unknown";

      const { error: updateError } = await supabase
        .from("signature_requests")
        .update({
          status: "SIGNED",
          signed_at: new Date().toISOString(),
          signed_document_path: signedPath,
          signature_data_url: signatureDataUrl,
          signature_position: signaturePosition,
          signer_ip_address: signerIp,
          signer_user_agent: signerUserAgent,
        })
        .eq("id", request.id);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: "Failed to update signature request" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      const appUrl = Deno.env.get("APP_URL") || "https://cdss-careaxis.netlify.app";

      if (resendApiKey && request.sender_email) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "CareAxis <send@spectrandis.online>",
            to: [request.sender_email],
            subject: `Document Signed: ${request.document_title || "Your Document"}`,
            html: `
              <!DOCTYPE html><html><head><meta charset="utf-8"></head>
              <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f4f4f7;">
                <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;margin-top:20px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                  <div style="background:linear-gradient(135deg,#8A2BE2,#00D9FF);padding:32px;text-align:center;">
                    <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">CareAxis</h1>
                    <p style="color:rgba(255,255,255,0.9);margin:4px 0 0;font-size:14px;">NDIS Support Coordination</p>
                  </div>
                  <div style="padding:32px;text-align:center;">
                    <div style="font-size:48px;margin-bottom:16px;">&#9989;</div>
                    <h2 style="color:#1a1a2e;margin:0 0 12px;font-size:22px;font-weight:600;">Document Signed Successfully</h2>
                    <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 24px;">
                      <strong>${request.recipient_name || "The signer"}</strong> has signed <strong>${request.document_title || "your document"}</strong>.
                    </p>
                    <a href="${appUrl}/dashboard/quantum-sign" style="display:inline-block;background:linear-gradient(135deg,#8A2BE2,#00D9FF);color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">View in CareAxis</a>
                  </div>
                  <div style="padding:16px 32px;background:#f9f9fb;text-align:center;border-top:1px solid #eee;">
                    <p style="color:#999;font-size:12px;margin:0;">Powered by CareAxis &mdash; Secure Document Signing</p>
                  </div>
                </div>
              </body></html>
            `,
          }),
        });
      }

      return new Response(
        JSON.stringify({ success: true, signed_document_path: signedPath }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DECLINE
    if (action === "decline") {
      const { data: request, error: fetchError } = await supabase
        .from("signature_requests")
        .select("*")
        .eq("signing_token", token)
        .in("status", ["PENDING", "VIEWED"])
        .single();

      if (fetchError || !request) {
        return new Response(
          JSON.stringify({ error: "Signature request not found or already processed" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: updateError } = await supabase
        .from("signature_requests")
        .update({
          status: "DECLINED",
          declined_at: new Date().toISOString(),
          decline_reason: declineReason || null,
        })
        .eq("id", request.id);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: "Failed to decline signature request" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      const appUrl = Deno.env.get("APP_URL") || "https://cdss-careaxis.netlify.app";

      if (resendApiKey && request.sender_email) {
        const reasonBlock = declineReason
          ? `<p style="color:#555;font-size:14px;line-height:1.6;margin:16px 0 0;background:#fff3f3;padding:12px 16px;border-radius:8px;border-left:4px solid #e74c3c;"><strong>Reason:</strong> ${declineReason}</p>`
          : "";

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "CareAxis <send@spectrandis.online>",
            to: [request.sender_email],
            subject: `Document Declined: ${request.document_title || "Your Document"}`,
            html: `
              <!DOCTYPE html><html><head><meta charset="utf-8"></head>
              <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f4f4f7;">
                <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;margin-top:20px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                  <div style="background:linear-gradient(135deg,#8A2BE2,#00D9FF);padding:32px;text-align:center;">
                    <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">CareAxis</h1>
                    <p style="color:rgba(255,255,255,0.9);margin:4px 0 0;font-size:14px;">NDIS Support Coordination</p>
                  </div>
                  <div style="padding:32px;text-align:center;">
                    <div style="font-size:48px;margin-bottom:16px;">&#10060;</div>
                    <h2 style="color:#1a1a2e;margin:0 0 12px;font-size:22px;font-weight:600;">Document Signing Declined</h2>
                    <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 8px;">
                      <strong>${request.recipient_name || "The signer"}</strong> has declined to sign <strong>${request.document_title || "your document"}</strong>.
                    </p>
                    ${reasonBlock}
                    <div style="margin-top:24px;">
                      <a href="${appUrl}/dashboard/quantum-sign" style="display:inline-block;background:linear-gradient(135deg,#8A2BE2,#00D9FF);color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">View in CareAxis</a>
                    </div>
                  </div>
                  <div style="padding:16px 32px;background:#f9f9fb;text-align:center;border-top:1px solid #eee;">
                    <p style="color:#999;font-size:12px;margin:0;">Powered by CareAxis &mdash; Secure Document Signing</p>
                  </div>
                </div>
              </body></html>
            `,
          }),
        });
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("quantum-sign-public error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.24.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Super Admin email - only this user can access RAG Agent
const SUPER_ADMIN_EMAIL = "daguiljennofrie@gmail.com";

// Model configuration
const FLASH_MODEL = "gemini-2.5-flash";

// RAG Configuration
const RAG_MATCH_THRESHOLD = 0.65; // Minimum similarity score (cosine)
const RAG_MATCH_COUNT = 8; // Max documents to retrieve

const RAG_AGENT_SYSTEM_PROMPT = `You are CareAxis RAG Agent v2 - an intelligent document analysis assistant with access to NDIS case notes and synthesized reports stored in the CareAxis platform.

═══════════════════════════════════════════════════════════════════════════════
CURRENT DATE & TIME CONTEXT
═══════════════════════════════════════════════════════════════════════════════

TODAY'S DATE: {{CURRENT_DATE}}

═══════════════════════════════════════════════════════════════════════════════
ROLE & CAPABILITIES
═══════════════════════════════════════════════════════════════════════════════

You are a powerful AI assistant with access to:
1. Visual Case Notes - Professional NDIS case notes generated from raw notes or images
2. Synthesized Reports - Comprehensive participant reports from the Report Synthesizer
3. Full conversation history for context-aware responses

YOUR EXPERTISE:
- NDIS (National Disability Insurance Scheme) compliance and legislation
- Section 34 Reasonable and Necessary criteria
- Plan management, pricing, and claiming rules
- Support coordination best practices
- Allied health report analysis
- Case note patterns and participant progress tracking

═══════════════════════════════════════════════════════════════════════════════
RESPONSE PROTOCOL
═══════════════════════════════════════════════════════════════════════════════

ALWAYS:
1. Cite your sources - when referencing document content, clearly indicate whether it's from a case note or report
2. Be accurate - if you don't have relevant documents, say so clearly
3. Be helpful - provide actionable insights and recommendations
4. Be conversational - this is a chat interface, respond naturally
5. Reference specific quotes when analyzing documents

FOR DOCUMENT QUERIES:
- Summarize key findings from relevant case notes and reports
- Highlight important data points, progress, or recommendations
- Note any concerning patterns or issues across documents
- Provide cross-document insights when multiple documents are relevant

FOR PATTERN ANALYSIS:
- Identify trends in participant engagement
- Track goal progress across multiple case notes
- Highlight recurring themes or concerns

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT (STRICT JSON)
═══════════════════════════════════════════════════════════════════════════════

{
  "response": "<your conversational response with markdown formatting>",
  "sources": [
    {
      "type": "<case_note|report>",
      "name": "<descriptive name based on content>",
      "relevance": "<high|medium|low>",
      "excerpt": "<relevant excerpt or summary, max 200 chars>"
    }
  ],
  "suggestedFollowups": [
    "<suggested follow-up question 1>",
    "<suggested follow-up question 2>"
  ]
}

CRITICAL: Return ONLY valid JSON, no markdown code blocks.`;

/**
 * Generate embedding for query using Gemini text-embedding-004
 */
async function generateQueryEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/text-embedding-004",
        content: {
          parts: [{ text }]
        },
        taskType: "RETRIEVAL_QUERY"
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini Embedding API error:", response.status, errorText);
    throw new Error(`Embedding API error: ${response.status}`);
  }

  const data = await response.json();
  const embedding = data.embedding?.values;

  if (!embedding || !Array.isArray(embedding)) {
    console.error("Invalid embedding response:", JSON.stringify(data));
    throw new Error("Invalid embedding response from API");
  }

  return embedding;
}

/**
 * Perform semantic search using pgvector
 */
async function searchDocuments(
  adminClient: any,
  queryEmbedding: number[],
  matchThreshold: number,
  matchCount: number
): Promise<any[]> {
  // Use the search_documents function we created in the migration
  const { data, error } = await adminClient.rpc('search_documents', {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
    filter_user_id: null // Super admin sees all documents
  });

  if (error) {
    console.error("Search documents error:", error);
    throw error;
  }

  return data || [];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    console.log("=== RAG Agent v2 (pgvector) Started ===");

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decode JWT
    const token = authHeader.replace("Bearer ", "");
    let userId: string | undefined;
    let userEmail: string | undefined;
    try {
      const payload = token.split(".")[1];
      const decoded = JSON.parse(atob(payload));
      userId = decoded.sub;
      userEmail = decoded.email;
    } catch (e: any) {
      console.error("Invalid token format:", e);
      return new Response(
        JSON.stringify({ error: "Invalid token format" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Invalid token (missing user id)" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SUPER ADMIN CHECK - This feature is only for the super admin
    if (userEmail?.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()) {
      console.log(`Access denied for user: ${userEmail}`);
      return new Response(
        JSON.stringify({
          error: "Access denied",
          message: "RAG Agent is only available to system administrators."
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Super admin access granted for: ${userEmail}`);

    // Supabase setup
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Server not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      message,
      sessionId,
      conversationHistory = [],
      action = "chat" // "chat" | "list_documents" | "stats"
    } = requestBody;

    console.log("Action:", action);
    console.log("Message:", message?.substring(0, 100));
    console.log("Session ID:", sessionId);

    // ACTION: Get RAG statistics
    if (action === "stats") {
      console.log("Fetching RAG statistics...");

      const { data: caseNoteCount, error: cnError } = await adminClient
        .from("document_embeddings")
        .select("id", { count: "exact", head: true })
        .eq("source_type", "case_note");

      const { data: reportCount, error: rError } = await adminClient
        .from("document_embeddings")
        .select("id", { count: "exact", head: true })
        .eq("source_type", "report");

      const { count: totalEmbeddings } = await adminClient
        .from("document_embeddings")
        .select("id", { count: "exact", head: true });

      return new Response(
        JSON.stringify({
          success: true,
          stats: {
            totalEmbeddings: totalEmbeddings || 0,
            caseNotes: caseNoteCount || 0,
            reports: reportCount || 0
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: List indexed documents (for UI display)
    if (action === "list_documents") {
      console.log("Listing indexed documents...");

      // Get unique source documents with their metadata
      const { data: documents, error: listError } = await adminClient
        .from("document_embeddings")
        .select("source_id, source_type, metadata, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (listError) {
        console.error("Error listing documents:", listError);
        return new Response(
          JSON.stringify({ error: "Failed to list documents", details: listError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Deduplicate by source_id
      const uniqueDocs = new Map();
      (documents || []).forEach(doc => {
        if (!uniqueDocs.has(doc.source_id)) {
          uniqueDocs.set(doc.source_id, {
            id: doc.source_id,
            type: doc.source_type,
            metadata: doc.metadata,
            createdAt: doc.created_at
          });
        }
      });

      const docList = Array.from(uniqueDocs.values());
      console.log(`Found ${docList.length} unique documents`);

      return new Response(
        JSON.stringify({
          success: true,
          documents: docList,
          count: docList.length
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: Chat with RAG
    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Gemini setup
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      console.error("GEMINI_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Generate query embedding and perform semantic search
    let ragContext = "";
    let ragSources: any[] = [];
    let ragUnavailable = false;

    try {
      console.log("Generating query embedding...");
      const queryEmbedding = await generateQueryEmbedding(message, apiKey);
      console.log("Query embedding generated, dimensions:", queryEmbedding.length);

      console.log("Performing semantic search...");
      const searchResults = await searchDocuments(
        adminClient,
        queryEmbedding,
        RAG_MATCH_THRESHOLD,
        RAG_MATCH_COUNT
      );
      console.log(`Found ${searchResults.length} relevant documents`);

      if (searchResults.length > 0) {
        ragContext = "\n\nRELEVANT DOCUMENTS:\n";

        searchResults.forEach((result, idx) => {
          const sourceLabel = result.source_type === 'case_note' ? 'Case Note' : 'Report';
          const similarity = (result.similarity * 100).toFixed(1);

          ragContext += `\n--- ${sourceLabel} ${idx + 1} (${similarity}% match) ---\n`;
          ragContext += result.chunk_text + "\n";

          ragSources.push({
            type: result.source_type,
            name: `${sourceLabel} (${result.metadata?.action || result.metadata?.persona_title || 'Document'})`,
            relevance: result.similarity > 0.8 ? "high" : result.similarity > 0.7 ? "medium" : "low",
            excerpt: result.chunk_text.substring(0, 200) + "..."
          });
        });
      }
    } catch (ragError: any) {
      console.warn("RAG search failed:", ragError);
      ragUnavailable = true;
      // Continue without RAG context - AI will respond based on general knowledge
    }

    // Fetch recent activity for additional context
    let activityContext = "";
    try {
      // Get recent case notes from activity_logs
      const { data: recentActivity } = await adminClient
        .from("activity_logs")
        .select("id, action, details, created_at")
        .or("action.eq.SC Case Notes,action.eq.Generated Case Note via Image Analysis")
        .order("created_at", { ascending: false })
        .limit(5);

      if (recentActivity && recentActivity.length > 0) {
        activityContext += "\n\nRECENT CASE NOTE ACTIVITY:\n";
        recentActivity.forEach((note, idx) => {
          const preview = note.details ? note.details.substring(0, 150) + "..." : "(no content)";
          activityContext += `${idx + 1}. [${note.created_at}] ${preview}\n`;
        });
      }

      // Get recent synthesized reports
      const { data: recentReports } = await adminClient
        .from("synthesized_reports")
        .select("id, persona_title, document_names, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      if (recentReports && recentReports.length > 0) {
        activityContext += "\n\nRECENT SYNTHESIZED REPORTS:\n";
        recentReports.forEach((report, idx) => {
          const docs = Array.isArray(report.document_names) ? report.document_names.join(", ") : "N/A";
          activityContext += `${idx + 1}. [${report.created_at}] ${report.persona_title} - Documents: ${docs}\n`;
        });
      }
    } catch (dbError) {
      console.warn("Activity context fetch failed:", dbError);
    }

    // Build conversation context
    let conversationContext = "";
    if (conversationHistory && conversationHistory.length > 0) {
      // Limit to last 10 messages to avoid context overflow
      const recentHistory = conversationHistory.slice(-10);
      conversationContext = "\n\nCONVERSATION HISTORY:\n";
      recentHistory.forEach((msg: any) => {
        conversationContext += `${msg.role.toUpperCase()}: ${msg.content}\n`;
      });
    }

    // Get current date in Australian Eastern Time
    const australianDate = new Date().toLocaleString('en-AU', {
      timeZone: 'Australia/Sydney',
      dateStyle: 'full',
      timeStyle: 'short'
    });

    const promptWithDate = RAG_AGENT_SYSTEM_PROMPT.replace('{{CURRENT_DATE}}', australianDate);

    // Build the full prompt
    const fullPrompt = `${promptWithDate}

═══════════════════════════════════════════════════════════════════════════════
AVAILABLE CONTEXT
═══════════════════════════════════════════════════════════════════════════════
${ragContext || "\nNo semantically similar documents found for this query."}
${activityContext}
${conversationContext}

═══════════════════════════════════════════════════════════════════════════════
USER MESSAGE
═══════════════════════════════════════════════════════════════════════════════

${message}

Remember: Return ONLY valid JSON matching the schema above.`;

    console.log("Full prompt length:", fullPrompt.length);

    // Generate response
    const model = genAI.getGenerativeModel({
      model: FLASH_MODEL,
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 4096,
      }
    });

    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    const text = response.text();

    console.log("AI response length:", text.length);

    // Parse JSON response
    let agentResponse;
    try {
      let jsonStr = text;
      if (text.includes("```json")) {
        jsonStr = text.split("```json")[1].split("```")[0].trim();
      } else if (text.includes("```")) {
        jsonStr = text.split("```")[1].split("```")[0].trim();
      }
      agentResponse = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      // Fallback to plain text response
      agentResponse = {
        response: text,
        sources: ragSources,
        suggestedFollowups: []
      };
    }

    // Merge RAG sources if not already included
    if (ragSources.length > 0 && (!agentResponse.sources || agentResponse.sources.length === 0)) {
      agentResponse.sources = ragSources;
    }

    // Save conversation to database
    if (sessionId) {
      try {
        // Save user message
        await adminClient.from("rag_agent_conversations").insert({
          user_id: userId,
          session_id: sessionId,
          role: "user",
          content: message,
          metadata: { ragSources: ragSources.length }
        });

        // Save assistant response
        await adminClient.from("rag_agent_conversations").insert({
          user_id: userId,
          session_id: sessionId,
          role: "assistant",
          content: agentResponse.response,
          sources: agentResponse.sources || [],
          metadata: { suggestedFollowups: agentResponse.suggestedFollowups }
        });

        console.log("Conversation saved to database");
      } catch (saveError) {
        console.warn("Failed to save conversation:", saveError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...agentResponse,
        ragUnavailable, // Let frontend know if RAG context was unavailable
        documentsSearched: ragSources.length,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("RAG Agent error:", error);

    return new Response(
      JSON.stringify({
        error: error?.message || "Failed to process request",
        errorType: error?.name || "UnknownError",
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

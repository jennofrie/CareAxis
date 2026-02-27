import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Maximum characters per chunk (Gemini embedding limit is ~2048 tokens, ~8000 chars safe)
const MAX_CHUNK_SIZE = 6000;
// Overlap between chunks to maintain context
const CHUNK_OVERLAP = 500;

/**
 * Split text into chunks for embedding
 * Uses sentence boundaries when possible
 */
function chunkText(text: string): string[] {
  if (text.length <= MAX_CHUNK_SIZE) {
    return [text];
  }

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    let endIndex = startIndex + MAX_CHUNK_SIZE;

    if (endIndex >= text.length) {
      // Last chunk
      chunks.push(text.slice(startIndex).trim());
      break;
    }

    // Try to break at sentence boundary
    const searchStart = Math.max(startIndex + MAX_CHUNK_SIZE - 500, startIndex);
    const searchEnd = Math.min(startIndex + MAX_CHUNK_SIZE + 200, text.length);
    const searchRange = text.slice(searchStart, searchEnd);

    // Look for sentence endings
    const sentenceEndMatch = searchRange.match(/[.!?]\s+/);
    if (sentenceEndMatch && sentenceEndMatch.index !== undefined) {
      endIndex = searchStart + sentenceEndMatch.index + sentenceEndMatch[0].length;
    }

    chunks.push(text.slice(startIndex, endIndex).trim());
    startIndex = endIndex - CHUNK_OVERLAP;
  }

  return chunks.filter(chunk => chunk.length > 50); // Filter out tiny chunks
}

/**
 * Generate embedding using Gemini text-embedding-004 model
 */
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
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
        taskType: "RETRIEVAL_DOCUMENT"
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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log("=== Generate Embedding Function Started ===");

    // Validate API key
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Supabase setup with service role for database operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Supabase credentials not configured");
      return new Response(
        JSON.stringify({ error: "Server not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // User client for auth validation
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User authenticated:", user.id);

    // Admin client for database operations (bypasses RLS)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Parse request body
    const body = await req.json();
    const {
      text,
      source_type,
      source_id,
      metadata = {}
    } = body;

    // Validate required fields
    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "text is required and must be a string" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!source_type || !["case_note", "report"].includes(source_type)) {
      return new Response(
        JSON.stringify({ error: "source_type must be 'case_note' or 'report'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!source_id) {
      return new Response(
        JSON.stringify({ error: "source_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${source_type} embedding for source: ${source_id}`);
    console.log(`Text length: ${text.length} characters`);

    // Delete existing embeddings for this source (if re-indexing)
    const { error: deleteError } = await adminClient
      .from("document_embeddings")
      .delete()
      .eq("source_id", source_id);

    if (deleteError) {
      console.warn("Error deleting existing embeddings:", deleteError);
      // Continue anyway - might be first time
    }

    // Chunk the text
    const chunks = chunkText(text);
    console.log(`Split into ${chunks.length} chunks`);

    // Generate and store embeddings for each chunk
    const insertedIds: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);

      try {
        // Generate embedding
        const embedding = await generateEmbedding(chunk, GEMINI_API_KEY);
        console.log(`Generated embedding with ${embedding.length} dimensions`);

        // Store in database
        const { data: insertData, error: insertError } = await adminClient
          .from("document_embeddings")
          .insert({
            source_type,
            source_id,
            user_id: user.id,
            chunk_text: chunk,
            chunk_index: i,
            embedding: embedding,
            metadata: {
              ...metadata,
              chunk_count: chunks.length,
              original_length: text.length,
              processed_at: new Date().toISOString()
            }
          })
          .select("id")
          .single();

        if (insertError) {
          console.error(`Error inserting chunk ${i}:`, insertError);
          errors.push(`Chunk ${i}: ${insertError.message}`);
        } else {
          insertedIds.push(insertData.id);
        }

      } catch (chunkError: any) {
        console.error(`Error processing chunk ${i}:`, chunkError);
        errors.push(`Chunk ${i}: ${chunkError.message}`);
      }

      // Small delay to avoid rate limiting
      if (chunks.length > 1 && i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`Successfully stored ${insertedIds.length}/${chunks.length} embeddings`);

    return new Response(
      JSON.stringify({
        success: insertedIds.length > 0,
        message: `Stored ${insertedIds.length} embedding(s) for ${source_type}`,
        embedding_ids: insertedIds,
        chunk_count: chunks.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Generate embedding error:", error);
    return new Response(
      JSON.stringify({
        error: error?.message || "Failed to generate embedding",
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

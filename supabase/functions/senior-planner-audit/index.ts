import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.24.0";

// Modular imports - following Single Responsibility Principle
import { AuditRequest, AuditResult } from "./types.ts";
import { getDocumentConfig } from "./document-types.ts";
import { SENIOR_PLANNER_SYSTEM_PROMPT } from "./system-prompt.ts";
import {
  corsHeaders,
  GEMINI_MODEL,
  FALLBACK_MODEL,
  createJsonResponse,
  createErrorResponse,
  createSuccessResponse,
  createContentRestrictionResponse,
  parseAuditResponse,
  normalizeStatus,
  buildAuditPrompt,
  log,
  logError
} from "./helpers.ts";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("=== Senior Planner Audit Started ===");

    // Auth (requires verify_jwt = true in config.toml)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return createErrorResponse("Missing authorization header", 401);
    }

    // Extract JWT token and decode user id (token is already validated by Supabase when verify_jwt=true)
    const token = authHeader.replace("Bearer ", "");
    let userId: string | undefined;
    try {
      const payload = token.split(".")[1];
      const decoded = JSON.parse(atob(payload));
      userId = decoded.sub;
    } catch (e) {
      logError("Invalid token format", e);
      return createErrorResponse("Invalid token format", 401);
    }

    if (!userId) {
      return createErrorResponse("Invalid token (missing user id)", 401);
    }

    // Tier check (Premium feature)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      logError("Supabase admin credentials not configured");
      return createErrorResponse("Server not configured", 500);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("subscription_tier")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      logError("User profile not found", profileError);
      return createErrorResponse("User profile not found", 404);
    }

    const tier = profile.subscription_tier as string;
    if (tier !== "premium" && tier !== "legacy_premium") {
      return createJsonResponse(
        {
          error: "Premium subscription required",
          message: "This feature is only available to Premium subscribers. Please upgrade to access.",
          tier,
        },
        403,
      );
    }

    // Parse request body
    let requestBody: AuditRequest;
    try {
      requestBody = await req.json();
      log("Request parsed successfully");
    } catch (parseError: unknown) {
      logError("Failed to parse request body:", parseError);
      const message = parseError instanceof Error ? parseError.message : "Unknown error";
      return createErrorResponse("Invalid request body", 400, message);
    }

    const { documentContent, documentType, fileData, fileMimeType } = requestBody;
    log("Document type:", documentType);
    log("Has documentContent:", !!documentContent);
    log("Has fileData:", !!fileData);

    // Validate input
    if (!documentContent && !fileData) {
      log("No content provided");
      return createErrorResponse("Document content or file data is required");
    }

    // Validate API key
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      logError("GEMINI_API_KEY not configured");
      return createErrorResponse("API key not configured", 500);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const docConfig = getDocumentConfig(documentType);

    log("Starting Senior Planner audit for document type:", documentType);

    // Generation function with proper error handling
    const attemptGeneration = async (modelName: string) => {
      log(`Attempting with model: ${modelName}`);

      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.3,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 8192,
        }
      });

      const isPdf = Boolean(fileData && fileMimeType === "application/pdf");
      const fullPrompt = buildAuditPrompt(docConfig, SENIOR_PLANNER_SYSTEM_PROMPT, documentContent, isPdf);

      log("Prompt length:", fullPrompt.length);

      if (isPdf) {
        log("Processing PDF with multimodal input");
        return model.generateContent([
          fullPrompt,
          {
            inlineData: {
              mimeType: "application/pdf",
              data: fileData
            }
          }
        ]);
      }

      log("Processing text content");
      return model.generateContent(fullPrompt);
    };

    // Try primary model with fallback
    let result;
    let usedModel = GEMINI_MODEL;

    try {
      result = await attemptGeneration(GEMINI_MODEL);
    } catch (modelError: unknown) {
      const message = modelError instanceof Error ? modelError.message : "Unknown error";
      log(`Primary model (${GEMINI_MODEL}) failed: ${message}`);
      log(`Falling back to ${FALLBACK_MODEL}...`);
      usedModel = FALLBACK_MODEL;
      result = await attemptGeneration(FALLBACK_MODEL);
    }

    log(`Successfully used model: ${usedModel}`);

    const text = result.response.text();
    log("Raw AI response received, length:", text.length);

    // Parse and validate response
    let auditResult = parseAuditResponse(text, documentType);

    // Check for content restriction
    if ((auditResult as { error?: string }).error === "CONTENT_RESTRICTION") {
      log("Content restriction triggered");
      return createContentRestrictionResponse((auditResult as { message?: string }).message);
    }

    // Normalize status based on score
    auditResult = normalizeStatus(auditResult as AuditResult);

    return createSuccessResponse(auditResult as AuditResult, docConfig.name, usedModel);

  } catch (error: unknown) {
    logError("Senior Planner Audit error:", error);

    const errorObj = error instanceof Error ? error : { message: "Unknown error", name: "UnknownError" };

    return createJsonResponse({
      error: errorObj.message || "Failed to perform audit",
      errorType: errorObj.name || "UnknownError",
      details: String(error),
      timestamp: new Date().toISOString()
    }, 500);
  }
});

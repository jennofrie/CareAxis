import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractPlanRequest {
  base64File?: string; // Base64 encoded file (for images or small PDFs)
  fileUrl?: string; // URL to file in Supabase Storage
  mimeType: string; // 'application/pdf', 'image/jpeg', 'image/png'
  fileName?: string;
}

interface ExtractedPlanData {
  participantName: string | null;
  ndisNumber: string | null;
  dateOfBirth: string | null;
  planStartDate: string | null;
  planEndDate: string | null;
  participantGoals: string | null;
  functionalImpairments: string[] | null;
  // Note: Other fields like SC name, item details, etc. are typically not in the plan document
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    // Get authorization header (required when verify_jwt = true)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract JWT token
    const token = authHeader.replace('Bearer ', '');
    
    // Decode JWT to get user ID
    let userId: string;
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      userId = decoded.sub;
      
      if (!userId) {
        throw new Error('User ID not found in token');
      }
    } catch (decodeError) {
      console.error('Error decoding JWT:', decodeError);
      return new Response(
        JSON.stringify({ error: 'Invalid token format' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check user's subscription tier
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('subscription_tier')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tier = profile.subscription_tier;
    
    // Only allow premium and legacy_premium users
    if (tier !== 'premium' && tier !== 'legacy_premium') {
      return new Response(
        JSON.stringify({ 
          error: 'Premium subscription required',
          message: 'This feature is only available to Premium subscribers.'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Gemini API key
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const requestData: ExtractPlanRequest = await req.json();

    if (!requestData.base64File && !requestData.fileUrl) {
      return new Response(
        JSON.stringify({ error: 'Either base64File or fileUrl must be provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!requestData.mimeType) {
      return new Response(
        JSON.stringify({ error: 'mimeType is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Extracting plan data from:', requestData.mimeType);

    // Prepare file part for Gemini
    let filePart;
    if (requestData.base64File) {
      // Extract mime type and data from base64 string if it includes data URI prefix
      const matches = requestData.base64File.match(/^data:(.+);base64,(.+)$/);
      if (matches) {
        filePart = {
          inline_data: {
            mime_type: matches[1],
            data: matches[2]
          }
        };
      } else {
        // Raw base64 data
        filePart = {
          inline_data: {
            mime_type: requestData.mimeType,
            data: requestData.base64File
          }
        };
      }
    } else if (requestData.fileUrl) {
      // Use file URL (for files in Supabase Storage)
      filePart = {
        file_data: {
          file_uri: requestData.fileUrl,
          mime_type: requestData.mimeType
        }
      };
    }

    // Build extraction prompt
    const extractionPrompt = `You are an expert NDIS Support Coordinator analyzing an NDIS plan document (PDF or image).

Extract the following information from this NDIS plan document and return ONLY valid JSON with the exact structure below. 

CRITICAL RULES:
1. Return null for any field that is NOT explicitly stated in the document
2. Do NOT infer, guess, or make up information
3. Extract dates in YYYY-MM-DD format (e.g., "2024-01-15")
4. Extract participant goals as complete sentences, separated by newlines
5. For functional impairments, extract only if explicitly mentioned (Cognitive, Psychosocial, Physical, Sensory)
6. Return ONLY the JSON object, no markdown, no code blocks, no explanations

Return this JSON structure:
{
  "participantName": "string or null",
  "ndisNumber": "string or null",
  "dateOfBirth": "string in YYYY-MM-DD format or null",
  "planStartDate": "string in YYYY-MM-DD format or null",
  "planEndDate": "string in YYYY-MM-DD format or null",
  "participantGoals": "string (goals separated by newlines) or null",
  "functionalImpairments": ["array of strings: Cognitive, Psychosocial, Physical, Sensory"] or null
}

If the document is not an NDIS plan or does not contain relevant information, return:
{
  "error": "Document does not appear to be an NDIS plan or contains insufficient information"
}`;

    // Call Gemini API with multimodal input
    // Using gemini-flash-lite-latest which supports PDFs and images (most cost-effective model)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${GEMINI_API_KEY}`;
    
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: extractionPrompt },
            filePart
          ]
        }],
        generationConfig: {
          temperature: 0.1, // Low temperature for accurate extraction
          topK: 20,
          topP: 0.8,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json' // Request JSON response
        }
      })
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'AI service error', 
          details: errorText,
          message: 'Failed to analyze document. Please ensure the file is a valid NDIS plan document.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiData = await geminiResponse.json();
    let extractedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!extractedText) {
      console.error('No text in Gemini response:', geminiData);
      return new Response(
        JSON.stringify({ error: 'Invalid response from AI service' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse JSON response
    let extractedData: ExtractedPlanData;
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanJson = extractedText.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      extractedData = JSON.parse(cleanJson);
      
      // Check if extraction returned an error
      if ((extractedData as any).error) {
        return new Response(
          JSON.stringify({ 
            error: 'Extraction failed',
            message: (extractedData as any).error
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (parseError) {
      console.error('Error parsing extracted data:', parseError);
      console.error('Raw response:', extractedText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse extracted data',
          message: 'The AI response could not be parsed. Please try again or enter information manually.',
          rawResponse: extractedText.substring(0, 500) // Include first 500 chars for debugging
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Plan data extracted successfully');

    return new Response(
      JSON.stringify({
        success: true,
        data: extractedData,
        extractedFields: Object.keys(extractedData).filter(key => extractedData[key as keyof ExtractedPlanData] !== null)
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    console.error('Error processing plan extraction:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: errorMessage,
        stack: errorStack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});


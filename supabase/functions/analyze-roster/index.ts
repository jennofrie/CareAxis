import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyzeRosterRequest {
  rosterData: string;
  budgets: {
    core: number;
    capacity: number;
    capital: number;
  };
}

interface WeeklyProjection {
  week: string;
  spending: number;
  category: string;
}

interface CategoryBreakdown {
  category: string;
  budgeted: number;
  projected: number;
  variance: number;
}

interface Alert {
  type: string;
  message: string;
  severity: "warning" | "error" | "info";
}

interface RosterAnalysisResponse {
  summary: string;
  weeklyProjections: WeeklyProjection[];
  categoryBreakdown: CategoryBreakdown[];
  alerts: Alert[];
  rosterData: Record<string, string>[];
}

/**
 * Parse CSV text into an array of row objects.
 * Handles quoted fields, trims whitespace, and skips empty lines.
 */
function parseCsv(csvText: string): Record<string, string>[] {
  const lines = csvText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  if (lines.length < 2) {
    return [];
  }

  // Parse header row
  const headers = parseCSVLine(lines[0]);

  // Parse data rows
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      const key = headers[j].trim();
      row[key] = j < values.length ? values[j].trim() : '';
    }
    rows.push(row);
  }

  return rows;
}

/**
 * Parse a single CSV line, handling quoted fields with commas inside.
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        // Escaped quote inside quoted field
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  // Push the last field
  result.push(current);
  return result;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify Gemini API key is configured
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured in Supabase secrets');
    }

    // Get JWT token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Supabase client and verify auth
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const requestData: AnalyzeRosterRequest = await req.json();

    // Validate required fields
    if (!requestData.rosterData || typeof requestData.rosterData !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing required field: rosterData (CSV text string)' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!requestData.budgets) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: budgets (core, capacity, capital)' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse CSV data
    console.log('Parsing CSV roster data...');
    const parsedRows = parseCsv(requestData.rosterData);

    if (parsedRows.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid data rows found in CSV. Ensure the CSV has a header row and at least one data row.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Parsed ${parsedRows.length} roster rows`);

    // Build the prompt with parsed data
    const systemPrompt = `You are an NDIS budget and roster analyst. Analyze the roster CSV data provided, calculate weekly spending patterns, project costs against NDIS budgets, identify any budget risks, and return a JSON analysis.

Response must be valid JSON only matching this exact schema (no markdown, no code blocks, no extra text):
{
  "summary": "string (2-3 sentence overview of roster analysis findings)",
  "weeklyProjections": [
    {
      "week": "string (Week of DD/MM/YYYY)",
      "spending": number,
      "category": "string (support category name)"
    }
  ],
  "categoryBreakdown": [
    {
      "category": "string (support category name)",
      "budgeted": number,
      "projected": number,
      "variance": number (negative means over budget)
    }
  ],
  "alerts": [
    {
      "type": "string (warning | error | info)",
      "message": "string (description of the alert)",
      "severity": "warning" | "error" | "info"
    }
  ]
}

Analysis guidelines:
- Group roster entries by week (Monday-Sunday) for weekly projections
- Map support categories to NDIS budget categories (Core, Capacity Building, Capital)
- Calculate total projected cost from roster data and compare to budgets
- Flag categories where projected spending exceeds budget
- Flag unusually high hours or rates compared to NDIS Price Guide norms
- Identify scheduling gaps or worker concentration risks
- Consider travel time and cancellation provisions in cost projections`;

    const userPrompt = `Analyze this NDIS roster data against the participant's budget:

NDIS BUDGETS:
- Core Supports: $${requestData.budgets.core.toLocaleString()}
- Capacity Building: $${requestData.budgets.capacity.toLocaleString()}
- Capital: $${requestData.budgets.capital.toLocaleString()}

PARSED ROSTER DATA (${parsedRows.length} entries):
${JSON.stringify(parsedRows, null, 2)}

Analyze the roster, calculate weekly spending projections per category, compare against budgets, and identify any risks or alerts. Return valid JSON only.`;

    // Call Gemini API
    console.log('Calling Gemini 2.0 Flash for roster analysis...');
    const startTime = Date.now();

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: [
            {
              parts: [{ text: userPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    const elapsed = Date.now() - startTime;
    console.log(`Gemini response received in ${elapsed}ms`);

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorData);
      throw new Error(`Gemini API error: ${errorData}`);
    }

    const geminiData = await geminiResponse.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error('No analysis generated by AI');
    }

    console.log(`Gemini generated ${responseText.length} characters`);

    // Parse and validate the JSON response
    let analysisData: Omit<RosterAnalysisResponse, 'rosterData'>;
    try {
      let cleanJson = responseText.trim();
      // Strip markdown code blocks if present
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.slice(7);
      }
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.slice(3);
      }
      if (cleanJson.endsWith('```')) {
        cleanJson = cleanJson.slice(0, -3);
      }
      cleanJson = cleanJson.trim();

      analysisData = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', responseText.substring(0, 500));
      throw new Error('Failed to parse AI analysis response as valid JSON');
    }

    // Validate required fields
    if (!analysisData.summary || !Array.isArray(analysisData.weeklyProjections) || !Array.isArray(analysisData.categoryBreakdown)) {
      throw new Error('Invalid analysis response: missing required fields (summary, weeklyProjections, categoryBreakdown)');
    }

    // Compose full response with parsed roster data included
    const fullResponse: RosterAnalysisResponse = {
      summary: analysisData.summary,
      weeklyProjections: analysisData.weeklyProjections,
      categoryBreakdown: analysisData.categoryBreakdown,
      alerts: analysisData.alerts || [],
      rosterData: parsedRows,
    };

    console.log('Roster analysis completed successfully');

    return new Response(
      JSON.stringify(fullResponse),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in analyze-roster function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

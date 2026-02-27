import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ForecastRequest {
  budgets: {
    core: number;
    capacityBuilding: number;
    capital: number;
  };
  spending: {
    core: number;
    capacityBuilding: number;
    capital: number;
  };
  dates: {
    start: string;
    end: string;
  };
}

interface CategoryForecast {
  category: string;
  budget: number;
  spent: number;
  projected: number;
  remaining: number;
  status: "on-track" | "warning" | "over";
  recommendation: string;
}

interface ForecastResponse {
  categories: CategoryForecast[];
  overallStatus: string;
  alerts: string[];
  recommendations: string[];
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

    // Parse request body
    const requestData: ForecastRequest = await req.json();

    // Validate required fields
    if (!requestData.budgets || !requestData.spending || !requestData.dates) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: budgets, spending, and dates are all required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!requestData.dates.start || !requestData.dates.end) {
      return new Response(
        JSON.stringify({ error: 'Missing required date fields: dates.start and dates.end (YYYY-MM-DD)' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Calculate time-based metrics
    const startDate = new Date(requestData.dates.start);
    const endDate = new Date(requestData.dates.end);
    const today = new Date();

    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysElapsed = Math.max(0, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

    // Calculate daily run rates per category
    const categories = [
      { name: "Core Supports", budget: requestData.budgets.core, spent: requestData.spending.core },
      { name: "Capacity Building", budget: requestData.budgets.capacityBuilding, spent: requestData.spending.capacityBuilding },
      { name: "Capital", budget: requestData.budgets.capital, spent: requestData.spending.capital },
    ];

    const categoryMetrics = categories.map(cat => {
      const dailyRate = daysElapsed > 0 ? cat.spent / daysElapsed : 0;
      const projectedTotal = cat.spent + (dailyRate * daysRemaining);
      const percentUsed = cat.budget > 0 ? (cat.spent / cat.budget) * 100 : 0;
      const percentElapsed = totalDays > 0 ? (daysElapsed / totalDays) * 100 : 0;

      return {
        name: cat.name,
        budget: cat.budget,
        spent: cat.spent,
        dailyRate: Math.round(dailyRate * 100) / 100,
        projectedTotal: Math.round(projectedTotal * 100) / 100,
        remaining: Math.round((cat.budget - cat.spent) * 100) / 100,
        percentUsed: Math.round(percentUsed * 100) / 100,
        percentElapsed: Math.round(percentElapsed * 100) / 100,
      };
    });

    const systemPrompt = `You are an NDIS budget analyst. Given an NDIS plan period, 3-category budgets (Core Supports, Capacity Building, Capital), and current spending, project future spend, identify at-risk categories, and provide actionable recommendations.

Response MUST be valid JSON only matching this exact schema (no markdown, no code blocks, no extra text):
{
  "categories": [
    {
      "category": "string (Core Supports | Capacity Building | Capital)",
      "budget": number,
      "spent": number,
      "projected": number,
      "remaining": number,
      "status": "on-track" | "warning" | "over",
      "recommendation": "string"
    }
  ],
  "overallStatus": "string (1-2 sentence summary of overall budget health)",
  "alerts": ["string (warning or critical alert messages)"],
  "recommendations": ["string (actionable budget management recommendations)"]
}

Status rules:
- "on-track": projected spend is within 90% of budget
- "warning": projected spend is between 90-100% of budget
- "over": projected spend exceeds budget

Consider NDIS-specific factors:
- Plan utilisation rates (typical NDIS plans are underutilised at ~70%)
- Seasonal spending patterns (holidays, school terms)
- Category flexibility rules (Core is flexible, Capital is restricted)
- Plan review timing and evidence requirements
- Service booking gaps and cancellation patterns`;

    const userPrompt = `Analyze this NDIS budget forecast:

PLAN PERIOD:
- Start: ${requestData.dates.start}
- End: ${requestData.dates.end}
- Total days: ${totalDays}
- Days elapsed: ${daysElapsed}
- Days remaining: ${daysRemaining}
- Plan progress: ${totalDays > 0 ? Math.round((daysElapsed / totalDays) * 100) : 0}%

CATEGORY BREAKDOWN:
${categoryMetrics.map(c => `
${c.name}:
  - Budget: $${c.budget.toLocaleString()}
  - Spent: $${c.spent.toLocaleString()} (${c.percentUsed}% of budget)
  - Daily run rate: $${c.dailyRate}/day
  - Projected total spend: $${c.projectedTotal.toLocaleString()}
  - Remaining: $${c.remaining.toLocaleString()}
`).join('')}

Based on these metrics, provide a comprehensive forecast with status assessments, alerts for any at-risk categories, and NDIS-specific recommendations. Return valid JSON only.`;

    // Call Gemini API
    console.log('Calling Gemini 2.0 Flash for budget forecast...');
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
            maxOutputTokens: 4096,
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
      throw new Error('No forecast generated by AI');
    }

    console.log(`Gemini generated ${responseText.length} characters`);

    // Parse and validate the JSON response
    let forecastData: ForecastResponse;
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

      forecastData = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', responseText.substring(0, 500));
      throw new Error('Failed to parse AI forecast response as valid JSON');
    }

    // Validate the response has required fields
    if (!forecastData.categories || !Array.isArray(forecastData.categories)) {
      throw new Error('Invalid forecast response: missing categories array');
    }

    console.log('Budget forecast completed successfully');

    return new Response(
      JSON.stringify(forecastData),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in forecast-budget function:', error);
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

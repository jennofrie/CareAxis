import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WeeklySummaryRequest {
  participant_name?: string;
  start_date: string;
  end_date: string;
  focus_areas?: string[];
}

// Focus area definitions for prompt enhancement
const FOCUS_AREA_PROMPTS: Record<string, string> = {
  goals: "Goal Progress - Assess progress toward NDIS plan goals, capacity building achievements, and milestone completions",
  behavior: "Behavior & Wellbeing - Analyze emotional states, behavioral patterns, mental health indicators, and overall wellbeing observations",
  incidents: "Incidents & Concerns - Highlight any issues, near-misses, safety concerns, behavioral escalations, or difficulties that need follow-up",
  community: "Community Access - Review social activities, community participation, independence in public settings, and engagement outcomes",
  skills: "Skill Development - Evaluate learning progress, new abilities acquired, therapy outcomes, and capacity building activities",
};

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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated
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
    const requestData: WeeklySummaryRequest = await req.json();

    // Validate required fields
    if (!requestData.start_date || !requestData.end_date) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: start_date and end_date' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch all case notes for the date range
    let query = supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', requestData.start_date)
      .lte('created_at', requestData.end_date)
      .order('created_at', { ascending: true });

    // Filter by participant name if provided
    if (requestData.participant_name) {
      query = query.ilike('action', `%${requestData.participant_name}%`);
    }

    const { data: caseNotes, error: notesError } = await query;

    if (notesError) {
      throw new Error(`Failed to fetch case notes: ${notesError.message}`);
    }

    if (!caseNotes || caseNotes.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No case notes found for the specified date range',
          summary: null
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Combine all case notes into single text
    const allNotesText = caseNotes
      .map(note => `[${new Date(note.created_at).toLocaleDateString()}] ${note.action}`)
      .join('\n\n');

    // Build focus areas section based on selection
    const focusAreas = requestData.focus_areas || ['goals', 'behavior', 'incidents'];
    const focusAreasText = focusAreas
      .filter(area => FOCUS_AREA_PROMPTS[area])
      .map(area => `- ${FOCUS_AREA_PROMPTS[area]}`)
      .join('\n');

    const systemPrompt = `You are an experienced NDIS Support Coordinator preparing a weekly progress summary for team meetings and compliance documentation. Your summaries must be:
- Professional and suitable for NDIA reporting
- Evidence-based, citing specific observations from notes
- Action-oriented with clear next steps
- Compliant with NDIS documentation standards
- Balanced between achievements and areas needing attention`;

    const userPrompt = `Analyze these case notes from ${requestData.start_date} to ${requestData.end_date} and generate a professional weekly progress summary.

PRIORITY FOCUS AREAS (emphasize these in the summary):
${focusAreasText}

Case Notes:
${allNotesText}

Create a structured summary with these sections:

## KEY ACHIEVEMENTS
(3-5 bullet points highlighting positive developments, progress, and wins)
- Focus on participant progress, goal achievements, and positive developments
- Be specific with examples from the notes
- Link achievements to NDIS plan goals where possible

## CONCERNS & CHALLENGES
(2-4 bullet points on issues requiring attention)
- Highlight any difficulties, setbacks, or concerns observed
- Note behavioral changes, safety issues, or escalating needs
- Be objective and factual, avoiding assumptions

## GOAL PROGRESS
(2-3 bullet points on NDIS plan goal tracking)
- Reference specific NDIS plan goals if mentioned
- Assess progress toward capacity building objectives
- Note any barriers to goal achievement

## RECOMMENDATIONS FOR NEXT WEEK
(2-4 actionable items)
- Suggest specific adjustments, follow-ups, or interventions
- Be practical and achievable within support worker scope
- Include any referrals or escalations needed

## ACTIVITY SUMMARY
(Brief statistics and patterns)
- Count of support sessions
- Types of activities (community access, personal care, skill building, etc.)
- Notable patterns or trends observed

Format the response in clean markdown with clear headers. Keep it professional and suitable for NDIS compliance documentation and team handover meetings. Focus on objective observations and actionable insights.`;

    // Call Gemini API
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
            temperature: 0.4,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.text();
      throw new Error(`Gemini API error: ${errorData}`);
    }

    const geminiData = await geminiResponse.json();
    const summaryText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!summaryText) {
      throw new Error('No summary generated by AI');
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: summaryText,
        note_count: caseNotes.length,
        date_range: {
          start: requestData.start_date,
          end: requestData.end_date
        },
        focus_areas: focusAreas,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-weekly-summary function:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

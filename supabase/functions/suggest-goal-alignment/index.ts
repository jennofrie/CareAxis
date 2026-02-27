import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoalAlignmentRequest {
  activity_description: string;
  participant_name: string;
}

interface GoalSuggestion {
  goal_number: number;
  goal_description: string;
  goal_category: string;
  confidence: number;
  reasoning: string;
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
    const requestData: GoalAlignmentRequest = await req.json();

    // Validate required fields
    if (!requestData.activity_description || !requestData.participant_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: activity_description and participant_name' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch participant's goals from database
    const { data: participantGoals, error: goalsError } = await supabase
      .from('participant_goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('participant_name', requestData.participant_name)
      .order('goal_number', { ascending: true });

    if (goalsError) {
      throw new Error(`Failed to fetch participant goals: ${goalsError.message}`);
    }

    if (!participantGoals || participantGoals.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No goals found for this participant. Please add participant goals first.',
          suggestions: []
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Build goals list for AI prompt
    const goalsListText = participantGoals
      .map(goal => `${goal.goal_number}. ${goal.goal_description} (Category: ${goal.goal_category || 'General'})`)
      .join('\n');

    // Build AI prompt
    const systemPrompt = `You are an NDIS support coordination expert analyzing case notes for goal alignment. Your task is to identify which NDIS plan goals are supported by documented activities.`;

    const userPrompt = `Based on this activity description, which of the participant's NDIS plan goals does it align with?

Activity Description:
"${requestData.activity_description}"

Participant's NDIS Goals:
${goalsListText}

Analyze the activity and determine which goals it supports. For each matching goal, provide:
1. Goal number
2. Confidence score (0-100%)
3. Brief reasoning (one sentence)

Return your response as a JSON array in this exact format:
[
  {
    "goal_number": 1,
    "confidence": 95,
    "reasoning": "Activity directly supports this goal by..."
  },
  {
    "goal_number": 3,
    "confidence": 75,
    "reasoning": "Activity indirectly relates to this goal through..."
  }
]

Only include goals with confidence > 60%. If no goals match well, return an empty array [].

CRITICAL: Return ONLY the JSON array, no other text or markdown formatting.`;

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
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.text();
      throw new Error(`Gemini API error: ${errorData}`);
    }

    const geminiData = await geminiResponse.json();
    let aiResponseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiResponseText) {
      throw new Error('No response generated by AI');
    }

    // Clean up AI response (remove markdown code blocks if present)
    aiResponseText = aiResponseText.trim();
    if (aiResponseText.startsWith('```json')) {
      aiResponseText = aiResponseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (aiResponseText.startsWith('```')) {
      aiResponseText = aiResponseText.replace(/```\n?/g, '');
    }

    // Parse AI response as JSON
    let aiSuggestions: Array<{ goal_number: number; confidence: number; reasoning: string }> = [];
    try {
      aiSuggestions = JSON.parse(aiResponseText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponseText);
      throw new Error('AI returned invalid JSON format');
    }

    // Enrich suggestions with goal details from database
    const enrichedSuggestions: GoalSuggestion[] = aiSuggestions
      .map(suggestion => {
        const goalData = participantGoals.find(g => g.goal_number === suggestion.goal_number);
        if (!goalData) return null;

        return {
          goal_number: suggestion.goal_number,
          goal_description: goalData.goal_description,
          goal_category: goalData.goal_category || 'General',
          confidence: suggestion.confidence,
          reasoning: suggestion.reasoning
        };
      })
      .filter((s): s is GoalSuggestion => s !== null)
      .sort((a, b) => b.confidence - a.confidence); // Sort by confidence descending

    return new Response(
      JSON.stringify({
        success: true,
        suggestions: enrichedSuggestions,
        participant_name: requestData.participant_name
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in suggest-goal-alignment function:', error);
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

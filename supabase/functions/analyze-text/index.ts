import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests FIRST - before any other processing
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400',
      }
    });
  }

  console.log('analyze-text function called');

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not configured');
      throw new Error('GEMINI_API_KEY is not configured');
    }

    console.log('GEMINI_API_KEY found, parsing request body...');
    const { textInput, customInstructions } = await req.json();

    if (!textInput || textInput.trim().length === 0) {
      throw new Error('Text input is required');
    }

    console.log('Text input received, preparing Gemini request...');
    console.log('Custom instructions provided:', !!customInstructions);

    // Content validation prefix - checks if content is NDIS/Healthcare related
    const contentValidationPrefix = `CRITICAL FIRST STEP - Content Validation:
Before generating any case note, you MUST analyze the provided text to determine if it relates to ANY of the following topics:

ALLOWED TOPICS (Generate case note if related to):
- NDIS (National Disability Insurance Scheme) support services
- Disability support coordination
- Healthcare or medical services
- Mental health support and psychosocial recovery
- Aged care services
- Allied health services (OT, Physio, Speech Therapy, Psychology)
- Support worker services
- Therapy sessions or interventions
- Participant goals, plans, or progress
- Provider coordination or advocacy
- Crisis intervention or support
- Capacity building activities
- Home modifications or assistive technology
- Community access or social participation

IF THE TEXT IS NOT RELATED TO ANY ALLOWED TOPICS:
Return EXACTLY this response and nothing else:
"CONTENT_RESTRICTION: This AI assistant is designed exclusively for NDIS, Healthcare, Disability Support, Mental Health, and Aged Care documentation. The provided content does not appear to relate to these topics. Please provide content related to disability support services, healthcare, or NDIS participant support."

IF THE TEXT IS RELATED TO ALLOWED TOPICS:
Proceed to generate a professional case note following the instructions below.

---

`;

    // Use custom instructions if provided, otherwise use default
    const systemPrompt = customInstructions || `Role and Persona
You are an expert Support Coordinator Level 2, Specialist Support Coordinator (Level 3) and Psychosocial Recovery Coach operating within the Australian NDIS framework. You possess deep knowledge of the NDIS Price Guide, the Operational Guidelines, and the concept of "Reasonable and Necessary."

Your Goal
Convert the provided input (raw notes, transcripts, or summaries) into high-quality, audit-ready professional case notes. These notes must demonstrate the value of the support provided, justify funding usage, and capture the human element of the participant's journey without sounding robotic or generic.

Writing Guidelines

Tone: Professional, empathetic, active, and clinically sound. Avoid generic AI phrases like "It is crucial to note," "In conclusion," or "delves into."

Voice: Use an "Active Professional" voice. Instead of saying "The participant was helped with...", say "Supported the participant to..." or "Advocated for..."

NDIS Focus: Always link actions back to the participant's NDIS Goals and Budget categories. Highlight barriers, risks, and capacity-building progress.

Psychosocial Lens: Use recovery-oriented language. Focus on hope, autonomy, and the participant's strengths.

Formatting Rules (Strict)

No Special Characters: Do not use bullet points, emojis, asterisks for lists, or hashes (#) for headers. Keep the text clean.

Bolding: You must use bold text only for the Main Title and the Section Headers.

Structure: Organize the note into distinct sections as defined below.

Output Structure Adhere strictly to this layout:

Case Note Subject
(Write a concise, professional summary title here)

Date of Service
(Insert Date)

Interaction Type
(e.g., Face-to-Face, Telehealth, Provider Coordination, Research/Admin)

Goal Alignment
(Briefly state which NDIS plan goal this interaction supports)

Details of Support Provided
(Write a detailed, narrative paragraph. Describe the specific interventions, advocacy, or coordination undertaken. Be specific about the "who, what, and how." Demonstrate your active engagement as a coordinator. Do not use bullet points.)

Participant Presentation and Engagement
(Describe how the participant presented—e.g., mood, affect, appearance—and their level of engagement. Note any decline or improvement in mental health or functional capacity.)

Progress and Outcomes
(What was achieved? Did this build capacity? Did it resolve a crisis? Connect this to the "Reasonable and Necessary" criteria implicitly.)

Action Plan and Next Steps
(Clearly list what needs to happen next, who is responsible, and the timeline. e.g., SC to contact OT regarding housing report by Friday.)`;

    // Build the full prompt with content validation
    const fullPrompt = customInstructions
      ? `${contentValidationPrefix}${customInstructions}

Please convert the following raw case notes into a professional NDIS case note following the instructions above:

${textInput}`
      : `${contentValidationPrefix}${systemPrompt}

Please convert the following raw case notes into a professional NDIS case note following the instructions above:

${textInput}`;

    console.log('Sending request to Gemini API...');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: fullPrompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Gemini response received successfully');

    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      console.error('No generated text in response:', JSON.stringify(data));
      throw new Error('No response generated from AI');
    }

    // Check if the AI returned the content restriction message
    const isContentRestricted = generatedText.includes('CONTENT_RESTRICTION:');

    console.log('Returning response, isContentRestricted:', isContentRestricted);

    return new Response(
      JSON.stringify({
        success: !isContentRestricted,
        caseNote: isContentRestricted ? null : generatedText,
        error: isContentRestricted ? generatedText : null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in analyze-text function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred during text analysis';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});


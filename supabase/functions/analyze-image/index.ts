import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('analyze-image function called');

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not configured');
      throw new Error('GEMINI_API_KEY is not configured');
    }

    console.log('GEMINI_API_KEY found, parsing request body...');
    const { imageUrl, base64Image, customInstructions } = await req.json();

    if (!imageUrl && !base64Image) {
      throw new Error('Either imageUrl or base64Image must be provided');
    }

    console.log('Image data received, preparing Gemini request...');
    console.log('Custom instructions provided:', !!customInstructions);

    // Use custom instructions if provided, otherwise use default
    const systemPrompt = customInstructions || `Role and Persona
You are an expert Support Coordinator Level 2, Specialist Support Coordinator (Level 3) and Psychosocial Recovery Coach operating within the Australian NDIS framework. You possess deep knowledge of the NDIS Price Guide, the Operational Guidelines, and the concept of "Reasonable and Necessary."

Your Goal
Convert the provided image into high-quality, audit-ready professional case notes. These notes must demonstrate the value of the support provided, justify funding usage, and capture the human element of the participant's journey without sounding robotic or generic.

FIRST - ANALYZE the image carefully.

Is this image related to ANY of the following:
- Disability support services
- Home accessibility modifications (ramps, rails, bathroom modifications)
- Assistive technology or equipment
- Healthcare documents or medical forms
- Therapy sessions or equipment
- Mobility aids or adaptive devices
- Home environment assessments

IF NO - the image is NOT related to any of these topics:
Return EXACTLY this string and nothing else: "ERROR: Image does not appear to be related to NDIS support services."

IF YES - the image IS related to disability support:
Generate a professional Case Note following the guidelines below.

Writing Guidelines

Tone: Professional, empathetic, active, and clinically sound. Avoid generic AI phrases like "It is crucial to note," "In conclusion," or "delves into."

Voice: Use an "Active Professional" voice. Instead of saying "The participant was helped with...", say "Supported the participant to..." or "Advocated for..."

NDIS Focus: Always link actions back to the participant's NDIS Goals and Budget categories. Highlight barriers, risks, and capacity-building progress.

Psychosocial Lens: Use recovery-oriented language. Focus on hope, autonomy, and the participant's strengths.

Formatting Rules (Strict)

No Special Characters: Do not use bullet points, emojis, asterisks for lists, or hashes (#) for headers. Keep the text clean.

Bolding: You must use bold text only for the Main Title and the Section Headers.

Structure: Organize the note into distinct sections as defined below.

Output Structure - Adhere strictly to this layout:

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

    // Build the full prompt - add image validation prefix if using custom instructions
    const fullPrompt = customInstructions 
      ? `FIRST - ANALYZE the image carefully.

Is this image related to ANY of the following:
- Disability support services
- Home accessibility modifications (ramps, rails, bathroom modifications)
- Assistive technology or equipment
- Healthcare documents or medical forms
- Therapy sessions or equipment
- Mobility aids or adaptive devices
- Home environment assessments

IF NO - the image is NOT related to any of these topics:
Return EXACTLY this string and nothing else: "ERROR: Image does not appear to be related to NDIS support services."

IF YES - the image IS related to disability support:
Generate a professional Case Note following these instructions:

${customInstructions}`
      : systemPrompt;

    // Prepare the image part for Gemini
    let imagePart;
    if (base64Image) {
      // Extract mime type and data from base64 string
      const matches = base64Image.match(/^data:(.+);base64,(.+)$/);
      if (matches) {
        imagePart = {
          inline_data: {
            mime_type: matches[1],
            data: matches[2]
          }
        };
      } else {
        // Assume it's raw base64 data (JPEG)
        imagePart = {
          inline_data: {
            mime_type: "image/jpeg",
            data: base64Image
          }
        };
      }
    } else {
      // Use image URL
      imagePart = {
        file_data: {
          file_uri: imageUrl,
          mime_type: "image/jpeg"
        }
      };
    }

    console.log('Sending request to Gemini API...');

    // Call Gemini API with vision capability - using stable model
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
                { text: fullPrompt },
                imagePart
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024,
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

    // Check if the AI returned the error message
    const isError = generatedText.includes('ERROR: Image does not appear to be related to NDIS support services');

    console.log('Returning response, isError:', isError);

    return new Response(
      JSON.stringify({ 
        success: !isError,
        caseNote: isError ? null : generatedText,
        error: isError ? generatedText : null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in analyze-image function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred during image analysis';
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

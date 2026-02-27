import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BudgetAlertRequest {
  budgetId: string;
  participantName: string;
  participantEmail?: string;
  totalBudget: number;
  spentAmount: number;
  safeRunRate: number;
  actualRunRate: number;
  daysRemaining: number;
  projectedDepletionDate?: string;
  alertType: 'overspending' | 'critical' | 'warning';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify Resend API key is configured
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured in Supabase secrets');
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
    const requestData: BudgetAlertRequest = await req.json();

    // Validate required fields
    if (!requestData.budgetId || !requestData.participantName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Calculate alert details
    const percentageSpent = (requestData.spentAmount / requestData.totalBudget) * 100;
    const overspendingRate = ((requestData.actualRunRate - requestData.safeRunRate) / requestData.safeRunRate) * 100;

    // Determine alert severity
    let alertSeverity = 'Info';
    let alertColor = '#3b82f6'; // Blue
    if (requestData.alertType === 'critical') {
      alertSeverity = 'Critical';
      alertColor = '#ef4444'; // Red
    } else if (requestData.alertType === 'overspending') {
      alertSeverity = 'Warning';
      alertColor = '#f59e0b'; // Orange
    }

    // Get user email
    const userEmail = requestData.participantEmail || user.email;
    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: 'No email address available for user' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Prepare email content
    const emailSubject = `[${alertSeverity}] NDIS Budget Alert - ${requestData.participantName}`;
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NDIS Budget Alert</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #8A2BE2 0%, #00D9FF 100%); padding: 32px 24px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">CareAxis</h1>
      <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 14px; opacity: 0.9;">Budget Monitoring Alert</p>
    </div>

    <!-- Alert Badge -->
    <div style="padding: 24px; text-align: center; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
      <div style="display: inline-block; padding: 8px 16px; background-color: ${alertColor}; color: #ffffff; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
        ${alertSeverity} Alert
      </div>
    </div>

    <!-- Content -->
    <div style="padding: 32px 24px;">
      <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 20px; font-weight: 600;">Budget Alert for ${requestData.participantName}</h2>

      <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
        ${requestData.alertType === 'critical'
          ? 'Your budget is critically low and may run out before the plan end date.'
          : requestData.alertType === 'overspending'
          ? 'Your current spending rate is higher than the safe run rate, which may cause budget depletion before the plan ends.'
          : 'This is a budget status notification.'}
      </p>

      <!-- Budget Summary -->
      <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 16px 0; color: #374151; font-size: 16px; font-weight: 600;">Budget Summary</h3>

        <div style="margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #6b7280; font-size: 14px;">Total Budget:</span>
            <span style="color: #111827; font-size: 14px; font-weight: 600;">$${requestData.totalBudget.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #6b7280; font-size: 14px;">Amount Spent:</span>
            <span style="color: #111827; font-size: 14px; font-weight: 600;">$${requestData.spentAmount.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #6b7280; font-size: 14px;">Percentage Used:</span>
            <span style="color: ${percentageSpent > 90 ? alertColor : '#111827'}; font-size: 14px; font-weight: 600;">${percentageSpent.toFixed(1)}%</span>
          </div>
        </div>

        <!-- Progress Bar -->
        <div style="width: 100%; height: 8px; background-color: #e5e7eb; border-radius: 4px; overflow: hidden; margin-top: 8px;">
          <div style="width: ${Math.min(percentageSpent, 100)}%; height: 100%; background-color: ${alertColor}; transition: width 0.3s ease;"></div>
        </div>
      </div>

      <!-- Spending Rate -->
      <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 16px 0; color: #374151; font-size: 16px; font-weight: 600;">Spending Rate Analysis</h3>

        <div style="margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #6b7280; font-size: 14px;">Safe Run Rate:</span>
            <span style="color: #111827; font-size: 14px; font-weight: 600;">$${requestData.safeRunRate.toFixed(2)}/day</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #6b7280; font-size: 14px;">Actual Run Rate:</span>
            <span style="color: ${overspendingRate > 5 ? alertColor : '#111827'}; font-size: 14px; font-weight: 600;">$${requestData.actualRunRate.toFixed(2)}/day</span>
          </div>
          ${overspendingRate > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #6b7280; font-size: 14px;">Overspending Rate:</span>
            <span style="color: ${alertColor}; font-size: 14px; font-weight: 600;">+${overspendingRate.toFixed(1)}%</span>
          </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #6b7280; font-size: 14px;">Days Remaining:</span>
            <span style="color: #111827; font-size: 14px; font-weight: 600;">${requestData.daysRemaining} days</span>
          </div>
          ${requestData.projectedDepletionDate ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #6b7280; font-size: 14px;">Projected Depletion:</span>
            <span style="color: ${alertColor}; font-size: 14px; font-weight: 600;">${new Date(requestData.projectedDepletionDate).toLocaleDateString()}</span>
          </div>
          ` : ''}
        </div>
      </div>

      <!-- Recommendations -->
      <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
        <h4 style="margin: 0 0 8px 0; color: #1e40af; font-size: 14px; font-weight: 600;">Recommendations</h4>
        <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.6;">
          ${requestData.alertType === 'critical'
            ? `
            <li>Review spending immediately with your support coordinator</li>
            <li>Identify non-essential supports that can be reduced or delayed</li>
            <li>Consider requesting a plan review if necessary</li>
            `
            : requestData.alertType === 'overspending'
            ? `
            <li>Review current spending patterns and identify areas to reduce</li>
            <li>Discuss with your support coordinator about optimizing supports</li>
            <li>Monitor spending more frequently to stay on track</li>
            `
            : `
            <li>Continue monitoring your budget regularly</li>
            <li>Maintain current spending rate to ensure budget lasts until plan end</li>
            `}
        </ul>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin-top: 32px;">
        <a href="${Deno.env.get('VITE_APP_URL') || 'https://careaxis.app'}/budget-forecaster" style="display: inline-block; padding: 12px 32px; background-color: #8A2BE2; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
          View Budget Details
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px;">
        This is an automated alert from CareAxis Budget Forecaster
      </p>
      <p style="margin: 0; color: #9ca3af; font-size: 11px;">
        &copy; ${new Date().getFullYear()} CareAxis. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    // Send email via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'CareAxis <onboarding@resend.dev>',
        to: [userEmail],
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text();
      throw new Error(`Resend API error: ${errorData}`);
    }

    const resendData = await resendResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Budget alert email sent successfully',
        emailId: resendData.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in send-budget-alert function:', error);
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

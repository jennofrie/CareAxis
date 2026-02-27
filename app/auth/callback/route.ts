import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Handles Supabase email confirmation and magic link callbacks.
// Supabase redirects here after the user clicks the link in their email.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Something went wrong — redirect to auth with an error hint
  return NextResponse.redirect(`${origin}/auth?error=confirmation_failed`);
}

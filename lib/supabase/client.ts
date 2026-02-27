import { createBrowserClient } from "@supabase/ssr";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return browserClient;
}

/**
 * Invoke a Supabase Edge Function with the current user's session token
 * explicitly in the Authorization header.
 * Use this for functions that do their own JWT auth check (verify_jwt = true).
 */
export async function invokeWithAuth(
  fnName: string,
  options?: { body?: Record<string, unknown>; headers?: Record<string, string> }
) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return supabase.functions.invoke(fnName, {
    body: options?.body,
    headers: {
      ...(options?.headers ?? {}),
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
  });
}

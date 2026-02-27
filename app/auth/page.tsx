"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Mail,
  Lock,
  Loader2,
  Sparkles,
} from "lucide-react";

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("error") === "unauthorized") {
      setError(
        "Access restricted to CDSSVIC staff. Contact your administrator."
      );
    }
  }, [searchParams]);

  async function handleSignIn() {
    setError(null);
    setLoading(true);

    try {
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        if (signInError.message.includes("Email not confirmed")) {
          setError(
            "Your email has not been confirmed yet. Please check your inbox."
          );
        } else if (signInError.message.includes("Invalid login credentials")) {
          setError("Invalid email or password. Please try again.");
        } else {
          setError(signInError.message);
        }
        return;
      }

      if (data.user && !data.user.email?.endsWith("@cdssvic.com.au")) {
        await supabase.auth.signOut();
        setError(
          "Access restricted to CDSSVIC staff. Contact your administrator."
        );
        return;
      }

      router.refresh();
      router.push("/dashboard");
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSignIn();
  }

  return (
    <div className="w-full max-w-md">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Sign in to your CDSSVIC CareAxis account
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@cdssvic.com.au"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 transition-colors"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed transition-shadow"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
        By continuing, you agree to CareAxis&apos;s{" "}
        <span className="underline underline-offset-2 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">
          Terms of Service
        </span>{" "}
        and{" "}
        <span className="underline underline-offset-2 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">
          Privacy Policy
        </span>
        .
      </p>
    </div>
  );
}

export default function AuthPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-16 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-[500px] w-[500px] animate-pulse rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[400px] w-[400px] animate-pulse rounded-full bg-purple-500/10 blur-3xl [animation-delay:1s]" />
        <div className="absolute top-1/3 left-1/2 h-[300px] w-[300px] animate-pulse rounded-full bg-indigo-400/5 blur-3xl [animation-delay:2s]" />
      </div>
      <Suspense fallback={<div className="w-full max-w-md animate-pulse h-96 rounded-2xl bg-slate-200 dark:bg-slate-800" />}>
        <AuthForm />
      </Suspense>
    </div>
  );
}

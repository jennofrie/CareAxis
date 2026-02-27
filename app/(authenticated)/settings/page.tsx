"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { usePermissions } from "@/hooks/usePermissions";
import { useTheme } from "@/components/providers/ThemeProvider";
import { createClient } from "@/lib/supabase/client";
import {
  User,
  Mail,
  Sun,
  Moon,
  LogOut,
  Shield,
} from "lucide-react";

export default function SettingsPage() {
  const {
    isSuperAdmin,
    userEmail,
    isLoading: permLoading,
  } = usePermissions();
  const { theme, setTheme } = useTheme();
  const supabase = createClient();

  const [email, setEmail] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    setEmail(userEmail);
  }, [userEmail]);

  async function handleSignOut() {
    setIsSigningOut(true);
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  if (permLoading) {
    return (
      <>
        <Header title="Settings" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-slate-400 dark:text-slate-500 text-sm">
            Loading...
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Settings" />
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* User Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-500" />
                Profile
              </CardTitle>
              <CardDescription>Your account information.</CardDescription>
            </CardHeader>

            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  <Mail className="w-4 h-4" />
                  Email Address
                </label>
                <div className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-600 dark:text-slate-400">
                  {email || "Loading..."}
                </div>
              </div>

              {isSuperAdmin && (
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-500" />
                  <Badge variant="premium">Super Admin</Badge>
                </div>
              )}
            </div>
          </Card>

          {/* Theme */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {theme === "dark" ? (
                  <Moon className="w-5 h-5 text-indigo-500" />
                ) : (
                  <Sun className="w-5 h-5 text-indigo-500" />
                )}
                Appearance
              </CardTitle>
              <CardDescription>Customize your visual preferences.</CardDescription>
            </CardHeader>

            <div className="flex gap-3">
              <button
                onClick={() => setTheme("light")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                  theme === "light"
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 dark:text-indigo-400"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <Sun className="w-5 h-5" />
                <span className="text-sm font-medium">Light</span>
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                  theme === "dark"
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 dark:text-indigo-400"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <Moon className="w-5 h-5" />
                <span className="text-sm font-medium">Dark</span>
              </button>
            </div>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200 dark:border-red-900/30">
            <CardHeader>
              <CardTitle className="text-red-600 dark:text-red-400">
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible actions for your account.
              </CardDescription>
            </CardHeader>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Sign Out
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sign out of your CareAxis account on this device.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleSignOut}
                disabled={isSigningOut}
              >
                <LogOut className="w-4 h-4 mr-1.5" />
                {isSigningOut ? "Signing out..." : "Sign Out"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

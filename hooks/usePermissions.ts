"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const SUPER_ADMIN_EMAIL = "daguiljennofrie@gmail.com";
const CHECK_DEBOUNCE_MS = 5000;

interface Permissions {
  canAccessCaseNotes: boolean;
  canAccessReportSynthesizer: boolean;
  canAccessFutureFeatures: boolean;
  canAccessBudgetForecaster: boolean;
  canAccessJustificationDrafter: boolean;
  canAccessSeniorPlanner: boolean;
  canAccessPlanManagementExpert: boolean;
  canAccessRAGAgent: boolean;
  isSuperAdmin: boolean;
  userEmail: string | null;
  isLoading: boolean;
  refreshSubscription: () => Promise<void>;
}

export function usePermissions(): Permissions {
  const hasInitialized = useRef(false);
  const lastCheckTime = useRef(0);
  const supabase = createClient();

  const [permissions, setPermissions] = useState<Permissions>({
    canAccessCaseNotes: false,
    canAccessReportSynthesizer: false,
    canAccessFutureFeatures: false,
    canAccessBudgetForecaster: false,
    canAccessJustificationDrafter: false,
    canAccessSeniorPlanner: false,
    canAccessPlanManagementExpert: false,
    canAccessRAGAgent: false,
    isSuperAdmin: false,
    userEmail: null,
    isLoading: true,
    refreshSubscription: async () => {},
  });

  const checkPermissions = useCallback(
    async (force = false) => {
      const now = Date.now();
      if (!force && now - lastCheckTime.current < CHECK_DEBOUNCE_MS) return;
      lastCheckTime.current = now;

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setPermissions((prev) => ({
            ...prev,
            isLoading: false,
            canAccessCaseNotes: false,
            canAccessReportSynthesizer: false,
            canAccessFutureFeatures: false,
            canAccessBudgetForecaster: false,
            canAccessJustificationDrafter: false,
            canAccessSeniorPlanner: false,
            canAccessPlanManagementExpert: false,
            canAccessRAGAgent: false,
            isSuperAdmin: false,
            userEmail: null,
          }));
          return;
        }

        const userEmail = user.email || null;
        const isSuperAdmin =
          userEmail?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

        // Ensure the user has a profile row (the DB trigger should create one on
        // signup, but upsert as a safety net).  We use onConflict so that if the
        // row already exists, we only touch updated_at — never downgrade the tier.
        try {
          await supabase.from("profiles").upsert(
            {
              id: user.id,
              subscription_tier: "premium",
            },
            { onConflict: "id", ignoreDuplicates: true }
          );
        } catch {
          // profiles table may not exist yet or RLS blocks the insert — non-fatal
        }

        // All authenticated users get full access
        setPermissions((prev) => ({
          ...prev,
          canAccessCaseNotes: true,
          canAccessReportSynthesizer: true,
          canAccessFutureFeatures: true,
          canAccessBudgetForecaster: true,
          canAccessJustificationDrafter: true,
          canAccessSeniorPlanner: true,
          canAccessPlanManagementExpert: true,
          canAccessRAGAgent: isSuperAdmin,
          isSuperAdmin,
          userEmail,
          isLoading: false,
        }));
      } catch {
        setPermissions((prev) => ({
          ...prev,
          isLoading: false,
          userEmail: null,
        }));
      }
    },
    [supabase]
  );

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      checkPermissions(true);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkPermissions();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [checkPermissions, supabase.auth]);

  const refreshSubscription = useCallback(async () => {
    await checkPermissions(true);
  }, [checkPermissions]);

  return { ...permissions, refreshSubscription };
}

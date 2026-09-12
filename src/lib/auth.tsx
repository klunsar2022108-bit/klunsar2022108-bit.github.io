import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  normalizeApprovalStatus,
  normalizeRole,
  pickPrimaryRole,
  type WorkflowRole,
} from "@/lib/workflow";

type AuthValue = {
  user: User | null;
  session: Session | null;
  role: WorkflowRole | null;
  approvalStatus: string;
  accountStatus: string;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
};

const ROLE_STORAGE_KEY = "klunsar-user-role";
const APPROVAL_STORAGE_KEY = "klunsar-approval-status";

const AuthContext = createContext<AuthValue>({
  user: null,
  session: null,
  role: null,
  approvalStatus: "pending",
  accountStatus: "active",
  isAdmin: false,
  loading: true,
  signOut: async () => {},
});

function readStoredRole(): WorkflowRole | null {
  if (typeof window === "undefined") return null;
  return normalizeRole(window.localStorage.getItem(ROLE_STORAGE_KEY));
}

function readStoredApprovalStatus(): string {
  if (typeof window === "undefined") return "pending";
  const value = window.localStorage.getItem(APPROVAL_STORAGE_KEY);
  return normalizeApprovalStatus(value);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<WorkflowRole | null>(readStoredRole());
  const [approvalStatus, setApprovalStatus] = useState<string>(readStoredApprovalStatus());
  const [accountStatus, setAccountStatus] = useState("active");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const applyAuthState = async (nextSession: Session | null) => {
      if (!active) return;

      const roleCandidates: unknown[] = [
        normalizeRole(nextSession?.user?.user_metadata?.role),
        normalizeRole(nextSession?.user?.app_metadata?.role),
        readStoredRole(),
      ];

      if (nextSession?.user?.id) {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", nextSession.user.id);

        if (!active) return;

        roleCandidates.push(...(data ?? []).map((item) => item.role));
      }

      const nextRole = pickPrimaryRole(roleCandidates) ?? "student";
      const rawApproval =
        normalizeApprovalStatus(nextSession?.user?.user_metadata?.approval_status, nextRole) ||
        normalizeApprovalStatus(nextSession?.user?.app_metadata?.approval_status, nextRole) ||
        normalizeApprovalStatus(readStoredApprovalStatus(), nextRole);
      const nextApproval = rawApproval || "pending";

      if (typeof window !== "undefined") {
        if (nextRole) window.localStorage.setItem(ROLE_STORAGE_KEY, nextRole);
        else window.localStorage.removeItem(ROLE_STORAGE_KEY);
        window.localStorage.setItem(APPROVAL_STORAGE_KEY, nextApproval);
      }

      setSession(nextSession);
      setRole(nextRole);
      setApprovalStatus(nextApproval);
      setIsAdmin(
        nextRole === "admin" ||
          nextRole === "super_admin" ||
          nextSession?.user?.email === "klunsar@gmail.com",
      );
      setLoading(false);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void applyAuthState(nextSession);
    });

    void supabase.auth.getSession().then(({ data }) => {
      void applyAuthState(data.session);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user?.id) {
      setAccountStatus("active");
      return;
    }
    let active = true;
    void supabase
      .from("profiles")
      .select("account_status, approval_status")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active || !data) return;
        const nextRole = role ?? "student";
        const shouldBypassApproval = nextRole === "admin" || nextRole === "super_admin";

        setAccountStatus(data.account_status ?? "active");
        setApprovalStatus(shouldBypassApproval ? "approved" : data.approval_status ?? "pending");
        if (data.account_status === "deactivated") void supabase.auth.signOut();
      });
    return () => {
      active = false;
    };
  }, [session?.user?.id]);

  const value = useMemo<AuthValue>(
    () => ({
      user: session?.user ?? null,
      session,
      role,
      approvalStatus,
      accountStatus,
      isAdmin,
      loading,
      signOut: async () => {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(ROLE_STORAGE_KEY);
          window.localStorage.removeItem(APPROVAL_STORAGE_KEY);
        }
        await supabase.auth.signOut();
      },
    }),
    [session, role, approvalStatus, accountStatus, isAdmin, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

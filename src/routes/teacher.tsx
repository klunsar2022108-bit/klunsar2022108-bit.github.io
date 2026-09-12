import { createFileRoute, redirect } from "@tanstack/react-router";
import { DashboardPage } from "@/routes/dashboard";
import { supabase } from "@/integrations/supabase/client";
import { getDashboardPath, normalizeRole, pickPrimaryRole } from "@/lib/workflow";

export const Route = createFileRoute("/teacher")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/auth" });

    const { data: roleRows = [] } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);

    const userRole = pickPrimaryRole([
      normalizeRole(session.user.user_metadata?.role),
      normalizeRole(session.user.app_metadata?.role),
      ...(roleRows ?? []).map((row) => row.role),
    ]);

    if (!userRole || userRole !== "teacher") {
      throw redirect({ to: userRole ? getDashboardPath(userRole) : "/auth" });
    }
  },
  head: () => ({
    meta: [{ title: "Teacher Dashboard | K-Lunsar Computer Training" }],
  }),
  component: DashboardPage,
});

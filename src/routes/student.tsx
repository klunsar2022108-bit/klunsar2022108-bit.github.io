import { createFileRoute, redirect } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDashboardPath, normalizeRole, pickPrimaryRole } from "@/lib/workflow";

const DashboardPage = lazy(() =>
  import("./dashboard").then(({ DashboardPage }) => ({ default: DashboardPage })),
);

function StudentDashboard() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-14">Loading dashboard...</div>}>
      <DashboardPage />
    </Suspense>
  );
}

export const Route = createFileRoute("/student")({
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

    if (!userRole || userRole !== "student") {
      throw redirect({ to: userRole ? getDashboardPath(userRole) : "/auth" });
    }
  },
  head: () => ({
    meta: [{ title: "Student Dashboard | K-Lunsar Computer Training" }],
  }),
  component: StudentDashboard,
});

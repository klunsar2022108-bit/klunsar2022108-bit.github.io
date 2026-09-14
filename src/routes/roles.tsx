import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ShieldCheck, UserCog } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { getDashboardPath, normalizeRole, pickPrimaryRole } from "@/lib/workflow";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const Route = createFileRoute("/roles")({
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
    if (!userRole || userRole !== "super_admin")
      throw redirect({ to: userRole ? getDashboardPath(userRole) : "/auth" });
  },
  head: () => ({ meta: [{ title: "Role Management | K-Lunsar Computer Training" }] }),
  component: RolesPage,
});

function RolesPage() {
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const { data: users = [], refetch } = useQuery({
    queryKey: ["super-admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, account_status, approval_status, user_roles(role)")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const updateRole = async (userId: string) => {
    const role = selectedRoles[userId];
    if (!role) return;
    const { error } = await supabase.rpc("set_user_role", { _user_id: userId, _role: role });
    if (error) toast.error(error.message);
    else {
      toast.success("Role granted and audited.");
      await refetch();
    }
  };

  const requestPasswordReset = async (userId: string) => {
    const { error } = await supabase.functions.invoke("admin-reset-password", {
      body: { userId, redirectTo: `${window.location.origin}/auth` },
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset email sent.");
  };

  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-12">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Super Admin
            </p>
            <h1 className="text-4xl font-bold">Role and account management</h1>
          </div>
        </div>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Role changes are executed server-side, audited, and restricted to Super Admin accounts.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {users.map((user) => {
            const currentRoles = Array.isArray(user.user_roles)
              ? user.user_roles.map((item: { role: string }) => item.role).join(", ")
              : "none";
            return (
              <Card key={user.id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <UserCog className="h-5 w-5 text-primary" />
                      <h2 className="font-bold">{user.full_name ?? user.email ?? user.id}</h2>
                    </div>
                    <Badge
                      variant={user.account_status === "deactivated" ? "destructive" : "secondary"}
                    >
                      {user.account_status ?? "active"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">Current roles: {currentRoles}</p>
                  <p className="text-xs text-muted-foreground">
                    Approval: {user.approval_status ?? "pending"}
                  </p>
                  <div className="flex gap-2">
                    <select
                      value={selectedRoles[user.id] ?? ""}
                      onChange={(event) =>
                        setSelectedRoles((current) => ({
                          ...current,
                          [user.id]: event.target.value,
                        }))
                      }
                      className="h-9 flex-1 rounded-md border bg-background px-2 text-sm"
                    >
                      <option value="">Grant role</option>
                      <option value="customer">Customer</option>
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                    <Button
                      size="sm"
                      onClick={() => void updateRole(user.id)}
                      disabled={!selectedRoles[user.id]}
                    >
                      Apply
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => void requestPasswordReset(user.id)}
                  >
                    Record password reset request
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardShell>
  );
}

import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ClipboardList, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { getDashboardPath, normalizeRole, pickPrimaryRole } from "@/lib/workflow";

type ApprovalItem = {
  id: string;
  type: string;
  submittedBy: string;
  date: string;
  record: string;
  evidence: string;
  action: "account" | "order" | "asset" | "expense" | "registration" | "shift" | "result";
};

export const Route = createFileRoute("/approvals")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/auth" });
    const { data: roleRows = [] } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);
    const role = pickPrimaryRole([
      normalizeRole(session.user.user_metadata?.role),
      normalizeRole(session.user.app_metadata?.role),
      ...(roleRows ?? []).map((row) => row.role),
    ]);
    if (!role || !["admin", "super_admin"].includes(role)) {
      throw redirect({ to: role ? getDashboardPath(role) : "/auth" });
    }
  },
  head: () => ({ meta: [{ title: "Approval Centre | K-Lunsar Computer Training" }] }),
  component: ApprovalsPage,
});

function ApprovalsPage() {
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["approval-centre"],
    queryFn: async (): Promise<ApprovalItem[]> => {
      const [accounts, orders, registrations, transfers, expenses, shifts, results] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("id, full_name, email, created_at")
            .eq("approval_status", "pending"),
          supabase
            .from("orders")
            .select("id, customer_name, total, created_at")
            .in("status", ["pending", "pending_approval"]),
          supabase
            .from("enrollments")
            .select("id, user_id, path, created_at, profiles(full_name)")
            .in("status", ["pending", "submitted"]),
          supabase
            .from("asset_transfers")
            .select("id, reason, status, created_at, assets(asset_id, name)")
            .in("status", ["pending", "disputed"]),
          supabase
            .from("expenses")
            .select("id, category, amount, created_at")
            .eq("approval_status", "pending"),
          supabase
            .from("shift_requests")
            .select("id, user_id, reason, created_at")
            .eq("status", "pending"),
          supabase
            .from("result_submissions")
            .select("id, student_id, score, feedback, created_at")
            .eq("status", "pending_review"),
        ]);

      return [
        ...(accounts.data ?? []).map((row) => ({
          id: row.id,
          type: "Account approval",
          submittedBy: row.email ?? row.full_name ?? row.id,
          date: row.created_at,
          record: row.full_name ?? "New account",
          evidence: "Registration profile",
          action: "account" as const,
        })),
        ...(orders.data ?? []).map((row) => ({
          id: row.id,
          type: "Order / payment",
          submittedBy: row.customer_name ?? "Customer",
          date: row.created_at,
          record: `Le ${Number(row.total ?? 0).toLocaleString()}`,
          evidence: "Order record and payment proof",
          action: "order" as const,
        })),
        ...(registrations.data ?? []).map((row) => ({
          id: row.id,
          type: "Student registration",
          submittedBy: (row.profiles as { full_name?: string } | null)?.full_name ?? row.user_id,
          date: row.created_at,
          record: row.path,
          evidence: "Programme registration",
          action: "registration" as const,
        })),
        ...(transfers.data ?? []).map((row) => ({
          id: row.id,
          type: "Asset handover",
          submittedBy: "Custodian",
          date: row.created_at,
          record: `${(row.assets as { asset_id?: string; name?: string } | null)?.asset_id ?? "Asset"} - ${(row.assets as { name?: string } | null)?.name ?? ""}`,
          evidence: row.reason || "Custody transfer request",
          action: "asset" as const,
        })),
        ...(expenses.data ?? []).map((row) => ({
          id: row.id,
          type: "Expense approval",
          submittedBy: "Admin",
          date: row.created_at,
          record: `Le ${Number(row.amount ?? 0).toLocaleString()} - ${row.category}`,
          evidence: "Expense record",
          action: "expense" as const,
        })),
        ...(shifts.data ?? []).map((row) => ({
          id: row.id,
          type: "Shift-change request",
          submittedBy: row.user_id,
          date: row.created_at,
          record: row.reason,
          evidence: "Student request",
          action: "shift" as const,
        })),
        ...(results.data ?? []).map((row) => ({
          id: row.id,
          type: "Academic result",
          submittedBy: row.student_id,
          date: row.created_at,
          record: `${row.score ?? "Pending"}% - ${row.feedback || "Teacher submission"}`,
          evidence: "Teacher-submitted result",
          action: "result" as const,
        })),
      ].sort((left, right) => right.date.localeCompare(left.date));
    },
  });

  const review = async (item: ApprovalItem, approved: boolean) => {
    const reason = approved ? "" : (window.prompt("Rejection reason") ?? "");
    if (!approved && !reason.trim()) return;
    setBusyId(item.id);
    let error: { message: string } | null = null;

    if (item.action === "account") {
      ({ error } = await supabase
        .from("profiles")
        .update({
          approval_status: approved ? "approved" : "rejected",
          rejection_reason: reason || null,
        })
        .eq("id", item.id));
    } else if (item.action === "order") {
      const result = await supabase.rpc("transition_order_status", {
        _order_id: item.id,
        _next_status: approved ? "approved" : "rejected",
        _reason: reason,
      });
      error = result.error;
    } else if (item.action === "asset") {
      const result = await supabase.rpc("approve_asset_transfer", {
        _transfer_id: item.id,
        _approved: approved,
        _reason: reason,
      });
      error = result.error;
    } else if (item.action === "expense") {
      ({ error } = await supabase
        .from("expenses")
        .update({ approval_status: approved ? "approved" : "rejected" })
        .eq("id", item.id));
    } else if (item.action === "registration") {
      ({ error } = await supabase
        .from("enrollments")
        .update({ status: approved ? "approved" : "rejected" })
        .eq("id", item.id));
    } else if (item.action === "shift") {
      ({ error } = await supabase
        .from("shift_requests")
        .update({ status: approved ? "approved" : "rejected", rejection_reason: reason || null })
        .eq("id", item.id));
    } else {
      const result = await supabase.rpc("review_result_submission", {
        _submission_id: item.id,
        _decision: approved ? "published" : "rejected",
        _reason: reason,
      });
      error = result.error;
    }

    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(approved ? "Approval completed." : "Request rejected.");
    await queryClient.invalidateQueries({ queryKey: ["approval-centre"] });
  };

  return (
    <DashboardShell>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-8 sm:py-12">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ClipboardList className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Operations
            </p>
            <h1 className="mt-2 text-4xl font-bold">Approval Centre</h1>
            <p className="mt-2 text-muted-foreground">
              One queue for accounts, orders, registrations, assets, expenses and shift requests.
            </p>
          </div>
        </div>
        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Pending actions</h2>
              <Badge variant="secondary">{items.length} pending</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading approval queue...</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing is waiting for review.</p>
            ) : (
              items.map((item) => (
                <div
                  key={`${item.action}-${item.id}`}
                  className="grid gap-4 rounded-xl border border-border p-4 lg:grid-cols-[1.1fr_1.1fr_1fr_auto] lg:items-center"
                >
                  <div>
                    <Badge variant="outline">{item.type}</Badge>
                    <p className="mt-2 font-medium">{item.record}</p>
                  </div>
                  <div className="text-sm">
                    <p>{item.submittedBy}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.date).toLocaleString()}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">Evidence: {item.evidence}</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => void review(item, true)}
                      disabled={busyId === item.id}
                    >
                      <Check className="mr-1 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => void review(item, false)}
                      disabled={busyId === item.id}
                    >
                      <X className="mr-1 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

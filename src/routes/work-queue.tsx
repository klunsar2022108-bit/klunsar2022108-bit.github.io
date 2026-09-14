import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ClipboardList,
  Package,
  ShieldCheck,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { getDashboardPath, normalizeRole, pickPrimaryRole } from "@/lib/workflow";

export const Route = createFileRoute("/work-queue")({
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
  head: () => ({ meta: [{ title: "System Inbox | K-Lunsar Computer Training" }] }),
  component: WorkQueuePage,
});

type WorkItem = {
  label: string;
  detail: string;
  count: number;
  href: "/approvals" | "/admin" | "/operations" | "/reports" | "/assets";
  icon: typeof ClipboardList;
  tone: string;
};

function WorkQueuePage() {
  const { data: counts } = useQuery({
    queryKey: ["system-work-queue"],
    queryFn: async () => {
      const [
        payments,
        accounts,
        registrations,
        orders,
        transfers,
        expenses,
        lowStock,
        deliveries,
        results,
      ] = await Promise.all([
        supabase
          .from("order_payments")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("approval_status", "pending"),
        supabase
          .from("enrollments")
          .select("id", { count: "exact", head: true })
          .in("status", ["pending", "submitted"]),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .in("status", ["pending", "pending_approval"]),
        supabase
          .from("asset_transfers")
          .select("id", { count: "exact", head: true })
          .in("status", ["pending", "disputed"]),
        supabase
          .from("expenses")
          .select("id", { count: "exact", head: true })
          .eq("approval_status", "pending"),
        supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .not("stock_quantity", "is", null),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .in("status", ["ready", "shipped", "out_for_delivery"]),
        supabase
          .from("result_submissions")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending_review"),
      ]);
      return {
        payments: payments.count ?? 0,
        accounts: accounts.count ?? 0,
        registrations: registrations.count ?? 0,
        orders: orders.count ?? 0,
        transfers: transfers.count ?? 0,
        expenses: expenses.count ?? 0,
        lowStock: lowStock.count ?? 0,
        deliveries: deliveries.count ?? 0,
        results: results.count ?? 0,
      };
    },
  });

  const items: WorkItem[] = [
    {
      label: "Payments awaiting verification",
      detail: "Review proofs and approve or reject transactions.",
      count: counts?.payments ?? 0,
      href: "/approvals",
      icon: Wallet,
      tone: "text-emerald-700 bg-emerald-50",
    },
    {
      label: "Students awaiting approval",
      detail: "Review account registrations and programme requests.",
      count: (counts?.accounts ?? 0) + (counts?.registrations ?? 0),
      href: "/approvals",
      icon: Users,
      tone: "text-blue-700 bg-blue-50",
    },
    {
      label: "Orders awaiting approval",
      detail: "Move approved orders into fulfilment.",
      count: counts?.orders ?? 0,
      href: "/approvals",
      icon: ClipboardList,
      tone: "text-amber-700 bg-amber-50",
    },
    {
      label: "Asset handovers",
      detail: "Confirm custody requests before ownership changes.",
      count: counts?.transfers ?? 0,
      href: "/approvals",
      icon: Package,
      tone: "text-violet-700 bg-violet-50",
    },
    {
      label: "Expense approvals",
      detail: "Review pending expenses and financial controls.",
      count: counts?.expenses ?? 0,
      href: "/approvals",
      icon: ShieldCheck,
      tone: "text-rose-700 bg-rose-50",
    },
    {
      label: "Orders ready for delivery",
      detail: "Update delivery status and notify customers.",
      count: counts?.deliveries ?? 0,
      href: "/admin",
      icon: Truck,
      tone: "text-cyan-700 bg-cyan-50",
    },
    {
      label: "Low-stock review",
      detail: "Inspect products approaching their reorder threshold.",
      count: counts?.lowStock ?? 0,
      href: "/reports",
      icon: Package,
      tone: "text-orange-700 bg-orange-50",
    },
    {
      label: "Results awaiting review",
      detail: "Review teacher-submitted academic results.",
      count: counts?.results ?? 0,
      href: "/admin",
      icon: ShieldCheck,
      tone: "text-indigo-700 bg-indigo-50",
    },
  ];

  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-12">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ClipboardList className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Operations
            </p>
            <h1 className="mt-2 text-4xl font-bold">System Inbox</h1>
            <p className="mt-2 text-muted-foreground">
              Action required across payments, training, commerce, assets and delivery.
            </p>
          </div>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.label} to={item.href} className="group">
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader className="flex flex-row items-start justify-between gap-3">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.tone}`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <Badge variant={item.count > 0 ? "default" : "secondary"}>{item.count}</Badge>
                  </CardHeader>
                  <CardContent>
                    <h2 className="font-semibold">{item.label}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                    <span className="mt-4 inline-flex items-center text-sm font-medium text-primary">
                      Review queue{" "}
                      <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </DashboardShell>
  );
}

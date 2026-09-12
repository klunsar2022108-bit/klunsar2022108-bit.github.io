import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { getDashboardPath, normalizeRole, pickPrimaryRole } from "@/lib/workflow";
import { toast } from "sonner";
import {
  BarChart3,
  DollarSign,
  ShieldCheck,
  Truck,
  Users,
  Warehouse,
  BellRing,
  KeyRound,
} from "lucide-react";
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/super-admin")({
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

    if (!userRole || userRole !== "super_admin") {
      throw redirect({ to: userRole ? getDashboardPath(userRole) : "/auth" });
    }
  },
  head: () => ({
    meta: [{ title: "Super Admin Dashboard | K-Lunsar Computer Training" }],
  }),
  component: SuperAdminPage,
});

function SuperAdminPage() {
  const [selectedRoleByUser, setSelectedRoleByUser] = useState<Record<string, string>>({});

  const { data: financial } = useQuery({
    queryKey: ["super-admin-financial"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_financial_summary");
      if (error) throw new Error(error.message);
      return data?.[0] ?? { income: 0, expenditure: 0, profit: 0 };
    },
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["super-admin-sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_period_analytics")
        .select("period, revenue, sale_count")
        .order("period", { ascending: false })
        .limit(6);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const { data: users = [], refetch: refetchUsers } = useQuery({
    queryKey: ["super-admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, account_status, approval_status, user_roles(role)")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const { data: lowStockProducts = [] } = useQuery({
    queryKey: ["super-admin-low-stock"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, stock_quantity, low_stock_threshold")
        .not("stock_quantity", "is", null)
        .order("stock_quantity");
      if (error) throw new Error(error.message);
      return (data ?? []).filter(
        (product) => (product.stock_quantity ?? 0) <= (product.low_stock_threshold ?? 0),
      );
    },
  });

  const { data: pendingOrders = [] } = useQuery({
    queryKey: ["super-admin-pending-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, customer_name, status, total, payment_status, created_at")
        .in("status", ["pending", "pending_approval", "processing"])
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const updateUserRole = async (userId: string) => {
    const role = selectedRoleByUser[userId];
    if (!role) return;

    const { error } = await supabase.rpc("set_user_role", { _user_id: userId, _role: role });
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Role updated and audited.");
    await refetchUsers();
  };

  const resetPassword = async (userId: string) => {
    const { error } = await supabase.functions.invoke("admin-reset-password", {
      body: { userId, redirectTo: `${window.location.origin}/auth` },
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Password reset email queued.");
  };

  const setAccountState = async (userId: string, status: "active" | "deactivated") => {
    const reason = status === "deactivated" ? (window.prompt("Reason for deactivation") ?? "") : "";
    if (status === "deactivated" && !reason.trim()) return;

    const { error } = await supabase.rpc("set_account_state", {
      _user_id: userId,
      _status: status,
      _reason: reason,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(status === "active" ? "Account reactivated." : "Account deactivated.");
    await refetchUsers();
  };

  const businessMetrics = [
    {
      label: "Income",
      value: `Le ${Number(financial?.income ?? 0).toLocaleString()}`,
      icon: DollarSign,
    },
    {
      label: "Expenditure",
      value: `Le ${Number(financial?.expenditure ?? 0).toLocaleString()}`,
      icon: BarChart3,
    },
    {
      label: "Profit",
      value: `Le ${Number(financial?.profit ?? 0).toLocaleString()}`,
      icon: ShieldCheck,
    },
    { label: "Active users", value: String(users.length), icon: Users },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-14">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Super Admin
          </p>
          <h1 className="mt-2 text-4xl font-bold">Business oversight dashboard</h1>
        </div>
        <div className="flex gap-2">
          <Link to="/roles">
            <Button variant="outline">Manage roles</Button>
          </Link>
          <Link to="/reports">
            <Button variant="outline">View analytics</Button>
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-4">
        {businessMetrics.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="border-border/70">
            <CardContent className="flex items-center gap-3 py-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-display text-lg font-semibold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/70">
          <CardHeader>
            <h2 className="font-display text-2xl font-bold">Revenue trend</h2>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sales}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <h2 className="font-display text-2xl font-bold">Operational priority</h2>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-foreground">Pending orders</span>
                <Badge variant="secondary">{pendingOrders.length}</Badge>
              </div>
              <p className="mt-1">
                Review and approve business transactions and customer orders promptly.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-foreground">Low-stock items</span>
                <Badge variant="secondary">{lowStockProducts.length}</Badge>
              </div>
              <p className="mt-1">
                Replenish stock and maintain product availability across the sales catalogue.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-foreground">Approvals</span>
                <Badge variant="secondary">Live</Badge>
              </div>
              <p className="mt-1">
                Monitor account, payment, student, and delivery approvals in one place.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card className="border-border/70">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-primary" />
              <h2 className="font-display text-2xl font-bold">Business workflow alerts</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {pendingOrders.length === 0 ? (
              <p className="text-muted-foreground">No pending orders. Sales activity is stable.</p>
            ) : (
              pendingOrders.map((order) => (
                <div key={order.id} className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{order.customer_name}</p>
                    <Badge variant="secondary">{order.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Payment: {order.payment_status} • Le {Number(order.total).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-primary" />
              <h2 className="font-display text-2xl font-bold">Stock watchlist</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {lowStockProducts.length === 0 ? (
              <p className="text-muted-foreground">
                All products are above their configured thresholds.
              </p>
            ) : (
              lowStockProducts.slice(0, 6).map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-background p-3"
                >
                  <div>
                    <p className="font-medium text-foreground">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Threshold: {product.low_stock_threshold ?? 0}
                    </p>
                  </div>
                  <Badge variant="secondary">{product.stock_quantity ?? 0} left</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-10 border-border/70">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl font-bold">Access control and user governance</h2>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {users.map((user) => {
            const currentRoles = Array.isArray(user.user_roles)
              ? (user.user_roles as Array<{ role: string }>).map((item) => item.role).join(", ")
              : "none";

            return (
              <div key={user.id} className="rounded-lg border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">
                      {user.full_name ?? user.email ?? "Unnamed user"}
                    </p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <Badge
                    variant={user.account_status === "deactivated" ? "destructive" : "secondary"}
                  >
                    {user.account_status ?? "active"}
                  </Badge>
                </div>

                <p className="mt-3 text-xs text-muted-foreground">Current roles: {currentRoles}</p>
                <p className="text-xs text-muted-foreground">
                  Approval: {user.approval_status ?? "pending"}
                </p>

                <div className="mt-3 grid gap-2">
                  <div className="flex gap-2">
                    <select
                      value={selectedRoleByUser[user.id] ?? ""}
                      onChange={(event) =>
                        setSelectedRoleByUser((current) => ({
                          ...current,
                          [user.id]: event.target.value,
                        }))
                      }
                      className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-xs"
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
                      onClick={() => void updateUserRole(user.id)}
                      disabled={!selectedRoleByUser[user.id]}
                    >
                      Apply
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => void resetPassword(user.id)}
                    >
                      <KeyRound className="mr-1 h-4 w-4" />
                      Reset
                    </Button>
                    <Button
                      size="sm"
                      variant={user.account_status === "deactivated" ? "default" : "destructive"}
                      className="flex-1"
                      onClick={() =>
                        void setAccountState(
                          user.id,
                          user.account_status === "deactivated" ? "active" : "deactivated",
                        )
                      }
                    >
                      {user.account_status === "deactivated" ? "Reactivate" : "Deactivate"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card className="border-border/70">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              <h2 className="font-display text-2xl font-bold">Delivery and fulfilment</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-lg border border-border bg-background p-3">
              Customer-provided delivery details remain visible to the admin for review and
              fulfilment updates.
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              Delivery status is configured centrally and can be advanced from processing to
              delivery without exposing restricted admin actions to ordinary users.
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              Delivery history and status changes are retained for audit and customer service
              follow-up.
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="font-display text-2xl font-bold">Role-security rules</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-lg border border-border bg-background p-3">
              Newly registered accounts stay restricted until admin approval passes, then the
              correct dashboard permissions are granted.
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              Deactivated accounts cannot log in or access protected functions because the account
              state is enforced in the auth and route guards.
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              Super Admin authority is separated from ordinary admin privileges so high-level role
              changes and sensitive analytics remain restricted to the super-admin role.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

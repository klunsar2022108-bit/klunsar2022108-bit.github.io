import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Download, GraduationCap, Package, Receipt, Truck, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { getDashboardPath, normalizeRole, pickPrimaryRole } from "@/lib/workflow";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const Route = createFileRoute("/reports")({
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
    if (!userRole || !["admin", "super_admin"].includes(userRole))
      throw redirect({ to: userRole ? getDashboardPath(userRole) : "/auth" });
  },
  head: () => ({ meta: [{ title: "Business Reports | K-Lunsar Computer Training" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const { data: financial } = useQuery({
    queryKey: ["financial-summary"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_financial_summary");
      if (error) throw new Error(error.message);
      return data?.[0] ?? { income: 0, expenditure: null, profit: null };
    },
  });
  const { data: sales = [] } = useQuery({
    queryKey: ["period-sales"],
    queryFn: async () =>
      (
        await supabase
          .from("sales_period_analytics")
          .select("period, period_type, sales_channel, sale_count, revenue")
          .order("period", { ascending: false })
          .limit(60)
      ).data ?? [],
  });
  const { data: products = [] } = useQuery({
    queryKey: ["product-sales"],
    queryFn: async () =>
      (
        await supabase
          .from("product_sales_analytics")
          .select("name, item_type, units_sold, revenue")
          .order("units_sold", { ascending: false })
      ).data ?? [],
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ["expense-report"],
    queryFn: async () =>
      (
        await supabase
          .from("expense_category_analytics")
          .select("category, period, expense_count, expenditure")
          .order("period", { ascending: false })
      ).data ?? [],
  });
  const { data: balances = [] } = useQuery({
    queryKey: ["outstanding-balances"],
    queryFn: async () =>
      (
        await supabase
          .from("outstanding_balance_analytics")
          .select("user_id, order_count, balance_due")
          .order("balance_due", { ascending: false })
      ).data ?? [],
  });
  const { data: academic = [] } = useQuery({
    queryKey: ["academic-report"],
    queryFn: async () =>
      (
        await supabase
          .from("academic_programme_analytics")
          .select(
            "programme, students, approved_registrations, completed_courses, average_progress",
          )
      ).data ?? [],
  });
  const { data: delivery = [] } = useQuery({
    queryKey: ["delivery-report"],
    queryFn: async () =>
      (await supabase.from("delivery_analytics").select("status, orders")).data ?? [],
  });
  const { data: orders = [] } = useQuery({
    queryKey: ["report-orders"],
    queryFn: async () =>
      (await supabase.from("orders").select("status, payment_status, total, created_at")).data ??
      [],
  });
  const { data: stock = [] } = useQuery({
    queryKey: ["report-stock"],
    queryFn: async () =>
      (
        await supabase
          .from("product_stock_analytics")
          .select("name, stock_quantity, is_low_stock")
          .order("stock_quantity")
      ).data ?? [],
  });

  const exportCsv = () => {
    const rows = [
      ["Period", "Period type", "Channel", "Sales", "Revenue"],
      ...sales.map((row) => [
        row.period,
        row.period_type,
        row.sales_channel,
        row.sale_count,
        row.revenue,
      ]),
    ];
    const csv = rows.map((row) => row.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "klunsar-business-report.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded.");
  };
  const pending = orders.filter((order) =>
    ["pending", "pending_approval"].includes(order.status),
  ).length;
  const approved = orders.filter((order) => order.payment_status === "approved").length;

  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-8 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Reports</p>
            <h1 className="mt-2 text-4xl font-bold">Business, academic and operations analytics</h1>
            <p className="mt-3 text-muted-foreground">
              Live role-scoped data from approved transactions, programmes, students, inventory and
              delivery.
            </p>
          </div>
          <Button onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" />
            Export sales CSV
          </Button>
        </div>
        <div className="grid gap-5 md:grid-cols-4">
          <Metric label="Income" value={`Le ${Number(financial?.income ?? 0).toLocaleString()}`} />
          <Metric
            label="Expenditure"
            value={
              financial?.expenditure == null
                ? "Restricted"
                : `Le ${Number(financial.expenditure).toLocaleString()}`
            }
          />
          <Metric
            label="Profit"
            value={
              financial?.profit == null
                ? "Restricted"
                : `Le ${Number(financial.profit).toLocaleString()}`
            }
          />
          <Metric label="Pending orders" value={String(pending)} />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <ReportCard
            title="Sales by period and channel"
            icon={<BarChart3 className="h-5 w-5 text-primary" />}
            empty={!sales.length}
          >
            {sales.slice(0, 20).map((row, index) => (
              <Row
                key={`${row.period}-${row.period_type}-${row.sales_channel}-${index}`}
                label={String(row.period)}
                detail={`${row.period_type} · ${String(row.sales_channel).replaceAll("_", " ")} · ${row.sale_count} sales`}
                value={`Le ${Number(row.revenue).toLocaleString()}`}
              />
            ))}
          </ReportCard>
          <ReportCard
            title="Products, services and programmes"
            icon={<Package className="h-5 w-5 text-primary" />}
            empty={!products.length}
          >
            {products.slice(0, 10).map((row) => (
              <Row
                key={`${row.item_type}-${row.name}`}
                label={row.name}
                detail={`${row.item_type} · ${row.units_sold} units`}
                value={`Le ${Number(row.revenue).toLocaleString()}`}
              />
            ))}
          </ReportCard>
          <ReportCard
            title="Expenses by category"
            icon={<Receipt className="h-5 w-5 text-primary" />}
            empty={!expenses.length}
          >
            {expenses.slice(0, 10).map((row, index) => (
              <Row
                key={`${row.category}-${row.period}-${index}`}
                label={row.category}
                detail={`${row.period} · ${row.expense_count} entries`}
                value={`Le ${Number(row.expenditure).toLocaleString()}`}
              />
            ))}
          </ReportCard>
          <ReportCard
            title="Outstanding balances"
            icon={<Users className="h-5 w-5 text-primary" />}
            empty={!balances.length}
          >
            {balances.slice(0, 10).map((row) => (
              <Row
                key={row.user_id}
                label={row.user_id.slice(0, 8)}
                detail={`${row.order_count} orders`}
                value={`Le ${Number(row.balance_due).toLocaleString()}`}
                danger
              />
            ))}
          </ReportCard>
          <ReportCard
            title="Academic programme performance"
            icon={<GraduationCap className="h-5 w-5 text-primary" />}
            empty={!academic.length}
          >
            {academic.map((row) => (
              <Row
                key={row.programme}
                label={row.programme}
                detail={`${row.students} students · ${row.approved_registrations} approved`}
                value={`${Number(row.average_progress).toFixed(0)}% progress`}
              />
            ))}
          </ReportCard>
          <ReportCard
            title="Delivery operations"
            icon={<Truck className="h-5 w-5 text-primary" />}
            empty={!delivery.length}
          >
            {delivery.map((row) => (
              <Row
                key={row.status}
                label={row.status.replaceAll("_", " ")}
                detail="orders"
                value={String(row.orders)}
              />
            ))}
          </ReportCard>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <ReportCard
            title="Stock status"
            icon={<Package className="h-5 w-5 text-primary" />}
            empty={!stock.length}
          >
            {stock.slice(0, 12).map((row) => (
              <Row
                key={row.name}
                label={row.name}
                detail={row.is_low_stock ? "Low stock" : "In stock"}
                value={String(row.stock_quantity ?? "unlimited")}
                danger={row.is_low_stock}
              />
            ))}
          </ReportCard>
          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold">Operational totals</h2>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <Metric label="Approved payments" value={String(approved)} />
              <Metric label="Pending orders" value={String(pending)} />
              <Metric
                label="Low-stock items"
                value={String(stock.filter((item) => item.is_low_stock).length)}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-6">
        {icon}
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
function ReportCard({
  title,
  icon,
  empty,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <h2 className="flex items-center gap-2 text-xl font-bold">
          {icon}
          {title}
        </h2>
      </CardHeader>
      <CardContent className="space-y-2">
        {empty ? <p className="text-sm text-muted-foreground">No data available yet.</p> : children}
      </CardContent>
    </Card>
  );
}
function Row({
  label,
  detail,
  value,
  danger,
}: {
  label: string;
  detail: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      {danger ? (
        <Badge variant="destructive">{value}</Badge>
      ) : (
        <Badge variant="secondary">{value}</Badge>
      )}
    </div>
  );
}

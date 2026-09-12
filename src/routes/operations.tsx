import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { AlertTriangle, BookOpen, Boxes, FileText, Receipt, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { getDashboardPath, normalizeRole, pickPrimaryRole } from "@/lib/workflow";

export const Route = createFileRoute("/operations")({
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
  head: () => ({ meta: [{ title: "Operations | K-Lunsar Computer Training" }] }),
  component: OperationsPage,
});

function OperationsPage() {
  const [moduleForm, setModuleForm] = useState({ courseId: "", title: "", description: "" });
  const [assessmentForm, setAssessmentForm] = useState({ courseId: "", title: "", passMark: "60" });
  const [expenseForm, setExpenseForm] = useState({
    category: "Operations",
    description: "",
    amount: "",
  });
  const [stockForm, setStockForm] = useState({
    productId: "",
    movementType: "received",
    quantity: "",
    note: "",
  });
  const [refundForm, setRefundForm] = useState({ orderId: "", amount: "", reason: "" });
  const [invoiceForm, setInvoiceForm] = useState({ userId: "", orderId: "", total: "" });

  const { data: courses = [] } = useQuery({
    queryKey: ["operations-courses"],
    queryFn: async () =>
      (await supabase.from("courses").select("id,title").order("sort_order")).data ?? [],
  });
  const { data: products = [] } = useQuery({
    queryKey: ["operations-products"],
    queryFn: async () =>
      (
        await supabase
          .from("products")
          .select("id,name,stock_quantity")
          .eq("active", true)
          .order("name")
      ).data ?? [],
  });
  const { data: orderOptions = [] } = useQuery({
    queryKey: ["operations-order-options"],
    queryFn: async () =>
      (
        await supabase
          .from("orders")
          .select("id,customer_name,total,status,created_at")
          .order("created_at", { ascending: false })
      ).data ?? [],
  });
  const { data: modules = [], refetch: refetchModules } = useQuery({
    queryKey: ["operations-modules"],
    queryFn: async () =>
      (
        await supabase
          .from("programme_modules")
          .select("id,title,description,courses(title)")
          .order("created_at", { ascending: false })
      ).data ?? [],
  });
  const { data: expenses = [], refetch: refetchExpenses } = useQuery({
    queryKey: ["operations-expenses"],
    queryFn: async () =>
      (
        await supabase
          .from("expenses")
          .select("id,category,description,amount,approval_status,expense_date")
          .order("created_at", { ascending: false })
          .limit(20)
      ).data ?? [],
  });
  const { data: errors = [] } = useQuery({
    queryKey: ["operations-errors"],
    queryFn: async () =>
      (
        await supabase
          .from("application_errors")
          .select("id,message,route,created_at")
          .order("created_at", { ascending: false })
          .limit(20)
      ).data ?? [],
  });

  const submit = async (
    event: FormEvent,
    action: () => Promise<{ error: { message: string } | null }>,
  ) => {
    event.preventDefault();
    const result = await action();
    if (result.error) toast.error(result.error.message);
    else toast.success("Saved successfully.");
  };

  const addModule = (event: FormEvent) =>
    submit(event, async () => {
      const result = await supabase
        .from("programme_modules")
        .insert({
          course_id: moduleForm.courseId,
          title: moduleForm.title.trim(),
          description: moduleForm.description.trim(),
        });
      if (!result.error) {
        setModuleForm({ courseId: "", title: "", description: "" });
        await refetchModules();
      }
      return result;
    });
  const addAssessment = (event: FormEvent) =>
    submit(event, async () =>
      supabase
        .from("assessments")
        .insert({
          course_id: assessmentForm.courseId,
          title: assessmentForm.title.trim(),
          pass_mark: Number(assessmentForm.passMark),
        }),
    );
  const addExpense = (event: FormEvent) =>
    submit(event, async () => {
      const result = await supabase
        .from("expenses")
        .insert({
          category: expenseForm.category,
          description: expenseForm.description.trim(),
          amount: Number(expenseForm.amount),
          approval_status: "pending",
        });
      if (!result.error) {
        setExpenseForm({ category: "Operations", description: "", amount: "" });
        await refetchExpenses();
      }
      return result;
    });
  const addStockMovement = (event: FormEvent) =>
    submit(event, async () => {
      const result = await supabase
        .from("stock_movements")
        .insert({
          product_id: stockForm.productId,
          movement_type: stockForm.movementType,
          quantity: Number(stockForm.quantity),
          note: stockForm.note.trim(),
        });
      if (!result.error)
        setStockForm({ productId: "", movementType: "received", quantity: "", note: "" });
      return result;
    });
  const addRefund = (event: FormEvent) =>
    submit(event, async () =>
      supabase
        .from("refunds")
        .insert({
          order_id: refundForm.orderId,
          amount: Number(refundForm.amount),
          reason: refundForm.reason.trim(),
          requested_by: (await supabase.auth.getUser()).data.user?.id,
        }),
    );
  const addInvoice = (event: FormEvent) =>
    submit(event, async () =>
      supabase
        .from("invoices")
        .insert({
          invoice_number: `INV-${Date.now()}`,
          user_id: invoiceForm.userId,
          order_id: invoiceForm.orderId || null,
          total: Number(invoiceForm.total),
          balance_due: Number(invoiceForm.total),
        }),
    );

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-14">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Administration
        </p>
        <h1 className="mt-2 text-4xl font-bold">Operations centre</h1>
        <p className="mt-3 text-muted-foreground">
          Manage the academic, financial and inventory records that support the main dashboards.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <BookOpen className="h-5 w-5 text-primary" />
              Programme modules
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={addModule} className="space-y-2">
              <select
                required
                value={moduleForm.courseId}
                onChange={(e) => setModuleForm({ ...moduleForm, courseId: e.target.value })}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Select course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
              <input
                required
                value={moduleForm.title}
                onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                placeholder="Module title"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
              <textarea
                value={moduleForm.description}
                onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                placeholder="Description"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
              <Button type="submit">
                <Save className="mr-2 h-4 w-4" />
                Add module
              </Button>
            </form>
            {modules.slice(0, 6).map((module) => (
              <div key={module.id} className="rounded border p-3 text-sm">
                <p className="font-medium">{module.title}</p>
                <p className="text-xs text-muted-foreground">
                  {(module.courses as { title?: string } | null)?.title} · {module.description}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <FileText className="h-5 w-5 text-primary" />
              Assessments
            </h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={addAssessment} className="space-y-2">
              <select
                required
                value={assessmentForm.courseId}
                onChange={(e) => setAssessmentForm({ ...assessmentForm, courseId: e.target.value })}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Select course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
              <input
                required
                value={assessmentForm.title}
                onChange={(e) => setAssessmentForm({ ...assessmentForm, title: e.target.value })}
                placeholder="Assessment title"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
              <input
                required
                type="number"
                min="0"
                max="100"
                value={assessmentForm.passMark}
                onChange={(e) => setAssessmentForm({ ...assessmentForm, passMark: e.target.value })}
                placeholder="Pass mark"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
              <Button type="submit">Create assessment</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Receipt className="h-5 w-5 text-primary" />
              Expenses
            </h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={addExpense} className="space-y-2">
              <input
                required
                value={expenseForm.category}
                onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                placeholder="Category"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
              <input
                required
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                placeholder="Description"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
              <input
                required
                type="number"
                min="0"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                placeholder="Amount"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
              <Button type="submit">Submit expense for approval</Button>
            </form>
            <div className="mt-4 space-y-2">
              {expenses.slice(0, 5).map((expense) => (
                <div key={expense.id} className="flex justify-between rounded border p-2 text-sm">
                  <span>{expense.description}</span>
                  <Badge variant="secondary">{expense.approval_status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Boxes className="h-5 w-5 text-primary" />
              Stock movement
            </h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={addStockMovement} className="space-y-2">
              <select
                required
                value={stockForm.productId}
                onChange={(e) => setStockForm({ ...stockForm, productId: e.target.value })}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Select product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.stock_quantity ?? "unlimited"})
                  </option>
                ))}
              </select>
              <select
                value={stockForm.movementType}
                onChange={(e) => setStockForm({ ...stockForm, movementType: e.target.value })}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="received">Stock received</option>
                <option value="adjustment">Adjustment</option>
                <option value="return">Return</option>
              </select>
              <input
                required
                type="number"
                value={stockForm.quantity}
                onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                placeholder="Quantity"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
              <input
                value={stockForm.note}
                onChange={(e) => setStockForm({ ...stockForm, note: e.target.value })}
                placeholder="Note"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
              <Button type="submit">Record movement</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <RotateCcw className="h-5 w-5 text-primary" />
              Refund request
            </h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={addRefund} className="space-y-2">
              <select
                required
                value={refundForm.orderId}
                onChange={(e) => setRefundForm({ ...refundForm, orderId: e.target.value })}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Select order</option>
                {orderOptions.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.id.slice(0, 8)} · {order.customer_name || "Customer"} ·{" "}
                    {new Date(order.created_at).toLocaleDateString()} · {order.status}
                  </option>
                ))}
              </select>
              <input
                required
                type="number"
                min="0"
                value={refundForm.amount}
                onChange={(e) => setRefundForm({ ...refundForm, amount: e.target.value })}
                placeholder="Refund amount"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
              <textarea
                required
                value={refundForm.reason}
                onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
                placeholder="Reason"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
              <Button type="submit">Submit refund request</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <FileText className="h-5 w-5 text-primary" />
              Invoice
            </h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={addInvoice} className="space-y-2">
              <input
                required
                value={invoiceForm.userId}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, userId: e.target.value })}
                placeholder="Customer user ID"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
              <select
                value={invoiceForm.orderId}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, orderId: e.target.value })}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">No linked order</option>
                {orderOptions.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.id.slice(0, 8)} · {order.customer_name || "Customer"} · {order.status}
                  </option>
                ))}
              </select>
              <input
                required
                type="number"
                min="0"
                value={invoiceForm.total}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, total: e.target.value })}
                placeholder="Invoice total"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
              <Button type="submit">Issue invoice</Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <Card className="border-amber-200">
        <CardHeader>
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Application errors
          </h2>
        </CardHeader>
        <CardContent className="space-y-2">
          {errors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recorded application errors.</p>
          ) : (
            errors.map((error) => (
              <div key={error.id} className="rounded border p-3 text-sm">
                <p className="font-medium">{error.message}</p>
                <p className="text-xs text-muted-foreground">
                  {error.route} · {new Date(error.created_at).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

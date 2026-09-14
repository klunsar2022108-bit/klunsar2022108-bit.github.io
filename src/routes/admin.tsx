import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import {
  BarChart3,
  Bell,
  FileText,
  ShoppingCart,
  Truck,
  Users,
  Plus,
  Save,
  Trash2,
  Send,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { siteContentQuery } from "@/lib/queries";
import {
  analyticsCards,
  approvalQueue,
  getDashboardPath,
  normalizeRole,
  pickPrimaryRole,
  workflowNotifications,
} from "@/lib/workflow";
import { supabase } from "@/integrations/supabase/client";
import { notifyUser } from "@/lib/notifications";
import { loadSupportThreads, sendChatMessage } from "@/lib/chat";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      throw redirect({ to: "/auth" });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("account_status")
      .eq("id", session.user.id)
      .maybeSingle();
    if (profile?.account_status === "deactivated") {
      throw redirect({ to: "/auth" });
    }

    const { data: roleRows = [] } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);

    const userRole = pickPrimaryRole([
      normalizeRole(session.user.user_metadata?.role),
      normalizeRole(session.user.app_metadata?.role),
      ...(roleRows ?? []).map((row) => row.role),
    ]);

    if (!userRole) {
      throw redirect({ to: "/auth" });
    }

    if (userRole !== "admin" && userRole !== "super_admin") {
      throw redirect({ to: getDashboardPath(userRole) });
    }
  },
  head: () => ({
    meta: [
      { title: "Admin Dashboard | K-Lunsar Computer Training" },
      {
        name: "description",
        content:
          "Manage products, enrolments, centre content and course operations from the K-Lunsar admin dashboard.",
      },
    ],
  }),
  component: AdminPage,
});

export function AdminPage() {
  const queryClient = useQueryClient();
  const { data: site } = useQuery(siteContentQuery);
  const [rejectionReason, setRejectionReason] = useState("");
  const [productForm, setProductForm] = useState({
    id: "",
    name: "",
    description: "",
    price: "",
    stock: "",
    category: "item",
    sector: "student" as "student" | "business",
  });
  const [contentForm, setContentForm] = useState({ key: "about", value: site?.about ?? "" });
  const contentOptions = [
    { key: "centre_name", label: "Centre name" },
    { key: "motto", label: "Motto" },
    { key: "about", label: "About" },
    { key: "address", label: "Address" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "facebook", label: "Facebook" },
    { key: "whatsapp", label: "WhatsApp" },
    { key: "youtube", label: "YouTube" },
    { key: "instagram", label: "Instagram" },
    { key: "tiktok", label: "TikTok" },
  ];
  const [saleForm, setSaleForm] = useState({
    productName: "",
    quantity: "1",
    unitPrice: "",
    paymentMethod: "cash",
    staffUserId: "",
  });
  const [cashierForm, setCashierForm] = useState({ openingCash: "", actualClosingCash: "" });
  const [notificationForm, setNotificationForm] = useState({ userId: "", title: "", message: "" });
  const [deliveryStatus, setDeliveryStatus] = useState("processing");
  const [operationMessage, setOperationMessage] = useState("");
  const [teacherForm, setTeacherForm] = useState({ name: "", email: "", title: "Teacher" });
  const [salaryForm, setSalaryForm] = useState({ teacherId: "", amount: "", period: "" });
  const { data: activeCashierSession, refetch: refetchCashierSession } = useQuery({
    queryKey: ["active-cashier-session"],
    queryFn: async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) return null;
      const { data, error } = await supabase
        .from("cashier_sessions")
        .select("id, opening_cash, cash_sales, refunds, expenses, expected_closing_cash, opened_at")
        .eq("cashier_id", userId)
        .eq("status", "open")
        .order("opened_at", { ascending: false })
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });
  const [allocationForm, setAllocationForm] = useState({
    enrollmentId: "",
    teacherId: "",
    shiftId: "",
  });
  const [accountRejectionReason, setAccountRejectionReason] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [chatReply, setChatReply] = useState("");
  const loadChatMessages = async () => {
    try {
      const threads = await loadSupportThreads();
      setChatMessages(
        threads.flatMap((thread) =>
          (thread.chat_messages ?? []).map(
            (message: {
              id: string;
              thread_id: string;
              sender_id: string;
              message: string;
              created_at: string;
            }) => ({
              id: message.id,
              threadId: message.thread_id,
              studentId: thread.created_by,
              studentName: thread.created_by,
              studentApprovalStatus: thread.approval_status,
              from:
                message.sender_id === thread.created_by ? ("student" as const) : ("admin" as const),
              message: message.message,
              timestamp: message.created_at,
            }),
          ),
        ),
      );
    } catch {
      setChatMessages([]);
    }
  };
  useEffect(() => {
    void loadChatMessages();
    return undefined;
  }, []);

  const { data: liveOrders = [], refetch: refetchOrders } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, user_id, total, amount_paid, balance_due, status, customer_name, customer_phone, payment_status, payment_method, payment_proof, payment_reference, delivery_address, expected_delivery_at, delivery_visible, created_at, order_payments(id, expected_amount, amount_paid, status)",
        )
        .in("status", [
          "pending",
          "pending_approval",
          "approved",
          "processing",
          "ready",
          "shipped",
          "out_for_delivery",
        ])
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
  useEffect(() => {
    const channel = supabase.channel("admin-order-live");

    channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, () => {
      void refetchOrders();
    });

    channel.on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, () => {
      void refetchOrders();
    });

    void channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refetchOrders]);
  const chatStudents = Array.from(
    new Map(chatMessages.map((message) => [message.studentId, message])).values(),
  );
  const selectedChat = chatMessages.filter((message) => message.studentId === selectedStudentId);
  const sendChatReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!chatReply.trim() || !selectedStudentId) return;
    const threadId = selectedChat[0]?.threadId;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!threadId || !user) return;
    try {
      const saved = await sendChatMessage(threadId, user.id, chatReply);
      const reply: ChatMessage = {
        id: `admin-chat-${Date.now()}`,
        threadId,
        studentId: selectedStudentId,
        studentName:
          chatStudents.find((student) => student.studentId === selectedStudentId)?.studentName ??
          "Student",
        studentApprovalStatus:
          chatStudents.find((student) => student.studentId === selectedStudentId)
            ?.studentApprovalStatus ?? "pending",
        from: "admin",
        message: chatReply.trim(),
        timestamp: saved.created_at,
      };
      setChatMessages((current) => [...current, reply]);
      setChatReply("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Message could not be sent.");
    }
  };

  const { data: lowStockProducts = [] } = useQuery({
    queryKey: ["admin-low-stock-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, stock_quantity, low_stock_threshold")
        .not("stock_quantity", "is", null)
        .order("stock_quantity");
      if (error) throw new Error(error.message);
      return (data ?? []).filter(
        (product) => (product.stock_quantity ?? 0) <= product.low_stock_threshold,
      );
    },
  });
  const { data: products = [], refetch: refetchProducts } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, description, price, category, sector, stock_quantity, active")
        .order("sort_order");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone, username, account_status")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
  const { data: teachers = [] } = useQuery({
    queryKey: ["admin-teachers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutors")
        .select("id, name, title, active")
        .order("sort_order");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
  const { data: pendingEnrollments = [], refetch: refetchEnrollments } = useQuery({
    queryKey: ["admin-enrollments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select(
          "id, user_id, path, shift_id, status, created_at, profiles(full_name), shifts(name)",
        )
        .in("status", ["pending", "submitted"])
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
  const { data: pendingAccounts = [], refetch: refetchAccounts } = useQuery({
    queryKey: ["admin-pending-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, account_type, approval_status, created_at")
        .eq("approval_status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
  const { data: dailyAnalytics } = useQuery({
    queryKey: ["admin-daily-analytics"],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const [{ data: orders = [] }, { data: retailSales = [] }] = await Promise.all([
        supabase
          .from("orders")
          .select("total, amount_paid, payment_status, created_at")
          .gte("created_at", since.toISOString()),
        supabase
          .from("retail_sales")
          .select("quantity, total, created_at")
          .gte("created_at", since.toISOString()),
      ]);
      const approvedOrders = orders.filter((order) => order.payment_status === "approved");
      const orderRevenue = approvedOrders.reduce((sum, order) => sum + Number(order.total ?? 0), 0);
      const retailRevenue = retailSales.reduce((sum, sale) => sum + Number(sale.total ?? 0), 0);
      return {
        revenue: orderRevenue + retailRevenue,
        orders: orders.length,
        paidOrders: approvedOrders.length,
        units: retailSales.reduce((sum, sale) => sum + Number(sale.quantity ?? 0), 0),
        retailRevenue,
      };
    },
  });

  const reviewOrder = async (orderId: string, approved: boolean) => {
    if (!approved && !rejectionReason.trim()) {
      toast.error("Enter a rejection reason before rejecting the order.");
      return;
    }
    const reviewedOrder = liveOrders.find((order) => order.id === orderId);
    const paymentId = reviewedOrder?.order_payments?.[0]?.id;
    const { error } = paymentId
      ? await supabase.rpc("transition_payment_status", {
          _payment_id: paymentId,
          _next_status: approved ? "approved" : "rejected",
          _reason: approved ? "" : rejectionReason.trim(),
        })
      : await supabase.rpc("transition_order_status", {
          _order_id: orderId,
          _next_status: approved ? "approved" : "rejected",
          _reason: approved ? "" : rejectionReason.trim(),
        });
    if (error) {
      toast.error(error.message);
      return;
    }
    const reviewerId = (await supabase.auth.getUser()).data.user?.id;
    const { error: paymentReviewError } = await supabase
      .from("order_payments")
      .update({
        status: approved ? "approved" : "rejected",
        rejection_reason: approved ? null : rejectionReason.trim(),
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerId ?? null,
      })
      .eq("order_id", orderId);
    if (paymentReviewError) {
      toast.error(paymentReviewError.message);
      return;
    }
    if (reviewedOrder?.user_id) {
      await notifyUser(
        reviewedOrder.user_id,
        approved ? "Payment approved" : "Order rejected",
        approved
          ? `Order ${orderId} and its payment were approved.`
          : `Order ${orderId} was rejected. Reason: ${rejectionReason.trim()}`,
        "payment",
      );
    }
    setRejectionReason("");
    toast.success(approved ? "Order approved." : "Order rejected with reason.");
    await refetchOrders();
  };

  const reviewAccount = async (userId: string, approved: boolean) => {
    if (!approved && !accountRejectionReason.trim()) {
      toast.error("Enter a rejection reason before rejecting the account.");
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({
        approval_status: approved ? "approved" : "rejected",
        approved_at: approved ? new Date().toISOString() : null,
        approved_by: approved ? (await supabase.auth.getUser()).data.user?.id : null,
        rejection_reason: approved ? null : accountRejectionReason.trim(),
      })
      .eq("id", userId);
    if (error) {
      toast.error(error.message);
      return;
    }
    await notifyUser(
      userId,
      approved ? "Account approved" : "Account registration rejected",
      approved
        ? "Your account has been approved. Your permitted dashboard features are now active."
        : `Your account registration was rejected. Reason: ${accountRejectionReason.trim()}`,
      "account",
    );
    setAccountRejectionReason("");
    toast.success(approved ? "Account approved." : "Account rejected with reason.");
    await refetchAccounts();
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!productForm.name.trim() || !productForm.price) return;
    const payload = {
      name: productForm.name.trim(),
      description: productForm.description.trim(),
      details: productForm.description.trim(),
      price: Number(productForm.price),
      category: productForm.category,
      sector: productForm.sector,
      stock_quantity: productForm.stock ? Number(productForm.stock) : null,
    };
    const result = productForm.id
      ? await supabase.from("products").update(payload).eq("id", productForm.id)
      : await supabase.from("products").insert(payload);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    setProductForm({
      id: "",
      name: "",
      description: "",
      price: "",
      stock: "",
      category: "item",
      sector: "student",
    });
    toast.success(productForm.id ? "Product updated." : "Product added.");
    await refetchProducts();
  };

  const deleteProduct = async (productId: string) => {
    const { error } = await supabase.from("products").update({ active: false }).eq("id", productId);
    if (error) toast.error(error.message);
    else {
      toast.success("Product archived.");
      await refetchProducts();
    }
  };

  const saveContent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { error } = await supabase
      .from("site_content")
      .upsert({ key: contentForm.key.trim(), value: contentForm.value.trim() });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(`${contentForm.key} updated.`);
    await queryClient.invalidateQueries({ queryKey: ["site_content"] });
    setContentForm((current) => ({ ...current, value: contentForm.value.trim() }));
  };

  const recordSale = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const quantity = Number(saleForm.quantity);
    const unitPrice = Number(saleForm.unitPrice);
    if (!saleForm.productName.trim() || quantity < 1 || unitPrice < 0) return;
    const { data: sale, error } = await supabase
      .from("retail_sales")
      .insert({
        product_name: saleForm.productName.trim(),
        quantity,
        unit_price: unitPrice,
        total: quantity * unitPrice,
        payment_method: saleForm.paymentMethod,
        staff_user_id: saleForm.staffUserId || null,
      })
      .select("id")
      .single();
    if (error) toast.error(error.message);
    else {
      const actor = (await supabase.auth.getUser()).data.user?.id;
      const { error: ledgerError } = await supabase.from("ledger_entries").insert({
        reference: `SAL-${sale.id}`,
        entry_type: "retail_sale",
        credit: quantity * unitPrice,
        source_table: "retail_sales",
        source_id: sale.id,
        description: `${saleForm.productName.trim()} x ${quantity}`,
        created_by: actor,
      });
      if (ledgerError) {
        toast.error(`Sale recorded, but ledger entry failed: ${ledgerError.message}`);
        return;
      }
      toast.success("Physical sale recorded and allocated.");
      setSaleForm({
        productName: "",
        quantity: "1",
        unitPrice: "",
        paymentMethod: "cash",
        staffUserId: "",
      });
    }
  };

  const openCashierSession = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const openingCash = Number(cashierForm.openingCash);
    if (!userId || !Number.isFinite(openingCash) || openingCash < 0) return;
    const { error } = await supabase.from("cashier_sessions").insert({
      cashier_id: userId,
      opening_cash: openingCash,
      expected_closing_cash: openingCash,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Cashier session opened.");
      setCashierForm({ openingCash: "", actualClosingCash: "" });
      await refetchCashierSession();
    }
  };

  const closeCashierSession = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeCashierSession) return;
    const actualClosingCash = Number(cashierForm.actualClosingCash);
    if (!Number.isFinite(actualClosingCash) || actualClosingCash < 0) return;
    const expectedClosingCash =
      Number(activeCashierSession.opening_cash ?? 0) +
      Number(activeCashierSession.cash_sales ?? 0) -
      Number(activeCashierSession.refunds ?? 0) -
      Number(activeCashierSession.expenses ?? 0);
    const { error } = await supabase
      .from("cashier_sessions")
      .update({
        closed_at: new Date().toISOString(),
        actual_closing_cash: actualClosingCash,
        expected_closing_cash: expectedClosingCash,
        difference: actualClosingCash - expectedClosingCash,
        status: "closed",
      })
      .eq("id", activeCashierSession.id);
    if (error) toast.error(error.message);
    else {
      toast.success(
        `Cashier session closed. Variance: Le ${(actualClosingCash - expectedClosingCash).toLocaleString()}`,
      );
      setCashierForm({ openingCash: "", actualClosingCash: "" });
      await refetchCashierSession();
    }
  };

  const sendNotification = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !notificationForm.userId ||
      !notificationForm.title.trim() ||
      !notificationForm.message.trim()
    )
      return;
    const { error } = await supabase.from("user_notifications").insert({
      user_id: notificationForm.userId,
      title: notificationForm.title.trim(),
      message: notificationForm.message.trim(),
      created_by: (await supabase.auth.getUser()).data.user?.id,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Notification sent.");
      setNotificationForm({ userId: "", title: "", message: "" });
    }
  };

  const setUserAccountState = async (userId: string, status: "active" | "deactivated") => {
    const reason = status === "deactivated" ? (window.prompt("Reason for deactivation") ?? "") : "";
    if (status === "deactivated" && !reason.trim()) return;
    const { error } = await supabase.rpc("set_account_state", {
      _user_id: userId,
      _status: status,
      _reason: reason,
    });
    if (error) toast.error(error.message);
    else toast.success(status === "active" ? "Account reactivated." : "Account deactivated.");
  };

  const updateDelivery = async (orderId: string) => {
    const { error } = await supabase.rpc("transition_order_status", {
      _order_id: orderId,
      _next_status: deliveryStatus,
      _reason: "",
    });
    if (error) toast.error(error.message);
    else {
      setOperationMessage("Delivery status updated.");
      await refetchOrders();
    }
    const updatedOrder = liveOrders.find((order) => order.id === orderId);
    if (!error && updatedOrder?.user_id) {
      await supabase.from("order_delivery_events").insert({
        order_id: orderId,
        status: deliveryStatus,
        note: `Status updated to ${deliveryStatus.replaceAll("_", " ")}.`,
      });
      await notifyUser(
        updatedOrder.user_id,
        "Delivery update",
        `Your order ${orderId} is now ${deliveryStatus.replaceAll("_", " ")}.`,
        "delivery",
      );
    }
  };

  const saveTeacher = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!teacherForm.name.trim() || !teacherForm.email.trim()) return;
    const { error } = await supabase.functions.invoke("admin-create-teacher", {
      body: {
        name: teacherForm.name.trim(),
        email: teacherForm.email.trim(),
        title: teacherForm.title.trim() || "Teacher",
      },
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Teacher account created. Invitation email sent.");
      setTeacherForm({ name: "", email: "", title: "Teacher" });
    }
  };

  const approveEnrollment = async (enrollmentId: string, approved: boolean) => {
    const { error } = await supabase
      .from("enrollments")
      .update({ status: approved ? "approved" : "rejected" })
      .eq("id", enrollmentId);
    if (error) toast.error(error.message);
    else {
      const enrollment = pendingEnrollments.find((item) => item.id === enrollmentId);
      if (enrollment?.user_id)
        await notifyUser(
          enrollment.user_id,
          approved ? "Registration approved" : "Registration rejected",
          approved
            ? "Your student registration has been approved. Your dashboard is now active."
            : "Your student registration was rejected. Contact the centre for the reason and next steps.",
          "registration",
        );
      toast.success(approved ? "Student registration approved." : "Student registration rejected.");
      await refetchEnrollments();
    }
  };

  const allocateEnrollment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!allocationForm.enrollmentId || !allocationForm.teacherId || !allocationForm.shiftId)
      return;
    const { error } = await supabase
      .from("enrollments")
      .update({
        teacher_id: allocationForm.teacherId,
        shift_id: allocationForm.shiftId,
        status: "approved",
      })
      .eq("id", allocationForm.enrollmentId);
    if (error) toast.error(error.message);
    else {
      const enrollment = pendingEnrollments.find((item) => item.id === allocationForm.enrollmentId);
      if (enrollment?.user_id)
        await notifyUser(
          enrollment.user_id,
          "Teacher and shift allocated",
          "The centre assigned you to a teacher and shift. Open your dashboard for the latest programme details.",
          "teacher_allocation",
        );
      toast.success("Student allocated to teacher and shift.");
      await refetchEnrollments();
    }
  };

  const submitSalaryReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!salaryForm.teacherId || !salaryForm.amount || !salaryForm.period) return;
    const { error } = await supabase.from("teacher_payments").insert({
      teacher_id: salaryForm.teacherId,
      amount: Number(salaryForm.amount),
      period: salaryForm.period,
      status: "pending",
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Teacher salary payment queued for approval.");
      setSalaryForm({ teacherId: "", amount: "", period: "" });
    }
  };

  const cards = [
    { label: "Students", value: "128", icon: Users },
    { label: "Orders", value: "48", icon: ShoppingCart },
    { label: "Courses", value: "6", icon: FileText },
    { label: "Performance", value: "89%", icon: BarChart3 },
  ];

  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-12">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Administration
            </p>
            <h1 className="mt-2 text-4xl font-bold">Centre admin dashboard</h1>
          </div>
          <Badge variant="secondary">{site?.["centre_name"] ?? "K-Lunsar Computer Training"}</Badge>
          <Link to="/operations">
            <Button variant="outline">Operations centre</Button>
          </Link>
          <Link to="/assets">
            <Button variant="outline">Assets & equipment</Button>
          </Link>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-4">
          {analyticsCards.map(({ label, value, change }) => (
            <Card key={label} className="border-border/70">
              <CardContent className="flex items-center gap-3 py-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {label.includes("Sales") ? (
                    <ShoppingCart className="h-4 w-4" />
                  ) : label.includes("Pending") ? (
                    <Bell className="h-4 w-4" />
                  ) : label.includes("Delivery") ? (
                    <Truck className="h-4 w-4" />
                  ) : (
                    <BarChart3 className="h-4 w-4" />
                  )}
                </span>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-display text-lg font-semibold">{value}</p>
                  <p className="text-[11px] text-primary">{change}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <Card className="border-border/70">
            <CardHeader>
              <h2 className="font-display text-2xl font-bold">Cashier session</h2>
              <p className="text-sm text-muted-foreground">
                Open the till, track cash accountability, and close with a recorded variance.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {!activeCashierSession ? (
                <form onSubmit={openCashierSession} className="flex gap-2">
                  <input
                    required
                    type="number"
                    min="0"
                    value={cashierForm.openingCash}
                    onChange={(event) =>
                      setCashierForm((current) => ({ ...current, openingCash: event.target.value }))
                    }
                    placeholder="Opening cash"
                    className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                  />
                  <Button type="submit" size="sm">
                    Open session
                  </Button>
                </form>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Opening</p>
                      <p className="font-semibold">
                        Le {Number(activeCashierSession.opening_cash).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Sales</p>
                      <p className="font-semibold">
                        Le {Number(activeCashierSession.cash_sales).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Refunds</p>
                      <p className="font-semibold">
                        Le {Number(activeCashierSession.refunds).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Expected</p>
                      <p className="font-semibold text-primary">
                        Le {Number(activeCashierSession.expected_closing_cash).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <form
                    onSubmit={closeCashierSession}
                    className="flex gap-2 border-t border-border pt-3"
                  >
                    <input
                      required
                      type="number"
                      min="0"
                      value={cashierForm.actualClosingCash}
                      onChange={(event) =>
                        setCashierForm((current) => ({
                          ...current,
                          actualClosingCash: event.target.value,
                        }))
                      }
                      placeholder="Actual closing cash"
                      className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                    />
                    <Button type="submit" size="sm" variant="outline">
                      Close session
                    </Button>
                  </form>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <h2 className="font-display text-2xl font-bold">Pending account approvals</h2>
              <p className="text-sm text-muted-foreground">
                Approve or reject newly registered students, teachers, and customers.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending account registrations.</p>
              ) : (
                pendingAccounts.map((account) => (
                  <div key={account.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          {account.full_name ?? account.email ?? account.id}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {account.email} · {account.account_type}
                        </p>
                      </div>
                      <Badge variant="secondary">pending</Badge>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" onClick={() => void reviewAccount(account.id, true)}>
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => void reviewAccount(account.id, false)}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))
              )}
              <input
                value={accountRejectionReason}
                onChange={(event) => setAccountRejectionReason(event.target.value)}
                placeholder="Rejection reason, required when rejecting"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </CardContent>
          </Card>
          <Card className="border-border/70">
            <CardHeader>
              <h2 className="font-display text-2xl font-bold">Approval queue</h2>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              {approvalQueue.map((item) => (
                <div key={item.id} className="rounded-lg border border-border bg-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{item.type}</p>
                      <p className="mt-1">
                        {item.name} • {item.item}
                      </p>
                    </div>
                    <Badge variant="secondary">{item.status}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Submitted {item.date}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-secondary/40">
            <CardHeader>
              <h2 className="font-display text-2xl font-bold">Workflow notifications</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              {workflowNotifications.map((item) => (
                <div key={item.id} className="rounded-lg border border-border bg-background p-3">
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-10 border-border/70">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold">Student support chat</h2>
                <p className="text-sm text-muted-foreground">
                  Messages from students waiting for registration or payment approval.
                </p>
              </div>
              <Badge variant="secondary">
                {chatStudents.length} conversation{chatStudents.length === 1 ? "" : "s"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
            <div className="space-y-2">
              {chatStudents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No student messages yet.</p>
              ) : (
                chatStudents.map((student) => (
                  <button
                    key={student.studentId}
                    onClick={() => setSelectedStudentId(student.studentId)}
                    className={`w-full rounded-lg border p-3 text-left ${selectedStudentId === student.studentId ? "border-primary bg-primary/5" : "border-border"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{student.studentName}</p>
                      {student.studentApprovalStatus !== "approved" && (
                        <Badge variant="destructive">Unapproved student</Badge>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{student.message}</p>
                  </button>
                ))
              )}
            </div>
            <div className="space-y-3">
              {!selectedStudentId ? (
                <div className="flex min-h-40 items-center justify-center rounded-lg border border-border bg-secondary/30 text-sm text-muted-foreground">
                  Select a student conversation.
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <Bell className="h-4 w-4" />
                    <span>
                      This conversation is with an unapproved student. Keep registration and payment
                      guidance within permitted support.
                    </span>
                  </div>
                  <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-border bg-secondary/30 p-3">
                    {selectedChat.map((message) => (
                      <div
                        key={message.id}
                        className={`rounded-lg p-3 text-sm ${message.from === "admin" ? "ml-8 bg-primary text-primary-foreground" : "mr-8 bg-background"}`}
                      >
                        <p>{message.message}</p>
                        <p className="mt-1 text-[10px] opacity-70">
                          {message.from === "admin" ? "You" : message.studentName} ·{" "}
                          {new Date(message.timestamp).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={sendChatReply} className="flex gap-2">
                    <input
                      value={chatReply}
                      onChange={(event) => setChatReply(event.target.value)}
                      placeholder="Reply to student"
                      className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    />
                    <Button type="submit" disabled={!chatReply.trim()}>
                      Send
                    </Button>
                  </form>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <Card className="border-border/70">
            <CardHeader>
              <h2 className="font-display text-2xl font-bold">Payment approval queue</h2>
              <p className="text-sm text-muted-foreground">
                Approve verified payments or record a rejection reason.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {liveOrders.filter((order) => ["pending", "pending_approval"].includes(order.status))
                .length === 0 ? (
                <p className="text-sm text-muted-foreground">No live orders awaiting review.</p>
              ) : (
                liveOrders
                  .filter((order) => ["pending", "pending_approval"].includes(order.status))
                  .map((order) => (
                    <div key={order.id} className="rounded-lg border border-border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{order.customer_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Le {Number(order.total).toLocaleString()} • {order.payment_status} •{" "}
                            {order.payment_method ?? "method not provided"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Paid: Le {Number(order.amount_paid ?? 0).toLocaleString()} · Balance: Le{" "}
                            {Number(order.balance_due ?? 0).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Delivery: {order.delivery_address ?? "Not required"} · Expected{" "}
                            {order.expected_delivery_at ?? "After approval"}
                          </p>
                          {(order.payment_proof || order.payment_reference) && (
                            <p className="mt-1 text-xs text-primary">
                              Proof: {order.payment_reference ?? "uploaded attachment"}
                            </p>
                          )}
                          {order.payment_proof?.startsWith("data:image/") && (
                            <img
                              src={order.payment_proof}
                              alt="Submitted transaction proof"
                              className="mt-2 max-h-32 rounded border border-border object-contain"
                            />
                          )}
                        </div>
                        <Badge variant="secondary">{order.status}</Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => reviewOrder(order.id, true)}>
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => reviewOrder(order.id, false)}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))
              )}
              <input
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                placeholder="Rejection reason, required when rejecting"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <h2 className="font-display text-2xl font-bold">Inventory alerts</h2>
              <p className="text-sm text-muted-foreground">
                Products at or below their configured low-stock threshold.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {lowStockProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No low-stock products.</p>
              ) : (
                lowStockProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3"
                  >
                    <span className="font-medium">{product.name}</span>
                    <Badge variant="secondary">{product.stock_quantity} left</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <Card className="border-border/70">
            <CardHeader>
              <h2 className="font-display text-2xl font-bold">Student registration approvals</h2>
              <p className="text-sm text-muted-foreground">
                Review registrations, then allocate approved students to a teacher and shift.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingEnrollments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending student registrations.</p>
              ) : (
                pendingEnrollments.map((enrollment) => (
                  <div key={enrollment.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          {(enrollment.profiles as { full_name?: string } | null)?.full_name ??
                            enrollment.user_id}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {enrollment.path} ·{" "}
                          {(enrollment.shifts as { name?: string } | null)?.name ?? "Shift pending"}
                        </p>
                      </div>
                      <Badge variant="secondary">{enrollment.status}</Badge>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" onClick={() => approveEnrollment(enrollment.id, true)}>
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => approveEnrollment(enrollment.id, false)}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))
              )}
              <form
                onSubmit={allocateEnrollment}
                className="grid gap-2 border-t border-border pt-3 sm:grid-cols-3"
              >
                <select
                  value={allocationForm.enrollmentId}
                  onChange={(event) =>
                    setAllocationForm((current) => ({
                      ...current,
                      enrollmentId: event.target.value,
                    }))
                  }
                  className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="">Student registration</option>
                  {pendingEnrollments.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.path}
                    </option>
                  ))}
                </select>
                <select
                  value={allocationForm.teacherId}
                  onChange={(event) =>
                    setAllocationForm((current) => ({ ...current, teacherId: event.target.value }))
                  }
                  className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="">Teacher</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
                <input
                  value={allocationForm.shiftId}
                  onChange={(event) =>
                    setAllocationForm((current) => ({ ...current, shiftId: event.target.value }))
                  }
                  placeholder="Shift ID"
                  className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                />
                <Button type="submit" size="sm" className="sm:col-span-3">
                  Allocate teacher and shift
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <h2 className="font-display text-2xl font-bold">Teacher accounts & salary</h2>
              <p className="text-sm text-muted-foreground">
                Create staff profiles and queue salary payments for review.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={saveTeacher} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <input
                  required
                  value={teacherForm.name}
                  onChange={(event) =>
                    setTeacherForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Teacher name"
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
                <input
                  required
                  type="email"
                  value={teacherForm.email}
                  onChange={(event) =>
                    setTeacherForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="Email"
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
                <input
                  value={teacherForm.title}
                  onChange={(event) =>
                    setTeacherForm((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder="Role/title"
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
                <Button type="submit" size="sm">
                  <Plus className="mr-1 h-4 w-4" />
                  Invite
                </Button>
              </form>
              <div className="space-y-2">
                {teachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
                  >
                    <span>
                      {teacher.name}
                      <span className="ml-2 text-xs text-muted-foreground">{teacher.title}</span>
                    </span>
                    <Badge variant={teacher.active ? "default" : "secondary"}>
                      {teacher.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                ))}
              </div>
              <form
                onSubmit={submitSalaryReview}
                className="grid gap-2 border-t border-border pt-3 sm:grid-cols-3"
              >
                <select
                  value={salaryForm.teacherId}
                  onChange={(event) =>
                    setSalaryForm((current) => ({ ...current, teacherId: event.target.value }))
                  }
                  className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="">Teacher</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
                <input
                  value={salaryForm.amount}
                  onChange={(event) =>
                    setSalaryForm((current) => ({ ...current, amount: event.target.value }))
                  }
                  type="number"
                  placeholder="Amount"
                  className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                />
                <input
                  value={salaryForm.period}
                  onChange={(event) =>
                    setSalaryForm((current) => ({ ...current, period: event.target.value }))
                  }
                  placeholder="Period"
                  className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                />
                <Button type="submit" size="sm" className="sm:col-span-3">
                  Queue salary payment
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <Card className="border-border/70">
            <CardHeader>
              <h2 className="font-display text-2xl font-bold">Product and service catalogue</h2>
              <p className="text-sm text-muted-foreground">
                Add, update, archive, price, and monitor stock.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <form onSubmit={saveProduct} className="grid gap-2 sm:grid-cols-2">
                <input
                  value={productForm.name}
                  onChange={(event) =>
                    setProductForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Product/service name"
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
                <input
                  value={productForm.price}
                  onChange={(event) =>
                    setProductForm((current) => ({ ...current, price: event.target.value }))
                  }
                  type="number"
                  placeholder="Price"
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
                <input
                  value={productForm.stock}
                  onChange={(event) =>
                    setProductForm((current) => ({ ...current, stock: event.target.value }))
                  }
                  type="number"
                  placeholder="Stock quantity"
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
                <select
                  value={productForm.category}
                  onChange={(event) =>
                    setProductForm((current) => ({ ...current, category: event.target.value }))
                  }
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="item">Item</option>
                  <option value="course">Course</option>
                  <option value="service">Service</option>
                  <option value="path">Programme</option>
                </select>
                <select
                  value={productForm.sector}
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      sector: event.target.value as "student" | "business",
                    }))
                  }
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="student">Student-related</option>
                  <option value="business">Business-related</option>
                </select>
                <textarea
                  value={productForm.description}
                  onChange={(event) =>
                    setProductForm((current) => ({ ...current, description: event.target.value }))
                  }
                  placeholder="Description"
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm sm:col-span-2"
                />
                <Button type="submit" className="sm:col-span-2">
                  <Save className="mr-2 h-4 w-4" />
                  {productForm.id ? "Update product" : "Add product"}
                </Button>
              </form>
              {products
                .filter((product) => product.active)
                .map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Le {Number(product.price).toLocaleString()} · Stock:{" "}
                        {product.stock_quantity ?? "unlimited"}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() =>
                          setProductForm({
                            id: product.id,
                            name: product.name,
                            description: product.description,
                            price: String(product.price),
                            stock:
                              product.stock_quantity == null ? "" : String(product.stock_quantity),
                            category: product.category,
                          })
                        }
                        aria-label={`Edit ${product.name}`}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => void deleteProduct(product.id)}
                        aria-label={`Archive ${product.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <h2 className="font-display text-2xl font-bold">Physical sales & notifications</h2>
              <p className="text-sm text-muted-foreground">
                Record shop sales, allocate staff, and send updates.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={recordSale} className="grid gap-2 sm:grid-cols-2">
                <input
                  value={saleForm.productName}
                  onChange={(event) =>
                    setSaleForm((current) => ({ ...current, productName: event.target.value }))
                  }
                  placeholder="Item sold"
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
                <input
                  value={saleForm.quantity}
                  onChange={(event) =>
                    setSaleForm((current) => ({ ...current, quantity: event.target.value }))
                  }
                  type="number"
                  min="1"
                  placeholder="Quantity"
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
                <input
                  value={saleForm.unitPrice}
                  onChange={(event) =>
                    setSaleForm((current) => ({ ...current, unitPrice: event.target.value }))
                  }
                  type="number"
                  min="0"
                  placeholder="Unit price"
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
                <select
                  value={saleForm.staffUserId}
                  onChange={(event) =>
                    setSaleForm((current) => ({ ...current, staffUserId: event.target.value }))
                  }
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Responsible staff</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name ?? user.username ?? user.id}
                    </option>
                  ))}
                </select>
                <Button type="submit" className="sm:col-span-2">
                  Record physical sale
                </Button>
              </form>
              <form onSubmit={sendNotification} className="grid gap-2 border-t border-border pt-4">
                <select
                  value={notificationForm.userId}
                  onChange={(event) =>
                    setNotificationForm((current) => ({ ...current, userId: event.target.value }))
                  }
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Recipient</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name ?? user.username ?? user.id}
                    </option>
                  ))}
                </select>
                <input
                  value={notificationForm.title}
                  onChange={(event) =>
                    setNotificationForm((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder="Notification title"
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
                <textarea
                  value={notificationForm.message}
                  onChange={(event) =>
                    setNotificationForm((current) => ({ ...current, message: event.target.value }))
                  }
                  placeholder="Update message"
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <Button type="submit">
                  <Send className="mr-2 h-4 w-4" />
                  Send notification
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <Card className="border-border/70">
            <CardHeader>
              <h2 className="font-display text-2xl font-bold">Landing page content</h2>
              <p className="text-sm text-muted-foreground">
                Update the business information shown across the public site and contact footer.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveContent} className="space-y-3">
                <select
                  value={contentForm.key}
                  onChange={(event) => {
                    const nextKey = event.target.value;
                    setContentForm({ key: nextKey, value: site?.[nextKey] ?? "" });
                  }}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {contentOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="rounded-md border border-dashed border-border bg-secondary/20 p-3 text-xs text-muted-foreground">
                  Current key:{" "}
                  <span className="font-medium text-foreground">{contentForm.key}</span> · Preview:{" "}
                  {site?.[contentForm.key] ?? "No saved value yet"}
                </div>
                <textarea
                  value={contentForm.value}
                  onChange={(event) =>
                    setContentForm((current) => ({ ...current, value: event.target.value }))
                  }
                  placeholder={site?.[contentForm.key] ?? "Content value"}
                  rows={5}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <Button type="submit">
                  <Save className="mr-2 h-4 w-4" />
                  Save content
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card className="border-border/70">
            <CardHeader>
              <h2 className="font-display text-2xl font-bold">Delivery fulfilment</h2>
              <p className="text-sm text-muted-foreground">
                Update customer-facing status after payment/order approval.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {liveOrders
                .filter(
                  (order) => order.status !== "pending" && order.status !== "pending_approval",
                )
                .map((order) => (
                  <div key={order.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{order.customer_name}</span>
                      <Badge>{order.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {order.delivery_address ?? "No delivery address"} · Expected{" "}
                      {order.expected_delivery_at ?? "Not set"}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <select
                        value={deliveryStatus}
                        onChange={(event) => setDeliveryStatus(event.target.value)}
                        className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                      >
                        <option value="processing">Processing</option>
                        <option value="ready">Ready</option>
                        <option value="shipped">Shipped</option>
                        <option value="out_for_delivery">Out for delivery</option>
                        <option value="delivered">Delivered</option>
                      </select>
                      <Button size="sm" onClick={() => void updateDelivery(order.id)}>
                        Update
                      </Button>
                    </div>
                  </div>
                ))}
              {operationMessage && <p className="text-sm text-primary">{operationMessage}</p>}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-10 border-border/70">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold">User management</h2>
                <p className="text-sm text-muted-foreground">
                  Review registered accounts and contact details needed for fulfilment.
                </p>
              </div>
              <Badge variant="secondary">{users.length} profiles</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {users.map((user) => (
              <div key={user.id} className="rounded-lg border border-border bg-background p-3">
                <p className="font-medium">{user.full_name ?? "Unnamed user"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {user.username ?? "No username"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{user.phone ?? "No phone"}</p>
                <Badge
                  className="mt-2"
                  variant={user.account_status === "deactivated" ? "destructive" : "secondary"}
                >
                  {user.account_status ?? "active"}
                </Badge>
                <div className="mt-3 grid gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setNotificationForm((current) => ({ ...current, userId: user.id }))
                    }
                  >
                    Notify user
                  </Button>
                  <Button
                    size="sm"
                    variant={user.account_status === "deactivated" ? "default" : "destructive"}
                    onClick={() =>
                      void setUserAccountState(
                        user.id,
                        user.account_status === "deactivated" ? "active" : "deactivated",
                      )
                    }
                  >
                    {user.account_status === "deactivated"
                      ? "Reactivate account"
                      : "Deactivate account"}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="mt-10 rounded-2xl border border-border bg-primary px-6 py-10 text-primary-foreground">
          <h2 className="font-display text-3xl font-bold">Ready for the next centre update?</h2>
          <p className="mt-3 max-w-2xl text-sm opacity-90">
            Use the admin tools to keep the website, classes and student information aligned with
            the real centre operations.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/shop">
              <Button variant="secondary">Review public shop</Button>
            </Link>
            <Link to="/dashboard">
              <Button
                variant="outline"
                className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
              >
                View student area
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "30-day revenue",
            value: `Le ${Number(dailyAnalytics?.revenue ?? 0).toLocaleString()}`,
          },
          { label: "Orders captured", value: String(dailyAnalytics?.orders ?? 0) },
          { label: "Approved orders", value: String(dailyAnalytics?.paidOrders ?? 0) },
          { label: "Physical units sold", value: String(dailyAnalytics?.units ?? 0) },
        ].map((metric) => (
          <Card key={metric.label} className="border-primary/15 bg-primary/5">
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground">{metric.label}</p>
              <p className="mt-1 font-display text-xl font-bold text-primary">{metric.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}

type ChatMessage = {
  id: string;
  threadId: string;
  studentId: string;
  studentName: string;
  studentApprovalStatus: string;
  from: "student" | "admin";
  message: string;
  timestamp: string;
};

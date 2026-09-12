import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Bell, CreditCard, Package, ShoppingBag, Star, Truck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { findOrCreateSupportThread, loadOwnChatMessages, sendChatMessage } from "@/lib/chat";
import { formatPrice } from "@/lib/format";
import { productsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/customer")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw redirect({ to: "/auth" });
    }
  },
  head: () => ({ meta: [{ title: "Customer Dashboard | K-Lunsar Computer Training" }] }),
  component: CustomerPage,
});

function CustomerPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { add } = useCart();
  const [feedback, setFeedback] = useState({ title: "", body: "", rating: 5 });
  const [messageText, setMessageText] = useState("");
  const [chatMessages, setChatMessages] = useState<
    Array<{ from: "You" | "Admin"; message: string; timestamp: string }>
  >([]);

  const { data: products = [] } = useQuery(productsQuery);
  const { data: orders = [] } = useQuery({
    queryKey: ["customer-orders", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () =>
      (
        await supabase
          .from("orders")
          .select(
            "id,total,amount_paid,balance_due,status,payment_status,rejection_reason,delivery_status,delivery_visible,expected_delivery_at,created_at,order_items(name,quantity,unit_price)",
          )
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
      ).data ?? [],
  });
  const { data: notifications = [] } = useQuery({
    queryKey: ["customer-notifications", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () =>
      (
        await supabase
          .from("user_notifications")
          .select("id,title,message,created_at")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(5)
      ).data ?? [],
  });
  const { data: serviceRequests = [] } = useQuery({
    queryKey: ["customer-service-requests", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () =>
      (
        await supabase
          .from("service_requests")
          .select("id, service_name, message, status, created_at")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(5)
      ).data ?? [],
  });

  useEffect(() => {
    if (!user?.id) return;

    void loadOwnChatMessages(user.id)
      .then((messages) => {
        const mapped = messages.map((message) => ({
          from: message.sender_id === user.id ? "You" : "Admin",
          message: message.message,
          timestamp: message.created_at,
        }));
        setChatMessages(mapped.slice(-8));
      })
      .catch(() => undefined);
  }, [user?.id]);

  const submitFeedback = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    const { error } = await supabase.from("customer_feedback").insert({
      user_id: user.id,
      title: feedback.title.trim(),
      message: feedback.body.trim(),
      rating: feedback.rating,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Feedback submitted for moderation.");
    setFeedback({ title: "", body: "", rating: 5 });
  };

  const cancelOrder = async (orderId: string) => {
    const { error } = await supabase.rpc("transition_order_status", {
      _order_id: orderId,
      _next_status: "cancelled",
      _reason: "Customer cancelled from dashboard.",
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["customer-orders"] });
    toast.success("Order cancelled and marked for review.");
  };

  const sendCustomerMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !messageText.trim()) return;

    try {
      const threadId = await findOrCreateSupportThread(user.id, "customer");
      const saved = await sendChatMessage(threadId, user.id, messageText.trim());
      setChatMessages((current) => [
        ...current,
        { from: "You", message: saved.message, timestamp: saved.created_at },
      ]);
      setMessageText("");
      toast.success("Message sent to the admin desk.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Your message could not be sent.");
    }
  };

  const activeOrders = orders.filter(
    (order) => !["completed", "cancelled", "rejected"].includes(order.status),
  );
  const pendingPayments = orders.filter((order) => order.payment_status !== "approved").length;
  const visibleDeliveries = orders.filter((order) => order.delivery_visible).length;
  const featuredProducts = (
    products as Array<{
      id: string;
      name: string;
      price: number | string;
      description: string;
      category?: string;
      stock?: number | null;
      discount_percent?: number | null;
      allow_individual_payment?: boolean;
      attributes?: Record<string, string> | null;
    }>
  ).slice(0, 4);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-14">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Customer dashboard
        </p>
        <h1 className="mt-2 text-4xl font-bold">Welcome back</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Manage purchases, payments, deliveries, order approval, service requests and support from
          one place.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-4">
        <Metric
          label="Active orders"
          value={String(activeOrders.length)}
          icon={<ShoppingBag className="h-4 w-4" />}
        />
        <Metric
          label="Pending payments"
          value={String(pendingPayments)}
          icon={<CreditCard className="h-4 w-4" />}
        />
        <Metric
          label="Deliveries"
          value={String(visibleDeliveries)}
          icon={<Truck className="h-4 w-4" />}
        />
        <Metric
          label="Purchase history"
          value={String(orders.length)}
          icon={<Star className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <Card className="border-border/70">
          <CardHeader className="flex flex-row items-center justify-between">
            <h2 className="text-xl font-bold">Orders, payments and delivery</h2>
            <Link to="/checkout" className="text-sm font-medium text-primary">
              Checkout <ArrowRight className="ml-1 inline h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {orders.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                No orders yet. Visit the shop and add your first item.
              </div>
            ) : (
              orders.slice(0, 6).map((order) => (
                <div key={order.id} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">Order {order.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={order.status === "rejected" ? "destructive" : "secondary"}>
                      {order.status}
                    </Badge>
                  </div>

                  <div className="mt-3 space-y-2 text-sm text-foreground/90">
                    <p>
                      Total {formatPrice(Number(order.total))} · Paid{" "}
                      {formatPrice(Number(order.amount_paid))} · Balance{" "}
                      {formatPrice(Number(order.balance_due))}
                    </p>
                    <p>
                      Payment:{" "}
                      <span className="font-medium">
                        {String(order.payment_status ?? "pending")}
                      </span>{" "}
                      · Delivery:{" "}
                      <span className="font-medium">
                        {String(order.delivery_status ?? order.status)}
                      </span>
                    </p>
                    {order.rejection_reason && (
                      <p className="text-xs text-red-600">Reason: {order.rejection_reason}</p>
                    )}
                    {order.delivery_visible && (
                      <p className="text-xs text-muted-foreground">
                        Delivery status: {order.delivery_status ?? "pending"} · Expected{" "}
                        {order.expected_delivery_at ?? "to be confirmed"}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link to="/orders/$orderId" params={{ orderId: order.id }}>
                      <Button size="sm" variant="outline">
                        View details
                      </Button>
                    </Link>
                    {!["completed", "cancelled", "rejected"].includes(order.status) && (
                      <Button size="sm" variant="ghost" onClick={() => void cancelOrder(order.id)}>
                        Cancel order
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <h2 className="text-xl font-bold">Notifications</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {notifications.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No updates yet. We will notify you when your order is approved or updated.
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="rounded-lg border border-border bg-secondary/30 p-3"
                >
                  <div className="flex items-center gap-2 text-primary">
                    <Bell className="h-4 w-4" />
                    <p className="font-medium">{notification.title}</p>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{notification.message}</p>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
        <Card className="border-border/70">
          <CardHeader>
            <h2 className="text-xl font-bold">Request services</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Need tutoring, exam help, certification guidance, or a custom consultation? Submit a
              service request and the admin team will review it.
            </p>
            <Link to="/services" className="inline-block">
              <Button>
                Request service <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>

            {serviceRequests.length > 0 && (
              <div className="space-y-3 pt-2">
                {serviceRequests.slice(0, 3).map((request) => (
                  <div
                    key={request.id}
                    className="rounded-lg border border-border bg-background p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{request.service_name}</p>
                      <Badge variant={request.status === "rejected" ? "destructive" : "secondary"}>
                        {request.status}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{request.message}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <h2 className="text-xl font-bold">Support chat</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 rounded-xl border border-border bg-primary/5 p-3">
              {chatMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Ask a question about your order, payment proof or delivery.
                </p>
              ) : (
                chatMessages.map((entry, index) => (
                  <div
                    key={`${entry.from}-${index}`}
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                      entry.from === "You"
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "bg-background text-foreground border border-border"
                    }`}
                  >
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] opacity-80">
                      {entry.from}
                    </p>
                    <p>{entry.message}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={sendCustomerMessage} className="mt-4 flex gap-2">
              <input
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                placeholder="Ask the admin team..."
              />
              <Button type="submit" size="sm">
                Send
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="border-border/70">
          <CardHeader>
            <h2 className="text-xl font-bold">Browse products</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {featuredProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3"
              >
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.description}</p>
                  {product.stock != null && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {product.stock === 0 ? "Out of stock" : `${product.stock} in stock`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-display text-lg font-semibold text-primary">
                    {formatPrice(product.price)}
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (product.stock === 0) {
                        toast.error(`${product.name} is out of stock.`);
                        return;
                      }
                      add({
                        productId: product.id,
                        name: product.name,
                        price: Number(product.price),
                        category: product.category ?? "item",
                        attributes: product.attributes ?? undefined,
                        stock: product.stock,
                        discountPercent: Number(product.discount_percent ?? 0),
                        allowIndividualPayment: product.allow_individual_payment ?? true,
                      });
                      toast.success(`${product.name} added to your cart.`);
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>
            ))}

            <div className="flex flex-wrap gap-2 pt-2">
              <Link to="/shop">
                <Button variant="outline">View all products</Button>
              </Link>
              <Link to="/cart">
                <Button variant="secondary">View cart</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <h2 className="text-xl font-bold">Feedback and recommendations</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitFeedback} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <input
                  value={feedback.title}
                  onChange={(event) =>
                    setFeedback((current) => ({ ...current, title: event.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="What did you buy or use?"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Message</label>
                <textarea
                  value={feedback.body}
                  onChange={(event) =>
                    setFeedback((current) => ({ ...current, body: event.target.value }))
                  }
                  className="mt-1 min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Share feedback, suggestions or a recommendation"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Rating</label>
                <div className="mt-2 flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFeedback((current) => ({ ...current, rating: value }))}
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                        feedback.rating >= value
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full">
                Send feedback
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="border-border/70">
      <CardContent className="flex items-center gap-3 py-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-display text-lg font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

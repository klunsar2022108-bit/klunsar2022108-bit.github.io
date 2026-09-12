import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { MessageCircle, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/orders/$orderId")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/auth" });
  },
  head: () => ({ meta: [{ title: "Order Details | K-Lunsar" }] }),
  component: OrderDetailPage,
});
function OrderDetailPage() {
  const { orderId } = Route.useParams();
  const [message, setMessage] = useState("");
  const { data: order } = useQuery({
    queryKey: ["order-detail", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id,total,amount_paid,balance_due,status,payment_status,rejection_reason,delivery_status,delivery_address,expected_delivery_at,customer_confirmed_at,order_items(name,quantity,unit_price),order_delivery_events(status,note,created_at)",
        )
        .eq("id", orderId)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
  });
  const { data: messages = [], refetch } = useQuery({
    queryKey: ["order-chat", orderId],
    queryFn: async () =>
      (
        await supabase
          .from("order_chats")
          .select("id,message,sender_id,created_at")
          .eq("order_id", orderId)
          .order("created_at")
      ).data ?? [],
  });
  const confirm = async () => {
    const { error } = await supabase.rpc("confirm_customer_delivery", { _order_id: orderId });
    if (error) toast.error(error.message);
    else toast.success("Delivery confirmed.");
  };
  const send = async (event: FormEvent) => {
    event.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !message.trim()) return;
    const { error } = await supabase
      .from("order_chats")
      .insert({ order_id: orderId, sender_id: user.id, message: message.trim() });
    if (error) toast.error(error.message);
    else {
      setMessage("");
      await refetch();
    }
  };
  if (!order)
    return (
      <div className="mx-auto max-w-3xl px-4 py-14">
        <p>Loading order...</p>
      </div>
    );
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-14">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Order details
        </p>
        <h1 className="mt-2 text-4xl font-bold">Order {order.id.slice(0, 8)}</h1>
        <Badge className="mt-3">{order.status}</Badge>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="flex items-center gap-2 font-bold">
              <PackageCheck className="h-5 w-5 text-primary" />
              Payment and delivery
            </h2>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>Total: Le {Number(order.total).toLocaleString()}</p>
            <p>Paid: Le {Number(order.amount_paid).toLocaleString()}</p>
            <p>Balance: Le {Number(order.balance_due).toLocaleString()}</p>
            <p>Payment: {order.payment_status}</p>
            <p>Address: {order.delivery_address || "Not provided"}</p>
            <p>Expected: {order.expected_delivery_at || "To be confirmed"}</p>
            <p>Delivery: {order.delivery_status || "Not visible yet"}</p>
            {order.delivery_status === "delivered" && !order.customer_confirmed_at && (
              <Button onClick={confirm}>Confirm delivery received</Button>
            )}
            {order.rejection_reason && (
              <p className="rounded bg-red-50 p-3 text-red-700">Reason: {order.rejection_reason}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="flex items-center gap-2 font-bold">
              <MessageCircle className="h-5 w-5 text-primary" />
              Order chat
            </h2>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {messages.map((item) => (
                <div key={item.id} className="rounded border p-2 text-sm">
                  {item.message}
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            <form onSubmit={send} className="mt-3 flex gap-2">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message Admin"
                className="h-9 flex-1 rounded border bg-background px-3 text-sm"
              />
              <Button type="submit">Send</Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <h2 className="font-bold">Items and delivery history</h2>
        </CardHeader>
        <CardContent className="space-y-2">
          {(order.order_items ?? []).map((item) => (
            <div key={item.name} className="flex justify-between rounded border p-2 text-sm">
              <span>
                {item.name} × {item.quantity}
              </span>
              <span>Le {(Number(item.unit_price) * item.quantity).toLocaleString()}</span>
            </div>
          ))}
          {(order.order_delivery_events ?? []).map((event) => (
            <p
              key={`${event.created_at}-${event.status}`}
              className="text-xs text-muted-foreground"
            >
              {new Date(event.created_at).toLocaleString()} · {event.status} · {event.note}
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

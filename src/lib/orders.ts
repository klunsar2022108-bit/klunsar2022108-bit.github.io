import { supabase } from "@/integrations/supabase/client";
import type { CartLine } from "@/lib/cart";
import { notifyAdmins, notifyUser } from "@/lib/notifications";

function isUuid(value: string | null | undefined) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

export async function createOrderFromCart({
  lines,
  userId,
  customerName,
  customerPhone,
  deliveryAddress,
  notes,
  paymentMethod,
  paymentProof,
  paymentReference,
  amountPaid,
  selectedProductIds,
}: {
  lines: CartLine[];
  userId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress?: string;
  notes?: string;
  paymentMethod?: string;
  paymentProof?: string | null;
  paymentReference?: string;
  amountPaid: number;
  selectedProductIds?: string[];
}) {
  if (!lines.length) {
    throw new Error("Your cart is empty.");
  }

  if (!customerName.trim()) {
    throw new Error("Please provide the learner name.");
  }

  if (!customerPhone.trim()) {
    throw new Error("Please provide a contact phone number.");
  }

  const payableLines = selectedProductIds?.length
    ? lines.filter((line) => selectedProductIds.includes(line.productId))
    : lines;
  if (!payableLines.length) throw new Error("Select at least one item to pay for.");
  if (
    selectedProductIds?.length &&
    payableLines.length < lines.length &&
    payableLines.some((line) => line.allowIndividualPayment === false)
  ) {
    throw new Error("One or more selected products must be paid for with the whole cart.");
  }

  const subtotal = payableLines.reduce((sum, line) => sum + line.quantity * Number(line.price), 0);
  const discountTotal = payableLines.reduce(
    (sum, line) =>
      sum +
      (line.quantity * Number(line.price) * Math.min(Math.max(line.discountPercent ?? 0, 0), 100)) /
        100,
    0,
  );
  const total = subtotal - discountTotal;
  const expectedDeliveryAt = payableLines.some((line) => line.category === "item")
    ? new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    : null;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: userId,
      subtotal,
      discount_total: discountTotal,
      total,
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      delivery_address: deliveryAddress?.trim() ?? "",
      notes: notes?.trim() ?? "",
      status: "pending_approval",
      payment_method: paymentMethod ?? null,
      payment_status: paymentProof || paymentReference ? "awaiting_verification" : "pending",
      payment_proof: paymentProof ?? null,
      payment_reference: paymentReference?.trim() ?? null,
      amount_paid: amountPaid,
      balance_due: Math.max(total - amountPaid, 0),
      expected_delivery_at: expectedDeliveryAt,
      delivery_visible: false,
      sales_channel: "online",
    })
    .select("id")
    .single();

  if (orderError || !order) {
    throw new Error(orderError?.message ?? "The order could not be created.");
  }

  const items = payableLines.map((line) => ({
    order_id: order.id,
    product_id: isUuid(line.productId) ? line.productId : null,
    name: line.name,
    unit_price: Number(line.price),
    quantity: line.quantity,
    discount_percent: line.discountPercent ?? 0,
    discount_amount:
      (line.quantity * Number(line.price) * Math.min(Math.max(line.discountPercent ?? 0, 0), 100)) /
      100,
    attributes: line.attributes ?? {},
    item_type: line.category === "path" ? "programme" : (line.category ?? "product"),
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(items);

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  if (paymentMethod) {
    const { error: paymentError } = await supabase.from("order_payments").insert({
      order_id: order.id,
      amount: total,
      expected_amount: total,
      amount_paid: amountPaid,
      method: paymentMethod,
      status: "pending",
      proof: paymentProof ?? null,
      reference: paymentReference?.trim() ?? null,
    });
    if (paymentError) throw new Error(paymentError.message);
  }

  await Promise.all([
    notifyUser(
      userId,
      "Order submitted for review",
      `Order ${order.id} was submitted for approval. Payment status: awaiting verification.`,
      "order",
    ),
    notifyAdmins(
      "New order awaiting review",
      `${customerName.trim()} submitted order ${order.id} for ${total.toFixed(2)}. Review the payment proof before approval.`,
      "payment",
    ),
  ]);

  return {
    id: order.id,
    total,
  };
}

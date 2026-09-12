import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import {
  CheckCircle2,
  CreditCard,
  ShieldCheck,
  ShoppingBag,
  Upload,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { createOrderFromCart } from "@/lib/orders";
import { supabase } from "@/integrations/supabase/client";
import type { FormEvent } from "react";

export const Route = createFileRoute("/checkout")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await import("@/integrations/supabase/client").then(({ supabase }) =>
      supabase.auth.getSession(),
    );

    if (!session) {
      throw redirect({ to: "/auth" });
    }
  },
  head: () => ({
    meta: [
      { title: "Checkout | K-Lunsar Computer Training" },
      {
        name: "description",
        content:
          "Secure checkout for course enrolments, services and learning materials at K-Lunsar Computer Training.",
      },
      { property: "og:title", content: "Checkout | K-Lunsar Computer Training" },
      {
        property: "og:description",
        content: "Confirm your order before completing enrolment and support payments.",
      },
    ],
  }),
  component: CheckoutPage,
});

const PAYMENT_METHODS = [
  {
    id: "mobile-money",
    label: "Mobile Money",
    provider: "Orange Money, Africell, etc",
    requiresProof: true,
  },
  { id: "bank-transfer", label: "Bank Transfer", provider: "Any local bank", requiresProof: true },
  { id: "cash", label: "Cash Payment", provider: "Pay at centre", requiresProof: false },
];

function CheckoutPage() {
  const { lines, total, selectedProductIds, clear } = useCart();
  const { user } = useAuth();
  const [completed, setCompleted] = useState(false);
  const [customerName, setCustomerName] = useState(
    user?.user_metadata?.full_name ?? user?.email ?? "",
  );
  const [customerPhone, setCustomerPhone] = useState(user?.phone ?? "");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("mobile-money");
  const [paymentProof, setPaymentProof] = useState("");
  const [proofFileName, setProofFileName] = useState("");
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentReference, setPaymentReference] = useState("");

  const selectedMethod = PAYMENT_METHODS.find((m) => m.id === paymentMethod);
  const payableLines = selectedProductIds.length
    ? lines.filter((line) => selectedProductIds.includes(line.productId))
    : lines;
  const checkoutTotal = payableLines.reduce(
    (sum, line) =>
      sum +
      line.quantity *
        Number(line.price) *
        (1 - Math.min(Math.max(line.discountPercent ?? 0, 0), 100) / 100),
    0,
  );
  const requiresDelivery = payableLines.some((line) => line.category === "item");
  const requiresProof = selectedMethod?.requiresProof;
  const canSubmit =
    customerName.trim().length > 0 &&
    customerPhone.trim().length > 0 &&
    (!requiresDelivery || deliveryAddress.trim().length > 0) &&
    Number(amountPaid || 0) > 0 &&
    Number(amountPaid || 0) <= checkoutTotal &&
    paymentReference.trim().length > 0 &&
    (!requiresProof || paymentProof.trim().length > 0) &&
    !submitting;

  const handleProofUpload = (event: FormEvent<HTMLInputElement>) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Payment proof must be 5MB or smaller.");
      return;
    }

    setProofFileName(file.name);
    setPaymentProofFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPaymentProof(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  if (completed) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14">
        <Card className="border-border/70">
          <CardContent className="space-y-5 py-12 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="h-8 w-8" />
            </span>
            <div>
              <h1 className="text-3xl font-bold">Order placed successfully</h1>
              <p className="mt-3 text-muted-foreground">
                Your order has been received and submitted for approval. The centre team will review
                your payment and confirm your shift and next steps within 24 hours. You'll receive
                an email notification when your order is approved.
              </p>
            </div>
            <div className="mt-6 rounded-lg border border-border bg-secondary/30 p-4 text-left">
              <p className="text-sm font-medium text-foreground">What happens next:</p>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                <li>✓ Your payment proof has been submitted</li>
                <li>✓ Admin will review and approve your order</li>
                <li>✓ You'll receive email confirmation</li>
                <li>✓ Track your order status in your dashboard</li>
              </ul>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/dashboard">
                <Button>View dashboard</Button>
              </Link>
              <Link to="/shop">
                <Button variant="outline">Continue shopping</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14">
        <Card className="border-border/70">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Your cart is empty, so there is nothing to check out.
            </p>
            <Link to="/shop" className="mt-5 inline-block">
              <Button>Browse the shop</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleConfirmOrder = async () => {
    if (!user) {
      toast.error("Please sign in or register before placing the order.");
      return;
    }

    if (!canSubmit) {
      toast.error("Please complete all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      let proofPath: string | null = null;
      if (requiresProof && paymentProofFile && user) {
        proofPath = `${user.id}/${crypto.randomUUID()}-${paymentProofFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: uploadError } = await supabase.storage
          .from("payment-proofs")
          .upload(proofPath, paymentProofFile, {
            contentType: paymentProofFile.type,
            upsert: false,
          });
        if (uploadError) throw new Error(uploadError.message);
      }
      const orderData = {
        lines: payableLines,
        userId: user.id,
        customerName,
        customerPhone,
        deliveryAddress,
        notes,
        paymentMethod,
        paymentProof: proofPath,
        paymentReference,
        amountPaid: Number(amountPaid),
        selectedProductIds: payableLines.map((line) => line.productId),
        status: "pending_approval" as const,
        paymentStatus: "awaiting_verification" as const,
      };

      await createOrderFromCart(orderData);
      clear();
      setCompleted(true);
      toast.success("Order submitted for approval. Check your email for updates.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "The order could not be saved.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Checkout</p>
      <h1 className="mt-2 text-4xl font-bold">Review and complete your order</h1>
      <p className="mt-2 text-muted-foreground">
        Provide your details, select a payment method, and submit your order for approval.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          {/* Customer Details */}
          <Card className="border-border/70">
            <CardContent className="space-y-4 py-6">
              <h2 className="font-display text-lg font-bold">Your Details</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="customer-name" className="text-sm font-medium text-foreground">
                    Full Name *
                  </label>
                  <Input
                    id="customer-name"
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder="Full name"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="customer-phone" className="text-sm font-medium text-foreground">
                    Contact Phone *
                  </label>
                  <Input
                    id="customer-phone"
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    placeholder="+232 ..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="delivery-address" className="text-sm font-medium text-foreground">
                  Delivery Address {requiresDelivery ? "*" : "(for physical items)"}
                </label>
                <Input
                  id="delivery-address"
                  value={deliveryAddress}
                  onChange={(event) => setDeliveryAddress(event.target.value)}
                  placeholder="Street address, city, postal code"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="notes" className="text-sm font-medium text-foreground">
                  Notes for the Centre
                </label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  placeholder="Preferred shift, special requirements, or any additional information..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment Method Selection */}
          <Card className="border-border/70">
            <CardContent className="space-y-4 py-6">
              <h2 className="font-display text-lg font-bold">Payment Method</h2>
              <p className="text-sm text-muted-foreground">Select how you'll pay for this order:</p>

              <div className="space-y-3">
                {PAYMENT_METHODS.map((method) => (
                  <div
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                      paymentMethod === method.id
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{method.label}</p>
                        <p className="text-sm text-muted-foreground">{method.provider}</p>
                      </div>
                      {method.requiresProof && <Badge variant="secondary">Proof required</Badge>}
                    </div>
                  </div>
                ))}
              </div>

              {requiresProof && (
                <div className="space-y-2 rounded-lg border border-border bg-secondary/30 p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Payment Proof Required</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Please upload a screenshot or image of your transaction proof (receipt,
                        confirmation code, etc.)
                      </p>
                    </div>
                  </div>

                  <label className="mt-3 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-background p-6 cursor-pointer hover:border-primary/50 transition-colors">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      {proofFileName ? `Selected: ${proofFileName}` : "Upload payment proof"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      JPG, PNG, or PDF up to 5MB
                    </span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleProofUpload}
                      className="hidden"
                      required={requiresProof}
                    />
                  </label>

                  {proofFileName && (
                    <p className="text-xs text-green-600">✓ Proof uploaded: {proofFileName}</p>
                  )}
                </div>
              )}

              <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium">
                  Amount paid *
                  <Input
                    type="number"
                    min="0"
                    max={checkoutTotal}
                    step="0.01"
                    value={amountPaid}
                    onChange={(event) => setAmountPaid(event.target.value)}
                    placeholder={String(checkoutTotal)}
                  />
                  <span className="block text-xs font-normal text-muted-foreground">
                    Expected total: {formatPrice(checkoutTotal)}
                  </span>
                </label>
                <label className="space-y-2 text-sm font-medium">
                  Transaction reference *
                  <Input
                    value={paymentReference}
                    onChange={(event) => setPaymentReference(event.target.value)}
                    placeholder="Receipt or transaction ID"
                  />
                  <span className="block text-xs font-normal text-muted-foreground">
                    Used by admin to verify the payment.
                  </span>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card className="border-border/70">
            <CardContent className="space-y-4 py-6">
              <h2 className="font-display text-lg font-bold">Order Items</h2>
              <div className="space-y-3">
                {lines.map((line) => (
                  <div
                    key={line.productId}
                    className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background p-3"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{line.name}</p>
                      <p className="text-sm text-muted-foreground">Qty: {line.quantity}</p>
                    </div>
                    <p className="font-display font-semibold text-primary">
                      {formatPrice(line.price * line.quantity)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary Sidebar */}
        <Card className="border-border/70 bg-secondary/40 h-fit">
          <CardContent className="space-y-5 py-6">
            <div className="flex items-center gap-2 text-primary">
              <ShoppingBag className="h-4 w-4" />
              <span className="font-display text-lg font-semibold">Order Summary</span>
            </div>

            <div className="space-y-3 border-b border-border pb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Items ({payableLines.reduce((sum, line) => sum + line.quantity, 0)})
                </span>
                <span className="font-medium">{formatPrice(checkoutTotal)}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Discount</span>
                <span className="font-medium text-green-600">Le 0</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Delivery</span>
                <span className="font-medium">TBD</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-display font-bold text-foreground">Total Amount</span>
              <span className="font-display text-2xl font-bold text-primary">
                {formatPrice(checkoutTotal)}
              </span>
            </div>

            <div className="space-y-3 rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>Secure order submission</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <span>Payment verified by admin</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>Approval notification sent</span>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-background p-4 text-xs">
              <p className="font-medium text-foreground">Order Status:</p>
              <p className="text-muted-foreground mt-1">Pending Admin Approval</p>
              <Badge variant="secondary" className="mt-2">
                Not yet submitted
              </Badge>
            </div>

            <Button onClick={handleConfirmOrder} disabled={!canSubmit} className="w-full" size="lg">
              {submitting ? "Submitting..." : "Submit Order for Approval"}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              By submitting, you agree to our terms and acknowledge that your order will be reviewed
              by the centre within 24 hours.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

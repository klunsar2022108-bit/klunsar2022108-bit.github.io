import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart | K-Lunsar Computer Training" },
      {
        name: "description",
        content: "Review your selected course paths, services and items before checkout.",
      },
      { property: "og:title", content: "Your cart | K-Lunsar Computer Training" },
      { property: "og:description", content: "Review your enrolment selections before checkout." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const {
    lines,
    subtotal,
    discountTotal,
    total,
    selectedProductIds,
    setQuantity,
    toggleSelected,
    remove,
    clear,
  } = useCart();
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <h1 className="text-3xl font-bold">Your cart</h1>

      {lines.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="py-14 text-center">
            <p className="text-muted-foreground">Your cart is empty.</p>
            <Link to="/shop" className="mt-5 inline-block">
              <Button>Browse the shop</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mt-8 space-y-3">
            {lines.map((line) => (
              <Card key={line.productId}>
                <CardContent className="flex flex-wrap items-center gap-4 py-5">
                  <input
                    type="checkbox"
                    checked={selectedProductIds.includes(line.productId)}
                    onChange={() => toggleSelected(line.productId)}
                    aria-label={`Pay for ${line.name} individually`}
                    disabled={line.allowIndividualPayment === false}
                    className="h-4 w-4 accent-primary"
                  />
                  <div className="min-w-40 flex-1">
                    <p className="font-medium">{line.name}</p>
                    <p className="text-sm text-muted-foreground">{formatPrice(line.price)} each</p>
                    {line.attributes &&
                      Object.entries(line.attributes).map(([key, value]) => (
                        <span key={key} className="mr-2 text-xs text-muted-foreground">
                          {key}: {value}
                        </span>
                      ))}
                    {line.stock != null && line.stock <= 5 && (
                      <p className="text-xs text-amber-700">Only {line.stock} left</p>
                    )}
                    {line.allowIndividualPayment === false && (
                      <p className="text-xs text-muted-foreground">Whole-cart payment required</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label={`Reduce quantity of ${line.name}`}
                      onClick={() => setQuantity(line.productId, line.quantity - 1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center text-sm font-semibold">{line.quantity}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label={`Increase quantity of ${line.name}`}
                      onClick={() => setQuantity(line.productId, line.quantity + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="w-28 text-right font-display font-semibold">
                    {formatPrice(line.price * line.quantity)}
                  </p>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Remove ${line.name}`}
                    onClick={() => remove(line.productId)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-secondary/40 p-6">
            <div>
              <p className="text-sm text-muted-foreground">Subtotal</p>
              <p className="text-sm text-muted-foreground">{formatPrice(subtotal)}</p>
              <p className="text-sm text-green-700">Discounts: -{formatPrice(discountTotal)}</p>
              <p className="mt-1 text-sm text-muted-foreground">Grand total</p>
              <p className="font-display text-2xl font-bold text-primary">{formatPrice(total)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Select items above to pay for selected items only.
              </p>
              {!user && (
                <p className="mt-1 text-xs text-muted-foreground">
                  You will be asked to sign in or register at checkout so we can save your order.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={clear}>
                Clear cart
              </Button>
              <Link to="/checkout">
                <Button>Checkout</Button>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

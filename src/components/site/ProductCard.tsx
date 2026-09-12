import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";

export type ShopProduct = {
  id: string;
  name: string;
  description: string;
  details: string;
  price: number | string;
  category: string;
  sector?: string | null;
  badge: string | null;
  attributes?: Record<string, string> | null;
  stock?: number | null;
  discount_percent?: number | null;
  allow_individual_payment?: boolean;
};

export function ProductCard({ product }: { product: ShopProduct }) {
  const { add } = useCart();

  return (
    <Card className="flex h-full flex-col border-border/70 transition-shadow hover:shadow-lg">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-base font-semibold leading-snug">{product.name}</h3>
          <div className="flex shrink-0 flex-wrap justify-end gap-1">
            {product.badge && <Badge className="shrink-0">{product.badge}</Badge>}
            {product.sector && (
              <Badge variant="outline" className="shrink-0 uppercase tracking-wide">
                {product.sector === "business" ? "Business" : "Student"}
              </Badge>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{product.description}</p>
      </CardHeader>
      <CardContent className="flex-1">
        <p className="text-sm leading-relaxed text-muted-foreground">{product.details}</p>
        {product.attributes && Object.keys(product.attributes).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(product.attributes).map(([key, value]) => (
              <Badge key={key} variant="outline">
                {key}: {value}
              </Badge>
            ))}
          </div>
        )}
        {product.stock != null && (
          <p
            className={`mt-3 text-xs font-medium ${product.stock <= 5 ? "text-amber-700" : "text-muted-foreground"}`}
          >
            {product.stock === 0 ? "Out of stock" : `${product.stock} in stock`}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-3 border-t border-border/60 pt-4">
        <span className="font-display text-lg font-bold text-primary">
          {formatPrice(product.price)}
        </span>
        <Button
          onClick={() => {
            if (product.stock === 0) {
              toast.error(`${product.name} is out of stock`);
              return;
            }
            add({
              productId: product.id,
              name: product.name,
              price: Number(product.price),
              category: product.category,
              attributes: product.attributes ?? undefined,
              stock: product.stock,
              discountPercent: Number(product.discount_percent ?? 0),
              allowIndividualPayment: product.allow_individual_payment ?? true,
            });
            toast.success(`${product.name} added to your cart`);
          }}
          disabled={product.stock === 0}
        >
          Add to cart
        </Button>
      </CardFooter>
    </Card>
  );
}

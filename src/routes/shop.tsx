import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ProductCard, type ShopProduct } from "@/components/site/ProductCard";
import { productsQuery } from "@/lib/queries";
import { useCart } from "@/lib/cart";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop & Fees | K-Lunsar Computer Training" },
      {
        name: "description",
        content:
          "Enrol in the Regular or Bonanza path, buy single courses, registration, exam resits, handbooks and private tutoring in Leones.",
      },
      { property: "og:title", content: "Shop & Fees | K-Lunsar Computer Training" },
      {
        property: "og:description",
        content: "Course paths, services and items with clear prices you can add to your cart.",
      },
    ],
  }),
  component: ShopPage,
});

const CATEGORY_FILTERS = [
  { key: "all", label: "Everything" },
  { key: "path", label: "Course paths" },
  { key: "course", label: "Single courses" },
  { key: "service", label: "Services" },
  { key: "item", label: "Items" },
];

const SECTOR_FILTERS = [
  { key: "all", label: "All sectors" },
  { key: "student", label: "Student sector" },
  { key: "business", label: "Business sector" },
];

function ShopPage() {
  const { data: products = [] } = useQuery(productsQuery);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sectorFilter, setSectorFilter] = useState("all");
  const { count } = useCart();

  const active = (products as (ShopProduct & { active: boolean; sector?: string | null })[]).filter(
    (p) => p.active,
  );
  const visible = active.filter((p) => {
    const matchesSector = sectorFilter === "all" || p.sector === sectorFilter;
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
    return matchesSector && matchesCategory;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Shop</p>
      <h1 className="mt-2 text-4xl font-bold">Enrol, or buy just what you need</h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        All prices are in Leones and set by the centre office. Add items to your cart, then sign in
        or create your student account at checkout so we can attach the order to your record.
      </p>

      <div className="mt-8 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {SECTOR_FILTERS.map((item) => (
            <Button
              key={item.key}
              size="sm"
              variant={sectorFilter === item.key ? "default" : "outline"}
              onClick={() => setSectorFilter(item.key)}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORY_FILTERS.map((item) => (
            <Button
              key={item.key}
              size="sm"
              variant={categoryFilter === item.key ? "default" : "outline"}
              onClick={() => setCategoryFilter(item.key)}
            >
              {item.label}
            </Button>
          ))}
          {count > 0 && (
            <Link to="/cart" className="ml-auto">
              <Button size="sm" variant="secondary">
                View cart ({count})
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {visible.length === 0 && (
        <p className="mt-10 text-sm text-muted-foreground">
          Nothing listed in this category yet. Please check back soon.
        </p>
      )}
    </div>
  );
}

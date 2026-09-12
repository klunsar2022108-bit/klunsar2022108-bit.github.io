import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartLine = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
  attributes?: Record<string, string>;
  stock?: number | null;
  discountPercent?: number;
  allowIndividualPayment?: boolean;
};

type CartValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  discountTotal: number;
  total: number;
  selectedProductIds: string[];
  add: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  toggleSelected: (productId: string) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "klunsar-cart-v1";

const CartContext = createContext<CartValue>({
  lines: [],
  count: 0,
  subtotal: 0,
  discountTotal: 0,
  total: 0,
  selectedProductIds: [],
  add: () => {},
  setQuantity: () => {},
  toggleSelected: () => {},
  remove: () => {},
  clear: () => {},
});

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw) as CartLine[]);
    } catch {
      /* ignore malformed cart */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, hydrated]);

  const value = useMemo<CartValue>(() => {
    return {
      lines,
      count: lines.reduce((sum, line) => sum + line.quantity, 0),
      subtotal: lines.reduce((sum, line) => sum + line.quantity * line.price, 0),
      discountTotal: lines.reduce(
        (sum, line) =>
          sum +
          (line.quantity * line.price * Math.min(Math.max(line.discountPercent ?? 0, 0), 100)) /
            100,
        0,
      ),
      total: lines.reduce(
        (sum, line) =>
          sum +
          line.quantity *
            line.price *
            (1 - Math.min(Math.max(line.discountPercent ?? 0, 0), 100) / 100),
        0,
      ),
      selectedProductIds,
      add: (line, quantity = 1) =>
        setLines((current) => {
          const existing = current.find((item) => item.productId === line.productId);
          const requestedQuantity = Math.max(1, quantity);
          const maxStock = line.stock == null ? null : Math.max(0, line.stock);
          if (existing) {
            return current.map((item) =>
              item.productId === line.productId
                ? {
                    ...item,
                    quantity:
                      maxStock == null
                        ? item.quantity + requestedQuantity
                        : Math.min(item.quantity + requestedQuantity, maxStock),
                  }
                : item,
            );
          }
          return [
            ...current,
            {
              ...line,
              quantity:
                maxStock == null ? requestedQuantity : Math.min(requestedQuantity, maxStock),
            },
          ];
        }),
      setQuantity: (productId, quantity) =>
        setLines((current) =>
          quantity <= 0
            ? current.filter((item) => item.productId !== productId)
            : current.map((item) =>
                item.productId === productId
                  ? {
                      ...item,
                      quantity:
                        item.stock == null ? quantity : Math.min(quantity, Math.max(0, item.stock)),
                    }
                  : item,
              ),
        ),
      toggleSelected: (productId) =>
        setSelectedProductIds((current) =>
          current.includes(productId)
            ? current.filter((id) => id !== productId)
            : [...current, productId],
        ),
      remove: (productId) =>
        setLines((current) => current.filter((i) => i.productId !== productId)),
      clear: () => setLines([]),
    };
  }, [lines, selectedProductIds]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}

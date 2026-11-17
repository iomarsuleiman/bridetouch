/** Pure price calculations shared by the checkout UI and Convex checkout. */
export type SaleLike = {
  active: boolean;
  startsAt: number;
  endsAt: number;
  percentOff: number;
  scope?: string;
  productNumbers?: number[];
  collectionNames?: string[];
};
export type CollectionLike = { name: string; productNumbers?: number[] };
export type SaleLine = { number: number; subtotal: number };

export function saleDiscount(
  lines: SaleLine[],
  sales: SaleLike[],
  collections: CollectionLike[],
  now: number,
): number {
  const eligible = sales.filter((sale) => sale.active && sale.startsAt <= now && now <= sale.endsAt);
  return lines.reduce((total, line) => {
    const bestPercent = eligible.reduce((max, sale) => {
      let match = !sale.scope || sale.scope === "all";
      if (sale.scope === "products") match = !!sale.productNumbers?.includes(line.number);
      if (sale.scope === "collections") {
        match = collections.some((collection) =>
          sale.collectionNames?.includes(collection.name) && collection.productNumbers?.includes(line.number));
      }
      return match ? Math.max(max, sale.percentOff) : max;
    }, 0);
    return total + Math.round(line.subtotal * bestPercent / 100);
  }, 0);
}

export function checkoutDiscount(
  lines: SaleLine[],
  coupon: { type: string; value: number } | null | undefined,
  sales: SaleLike[],
  collections: CollectionLike[],
  now: number,
) {
  const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0);
  const couponDiscount = !coupon ? 0 : coupon.type === "Percentage"
    ? Math.round(subtotal * coupon.value / 100)
    : Math.min(subtotal, coupon.value);
  return Math.min(subtotal, Math.max(couponDiscount, saleDiscount(lines, sales, collections, now)));
}

// Totals helpers ported from the vanilla preview's
// shippingTotal() / discountTotal() / cartTotal() in src/index.html.

export type SettingsLike = { shipping?: number; freeShipping?: boolean; freeShippingMin?: number } | undefined;
export type CouponLike = { type: string; value: number } | null | undefined;

export function shippingTotal(subtotal: number, settings: SettingsLike): number {
  return settings?.freeShipping && subtotal >= (settings?.freeShippingMin ?? 800) ? 0 : Number(settings?.shipping ?? 65);
}

export function discountTotal(subtotal: number, coupon: CouponLike, salePercent = 0): number {
  const couponDiscount = !coupon ? 0 : coupon.type === "Percentage" ? Math.round(subtotal*coupon.value/100) : Math.min(subtotal,coupon.value);
  return Math.min(subtotal,Math.max(couponDiscount,Math.round(subtotal*salePercent/100)));
}
export function cartTotal(subtotal:number, settings:SettingsLike, coupon:CouponLike, salePercent=0):number {
  return Math.max(0,subtotal+shippingTotal(subtotal,settings)-discountTotal(subtotal,coupon,salePercent));
}

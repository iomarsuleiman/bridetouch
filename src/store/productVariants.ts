/** Shared, pure storefront helpers: options and inventory must agree everywhere. */
export type VariantChoice = { values: string[]; stock: number; price?: number };
export type ConfigurableProduct = {
  price: number;
  stock: number;
  options?: { name: string; values: string[] }[];
  variants?: VariantChoice[];
};
export type ChosenVariant = { variant?: string[] };

export function variantKey(values?: string[]) {
  return JSON.stringify(values ?? []);
}

export function matchVariant(product: ConfigurableProduct, values?: string[]): VariantChoice | undefined {
  if (!product.options?.length || !values?.length) return undefined;
  return product.variants?.find((variant) => variantKey(variant.values) === variantKey(values));
}

export function availableStock(product: ConfigurableProduct, values?: string[]) {
  if (!product.options?.length) return product.stock;
  return matchVariant(product, values)?.stock ?? 0;
}

export function priceForVariant(product: ConfigurableProduct, values?: string[]) {
  return matchVariant(product, values)?.price ?? product.price;
}

export function variantLabel(product: ConfigurableProduct, values?: string[]) {
  if (!product.options?.length || !values?.length) return "";
  return product.options.map((option, i) => `${option.name}: ${values[i] ?? ""}`).join(" · ");
}

export function combinations(options: { name: string; values: string[] }[]): string[][] {
  return options.reduce<string[][]>((rows, option) =>
    rows.flatMap((row) => option.values.map((value) => [...row, value])), [[]]);
}

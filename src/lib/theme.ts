/** Store colors from Appearance settings, applied as CSS variables:
 *  --brand   main color: buttons, bag, banner, active menu item
 *  --accent  highlight color: italic headline, sale prices, badges */
export const DEFAULT_BRAND = "#355241";
export const DEFAULT_ACCENT = "#cb887a";

function mix(hex: string, other: string, amount: number) {
  const a = hex.match(/\w\w/g)!.map((x) => parseInt(x, 16));
  const b = other.match(/\w\w/g)!.map((x) => parseInt(x, 16));
  return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * amount).toString(16).padStart(2, "0")).join("");
}
/** Text on a colored background: dark on light colors, white on dark ones. */
function readableOn(hex: string) {
  const [r, g, b] = hex.match(/\w\w/g)!.map((x) => parseInt(x, 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? "#1f2a22" : "#ffffff";
}
const valid = (hex?: string) => (hex && /^#[0-9a-f]{6}$/i.test(hex) ? hex : undefined);

export function themeVars(brandColor?: string, accentColor?: string): Record<string, string> {
  const brand = valid(brandColor) ?? DEFAULT_BRAND;
  const accent = valid(accentColor) ?? DEFAULT_ACCENT;
  return {
    "--brand": brand,
    "--brand-dark": mix(brand, "#000000", 0.18),
    "--brand-soft": mix(brand, "#ffffff", 0.88),
    "--brand-ink": readableOn(brand),
    "--accent": accent,
    "--accent-soft": mix(accent, "#ffffff", 0.85),
    "--accent-ink": readableOn(accent),
  };
}

export function applyTheme(brandColor?: string, accentColor?: string, el: HTMLElement = document.documentElement) {
  for (const [key, value] of Object.entries(themeVars(brandColor, accentColor))) el.style.setProperty(key, value);
}

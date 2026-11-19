export type NavLink = { label: string; type: string; target?: string; hidden?: boolean };

export const LINK_TYPES: { type: string; label: string; icon: string; needsTarget: boolean }[] = [
  { type: "home", label: "Home page", icon: "home", needsTarget: false },
  { type: "catalog", label: "All products", icon: "bag", needsTarget: false },
  { type: "category", label: "Category", icon: "tag", needsTarget: true },
  { type: "collection", label: "Collection", icon: "grid2", needsTarget: true },
  { type: "product", label: "Product", icon: "package", needsTarget: true },
  { type: "page", label: "Page", icon: "file", needsTarget: true },
  { type: "track", label: "Track order", icon: "truck", needsTarget: false },
  { type: "url", label: "Web address", icon: "external", needsTarget: true },
];

/** Where a menu link goes. Store links are paths; web links are absolute. */
export function linkHref(link: NavLink): string {
  const t = link.target ?? "";
  switch (link.type) {
    case "home": return "/";
    case "catalog": return "/catalog";
    case "category":
    case "collection": return "/catalog?category=" + encodeURIComponent(t);
    case "product": return "/product/" + encodeURIComponent(t);
    case "page": return "/pages/" + encodeURIComponent(t);
    case "track": return "/track";
    default: return t;
  }
}

export const isExternal = (link: NavLink) => link.type === "url";

/** Menu for stores that haven't saved typed links yet, built from the older
 *  list of names (each a category or collection). */
export function effectiveLinks(
  settings: { navLinks?: NavLink[]; navigation?: string[] } | null | undefined,
  categories: string[],
  collections: string[],
): NavLink[] {
  if (settings?.navLinks?.length) return settings.navLinks;
  // An empty saved list (older stores) falls back to the first categories.
  const names = settings?.navigation?.length ? settings.navigation : categories.slice(0, 3);
  return [
    { label: "Home", type: "home" },
    { label: "Shop all", type: "catalog" },
    ...names
      .filter((name) => name.trim() && !["home", "shop all"].includes(name.trim().toLowerCase()))
      .map((name) => ({ label: name, type: collections.includes(name) && !categories.includes(name) ? "collection" : "category", target: name })),
  ];
}

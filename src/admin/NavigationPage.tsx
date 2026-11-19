import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Icon } from "../components/Icon";
import { LINK_TYPES, effectiveLinks, linkHref, type NavLink } from "../lib/navLinks";
import { SaveBar, Section, useSettingsDraft, withScheme } from "./forms";
import { Heading } from "./shared";
import type { AdminCtx } from "./types";

export function NavigationPage({ ctx }: { ctx: AdminCtx }) {
  const categories = useQuery(api.categories.list) ?? [];
  const pages = useQuery(api.pages.listAll) ?? [];
  const categoryNames = [...new Set([...categories.map((c) => c.name), ...ctx.products.map((p) => p.category)])];
  const collectionNames = ctx.collections.map((c) => c.name);

  const form = useSettingsDraft(
    () => ({ links: effectiveLinks(ctx.settings, categoryNames, collectionNames).map((l) => ({ ...l })) as NavLink[] }),
    (d) => {
      for (const link of d.links) {
        if (!link.label.trim()) return "Every link needs a label";
        const meta = LINK_TYPES.find((t) => t.type === link.type);
        if (meta?.needsTarget && !link.target?.trim()) return `Choose where “${link.label}” goes`;
      }
      return { navLinks: d.links.map((l) => ({ label: l.label.trim(), type: l.type, target: l.type === "url" ? withScheme(l.target ?? "") : l.target, hidden: l.hidden })) };
    },
  );
  const links = form.draft.links;
  const setLinks = (next: NavLink[]) => form.set("links", next);
  const update = (i: number, patch: Partial<NavLink>) => setLinks(links.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const move = (i: number, by: number) => {
    const j = i + by;
    if (j < 0 || j >= links.length) return;
    const next = [...links];
    [next[i], next[j]] = [next[j], next[i]];
    setLinks(next);
  };

  function targetOptions(type: string): { value: string; label: string }[] {
    if (type === "category") return categoryNames.map((n) => ({ value: n, label: n }));
    if (type === "collection") return collectionNames.map((n) => ({ value: n, label: n }));
    if (type === "product") return ctx.products.map((p) => ({ value: String(p.number), label: p.name + (p.status && p.status !== "active" ? ` (${p.status})` : "") }));
    if (type === "page") return pages.map((p) => ({ value: p.slug, label: p.title + (p.published ? "" : " (draft)") }));
    return [];
  }
  function defaultTarget(type: string) {
    return targetOptions(type)[0]?.value;
  }
  function defaultLabel(type: string, target?: string) {
    if (type === "product") return ctx.products.find((p) => String(p.number) === target)?.name ?? "Product";
    if (type === "page") return pages.find((p) => p.slug === target)?.title ?? "Page";
    if (type === "home") return "Home";
    if (type === "catalog") return "Shop all";
    if (type === "track") return "Track order";
    return target || "Link";
  }

  const visible = links.filter((l) => !l.hidden);

  return (
    <>
      <Heading title="Navigation" subtitle="The menu at the top of your store. Pick exactly where each link goes." />
      <Section icon="link" title="Header menu" description="Shown left to right on computers, top to bottom in the phone menu.">
        <div className="nav-preview" aria-label="Menu preview">
          <span className="nav-preview-brand">{ctx.settings.storeName}.</span>
          {visible.length ? visible.map((l, i) => <span key={i} className="nav-preview-link">{l.label}</span>) : <span className="muted">No visible links</span>}
        </div>
        <ol className="link-list">
          {links.map((link, i) => {
            const meta = LINK_TYPES.find((t) => t.type === link.type) ?? LINK_TYPES[0];
            const options = targetOptions(link.type);
            return (
              <li key={i} className={"link-item" + (link.hidden ? " hidden-link" : "")}>
                <div className="link-order">
                  <button type="button" aria-label={`Move ${link.label} up`} disabled={i === 0} onClick={() => move(i, -1)}><Icon name="up" size="sm" /></button>
                  <button type="button" aria-label={`Move ${link.label} down`} disabled={i === links.length - 1} onClick={() => move(i, 1)}><Icon name="chevron" size="sm" /></button>
                </div>
                <span className="link-icon"><Icon name={meta.icon} size="sm" /></span>
                <div className="link-fields">
                  <input aria-label="Link label" className="link-label" value={link.label} maxLength={40} placeholder="Label" onChange={(e) => update(i, { label: e.target.value })} />
                  <div className="link-dest">
                    <select aria-label="Link goes to" value={link.type} onChange={(e) => {
                      const type = e.target.value;
                      const target = type === "url" ? "" : defaultTarget(type);
                      const autoLabel = link.label === defaultLabel(link.type, link.target) || !link.label.trim();
                      update(i, { type, target, label: autoLabel ? defaultLabel(type, target) : link.label });
                    }}>
                      {LINK_TYPES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
                    </select>
                    {link.type === "url" ? (
                      <input aria-label="Web address" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="https://…" value={link.target ?? ""} onChange={(e) => update(i, { target: e.target.value })} onBlur={(e) => update(i, { target: withScheme(e.target.value) })} />
                    ) : meta.needsTarget ? (
                      options.length ? (
                        <select aria-label={`Which ${meta.label.toLowerCase()}`} value={link.target ?? ""} onChange={(e) => {
                          const autoLabel = link.label === defaultLabel(link.type, link.target);
                          update(i, { target: e.target.value, label: autoLabel ? defaultLabel(link.type, e.target.value) : link.label });
                        }}>
                          {!options.some((o) => o.value === link.target) ? <option value={link.target ?? ""}>{link.target ? `${link.target} (missing)` : "Choose…"}</option> : null}
                          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      ) : <span className="muted link-empty">No {meta.label.toLowerCase()}s yet</span>
                    ) : null}
                  </div>
                  <code className="link-path">{linkHref(link) || "—"}</code>
                </div>
                <div className="link-actions">
                  <button type="button" className="row-action" aria-label={link.hidden ? `Show ${link.label}` : `Hide ${link.label}`} title={link.hidden ? "Hidden. Click to show" : "Hide"} onClick={() => update(i, { hidden: !link.hidden })}>
                    <Icon name={link.hidden ? "eyeoff" : "eye"} size="sm" />
                  </button>
                  <button type="button" className="row-action" aria-label={`Remove ${link.label}`} onClick={() => setLinks(links.filter((_, j) => j !== i))}>
                    <Icon name="trash" size="sm" />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
        <button type="button" className="btn secondary small" disabled={links.length >= 12} onClick={() => setLinks([...links, { label: categoryNames[0] ?? "Shop all", type: categoryNames.length ? "category" : "catalog", target: categoryNames[0] }])}>
          <Icon name="plus" size="sm" /> Add link
        </button>
      </Section>
      <SaveBar dirty={form.dirty} saving={form.saving} onSave={() => void form.save()} onDiscard={form.discard} />
    </>
  );
}

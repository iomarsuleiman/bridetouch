import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { BrandLogo } from "../components/BrandLogo";
import { Icon } from "../components/Icon";
import type { Doc } from "../../convex/_generated/dataModel";
import { linkHandler } from "../hooks/useHashRoute";

const LABELS: Record<string, string> = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok" };

/** Store footer: brand, shop links, published pages and policies, contact. */
export function StoreFooter({ settings }: { settings: Doc<"settings"> | null | undefined }) {
  const pages = useQuery(api.pages.listPublished) ?? [];
  const configured = (settings?.socials ?? []).filter((social) => social.enabled && social.url.trim());
  const socials = configured.length
    ? configured
    : settings?.instagramUrl
      ? [{ network: "instagram", url: settings.instagramUrl, enabled: true }]
      : [];
  const policies = pages.filter((p) => p.kind === "policy");
  const info = pages.filter((p) => p.kind !== "policy");
  const name = settings?.storeName ?? "bridetouch";
  const whatsapp = settings?.whatsapp?.replace(/\D/g, "");
  const link = (path: string, label: string) => (
    <a key={path} href={"/" + path} onClick={linkHandler(path)}>{label}</a>
  );

  return (
    <footer className="footer site-footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <a className="brand" href="/" onClick={linkHandler("shop")}>
            <BrandLogo src={settings?.logoImage} name={settings?.storeName} />
            <span className="brand-word">{name}.</span>
          </a>
          <p>{settings?.heroDescription ?? "Handmade pieces, made with care."}</p>
          {socials.length ? (
            <div className="footer-social">
              {socials.map((social) => (
                <a key={social.network} href={social.url} target="_blank" rel="noopener noreferrer" aria-label={LABELS[social.network] ?? social.network} title={LABELS[social.network] ?? social.network}>
                  <Icon name={social.network} />
                </a>
              ))}
            </div>
          ) : null}
        </div>
        <nav className="footer-col" aria-label="Shop">
          <h3>Shop</h3>
          {link("catalog", "All products")}
          {link("track", "Track your order")}
          {info.map((p) => link(`pages/${p.slug}`, p.title))}
        </nav>
        {policies.length ? (
          <nav className="footer-col" aria-label="Policies">
            <h3>Policies</h3>
            {policies.map((p) => link(`pages/${p.slug}`, p.title))}
          </nav>
        ) : null}
        <div className="footer-col">
          <h3>Contact</h3>
          {whatsapp ? <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer"><Icon name="phone" size="sm" /> WhatsApp</a> : null}
          {settings?.phone ? <a href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`}><Icon name="phone" size="sm" /> {settings.phone}</a> : null}
          {settings?.email ? <a href={`mailto:${settings.email}`}><Icon name="mail" size="sm" /> {settings.email}</a> : null}
          {settings?.supportUrl ? <a href={settings.supportUrl}><Icon name="help" size="sm" /> Support</a> : null}
          {settings?.address || settings?.city ? <span className="footer-address"><Icon name="location" size="sm" /> {settings?.address || settings?.city}</span> : null}
        </div>
      </div>
      <div className="footer-bottom">
        <small>© {new Date().getFullYear()} {name}</small>
        <small className="footer-pay"><Icon name="wallet" size="sm" /> Cash on delivery</small>
      </div>
    </footer>
  );
}

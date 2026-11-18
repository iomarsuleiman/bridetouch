import { BrandLogo } from "../components/BrandLogo";
import { Icon } from "../components/Icon";
import type { Doc } from "../../convex/_generated/dataModel";
import { linkHandler } from "../hooks/useHashRoute";

const LABELS: Record<string, string> = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok" };

// Port of storeFooter() from src/index.html. Social icons are built in; the
// admin picks which ones show and where they link. Older settings that only
// had instagramUrl still work.
export function StoreFooter({ settings }: { settings: Doc<"settings"> | null | undefined }) {
  const configured = (settings?.socials ?? []).filter((social) => social.enabled && social.url.trim());
  const links = configured.length
    ? configured
    : settings?.instagramUrl
      ? [{ network: "instagram", url: settings.instagramUrl, enabled: true }]
      : [];

  return (
    <footer className="footer">
      <div className="footer-brand">
        <a className="brand" href="/" onClick={linkHandler("shop")}>
          <BrandLogo src={settings?.logoImage} name={settings?.storeName} />
          <span className="brand-word">{settings?.storeName ?? "bridetouch"}.</span>
        </a>
        <small>
          © {new Date().getFullYear()} {settings?.storeName ?? "bridetouch"}
          {settings?.city ? ` · ${settings.city}` : ""} · Cash on delivery
        </small>
      </div>
      <div className="footer-links">
        {links.length ? (
          <div className="footer-social">
            {links.map((social) => (
              <a
                key={social.network}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={LABELS[social.network] ?? social.network}
                title={LABELS[social.network] ?? social.network}
              >
                <Icon name={social.network} />
              </a>
            ))}
          </div>
        ) : null}
        {settings?.supportUrl ? <a href={settings.supportUrl}>Support</a> : null}
        {settings?.email ? <a href={`mailto:${settings.email}`}>{settings.email}</a> : null}
      </div>
    </footer>
  );
}

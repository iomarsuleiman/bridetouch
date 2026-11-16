import { BrandLogo } from "../components/BrandLogo";
import type { Doc } from "../../convex/_generated/dataModel";
// Port of storeFooter() from src/index.html.
export function StoreFooter({ settings }: { settings: Doc<"settings"> | null | undefined }) {
  return (
    <footer className="footer">
      <div className="brand">
        <BrandLogo src={settings?.logoImage} name={settings?.storeName} />
        <span className="brand-word">{settings?.storeName ?? "bridetouch"}.</span>
      </div>
      <div className="footer-links">{settings?.instagramUrl ? <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer">Instagram</a> : null}{settings?.supportUrl ? <a href={settings.supportUrl}>Support</a> : null}{settings?.email ? <a href={`mailto:${settings.email}`}>{settings.email}</a> : null}</div>
    </footer>
  );
}

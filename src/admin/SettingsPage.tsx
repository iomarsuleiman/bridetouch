import { NotificationSetup } from "../components/NotificationSetup";
import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Icon } from "../components/Icon";
import { useToast } from "../components/Toast";
import { DEFAULT_LOGO } from "../components/BrandLogo";
import { ImageUpload } from "./ImageUpload";
import { Heading } from "./shared";
import type { AdminCtx } from "./types";

const TOGGLES: { key: "freeShipping" | "notifications" | "guestCheckout"; title: (min?: number) => string; desc: string }[] = [
  { key: "freeShipping", title: (min) => `Free delivery over EGP ${min ?? 800}`, desc: "Apply to eligible checkout totals" },
  { key: "notifications", title: () => "New order alerts", desc: "Show notifications in dashboard" },
  { key: "guestCheckout", title: () => "Guest checkout", desc: "Customers do not need an account" },
];

// Port of the vanilla settingsPage() (without the reset-demo button).
export function SettingsPage({ ctx }: { ctx: AdminCtx }) {
  const toast = useToast();
  const update = useMutation(api.settings.update);
  const s = ctx.settings;
  const [storeName, setStoreName] = useState(s.storeName);
  const [email, setEmail] = useState(s.email);
  const [instagramUrl, setInstagramUrl] = useState(s.instagramUrl ?? "");
  const [supportUrl, setSupportUrl] = useState(s.supportUrl ?? "");
  const [adminEmails, setAdminEmails] = useState((s.adminEmails ?? []).join(", "));
  const [city, setCity] = useState(s.city);
  const [content, setContent] = useState({logoImage:s.logoImage || DEFAULT_LOGO,heroTitle:s.heroTitle ?? "A little something, made by hand.",heroDescription:s.heroDescription ?? "Ceramics, little keepsakes and everyday favorites. Each piece has its own kind of charm.",heroImage:s.heroImage ?? "",storyTitle:s.storyTitle ?? "Good things take a little time.",storyDescription:s.storyDescription ?? "Thoughtfully made pieces for the quiet, colorful moments in everyday life.",storyImage:s.storyImage ?? "",catalogTitle:s.catalogTitle ?? "Handmade, for you.",catalogDescription:s.catalogDescription ?? "Every piece is a little different. That is the lovely part.",announcement:s.announcement ?? ""});
  const [navigation, setNavigation] = useState((s.navigation ?? [...new Set(ctx.products.map(p => p.category))].slice(0,2)).join(", "));
  const formRef = useRef<HTMLFormElement>(null);

  async function save() {
    const f = formRef.current;
    if (f && !f.checkValidity()) {
      f.reportValidity();
      return;
    }
    try {
      await update({ storeName, email, city, ...content, instagramUrl, supportUrl, adminEmails:adminEmails.split(",").map(email => email.trim()).filter(Boolean), navigation: navigation.split(",").map(n => n.trim()).filter(Boolean) });
      toast("Settings saved");
    } catch {
      toast("Could not save settings");
    }
  }

  return (
    <>
      <Heading
        title="Settings"
        subtitle="Everything about your little shop."
        actions={
          <button className="btn primary" type="button" onClick={save}>
            <Icon name="check" size="sm" /> Save changes
          </button>
        }
      />
      <form ref={formRef} className="settings-grid" onSubmit={(e) => e.preventDefault()}>
        <section className="settings-card">
          <h2>Store details</h2>
          <p>Your storefront name and contact details.</p>
          <div className="field">
            <label htmlFor="sname">Store name</label>
            <input id="sname" name="storeName" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="semail">Contact email</label>
            <input id="semail" type="email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="scity">Location</label>
            <input id="scity" name="city" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
        </section>
        <section className="settings-card">
          <h2>Links & access</h2>
          <div className="field"><label htmlFor="instagram">Instagram page</label><input id="instagram" type="url" placeholder="https://www.instagram.com/your-page" value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)} /></div>
          <div className="field"><label htmlFor="support">Support link</label><input id="support" placeholder="https://wa.me/? or mailto:you@example.com" value={supportUrl} onChange={e => setSupportUrl(e.target.value)} /></div>
          <div className="field"><label htmlFor="admins">Administrator emails, separated by commas</label><input id="admins" value={adminEmails} onChange={e => setAdminEmails(e.target.value)} /><small>Leave blank to allow all signed-in users. Add emails to restrict access. Keep your own email in a restricted list.</small></div>
          <h2>Storefront & header</h2>
          <p>Header links match product categories or collection names. Leave blank to hide them.</p>
          <div className="field"><label htmlFor="navigation">Header links, separated by commas</label><input id="navigation" value={navigation} onChange={e => setNavigation(e.target.value)} /></div>
          {Object.entries(content).map(([key, value]) => {
            const label = key.replace(/([A-Z])/g, " $1");
            return key.endsWith("Image") ? <ImageUpload key={key} label={label} value={value} onChange={url => setContent(current => ({...current, [key]:url}))} /> : <div className="field" key={key}><label htmlFor={key}>{label}</label><input id={key} value={value} onChange={e => setContent(current => ({...current, [key]:e.target.value}))} /></div>;
          })}
        </section>
        <section className="settings-card">
          <h2>Checkout & notifications</h2>
          <p>Changes apply to the live store.</p>
          <NotificationSetup />
          {TOGGLES.map((t) => (
            <div key={t.key} className="setting-row">
              <span>
                <strong>{t.title(s.freeShippingMin)}</strong>
                <small>{t.desc}</small>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={!!s[t.key]}
                aria-label={t.title(s.freeShippingMin)}
                className={"toggle" + (s[t.key] ? " on" : "")}
                onClick={() => update({ [t.key]: !s[t.key] })}
              >
                <i />
              </button>
            </div>
          ))}
        </section>
      </form>
    </>
  );
}

import { NotificationSetup } from "../components/NotificationSetup";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/react";
import { api } from "../../convex/_generated/api";
import { Icon } from "../components/Icon";
import { useToast } from "../components/Toast";
import { DEFAULT_LOGO } from "../components/BrandLogo";
import { ImageUpload } from "./ImageUpload";
import { Heading } from "./shared";
import type { AdminCtx } from "./types";

const TOGGLES: { key: "freeShipping" | "notifications" | "guestCheckout"; title: (min?: number) => string; desc: string }[] = [
  { key: "freeShipping", title: (min) => `Free delivery from EGP ${min ?? 800}`, desc: "Apply to eligible checkout totals" },
  { key: "notifications", title: () => "New order alerts", desc: "Show notifications in dashboard" },
  { key: "guestCheckout", title: () => "Guest checkout", desc: "Customers do not need an account" },
];

const SOCIAL_NETWORKS = [
  { network: "instagram", label: "Instagram", placeholder: "https://www.instagram.com/your-page" },
  { network: "facebook", label: "Facebook", placeholder: "https://www.facebook.com/your-page" },
  { network: "tiktok", label: "TikTok", placeholder: "https://www.tiktok.com/@your-page" },
] as const;

type SocialLink = { network: string; url: string; enabled: boolean };

// Port of the vanilla settingsPage() (without the reset-demo button).
export function SettingsPage({ ctx }: { ctx: AdminCtx }) {
  const toast = useToast();
  const update = useMutation(api.settings.update);
  const s = ctx.settings;
  const [storeName, setStoreName] = useState(s.storeName);
  const [email, setEmail] = useState(s.email);
  const [supportUrl, setSupportUrl] = useState(s.supportUrl ?? "");
  const [socials, setSocials] = useState<SocialLink[]>(() => {
    const existing = s.socials ?? [];
    return SOCIAL_NETWORKS.map(({ network }) => {
      const found = existing.find((entry) => entry.network === network);
      if (found) return { ...found };
      const legacy = network === "instagram" ? (s.instagramUrl ?? "") : "";
      return { network, url: legacy, enabled: Boolean(legacy) };
    });
  });
  const authorizedAdmins = useQuery(api.access.roster);
  const [adminEmails, setAdminEmails] = useState<string[]>(s.adminEmails ?? []);
  // During a one-time owner migration the effective roster comes from Convex env
  // until an authorized admin saves it in the store's settings.
  useEffect(() => {
    if (authorizedAdmins) setAdminEmails(authorizedAdmins);
  }, [authorizedAdmins]);
  const [newAdmin, setNewAdmin] = useState("");
  const [savingAdmins, setSavingAdmins] = useState(false);
  const { user } = useUser();
  const myEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase() ?? "";
  const [city, setCity] = useState(s.city);
  const [shippingFee, setShippingFee] = useState(String(s.shipping ?? 65));
  const [freeShippingMin, setFreeShippingMin] = useState(String(s.freeShippingMin ?? 800));
  const [content, setContent] = useState({logoImage:s.logoImage || DEFAULT_LOGO,heroTitle:s.heroTitle ?? "A little something, made by hand.",heroDescription:s.heroDescription ?? "Ceramics, little keepsakes and everyday favorites. Each piece has its own kind of charm.",heroImage:s.heroImage ?? "",storyTitle:s.storyTitle ?? "Good things take a little time.",storyDescription:s.storyDescription ?? "Thoughtfully made pieces for the quiet, colorful moments in everyday life.",storyImage:s.storyImage ?? "",catalogTitle:s.catalogTitle ?? "Handmade, for you.",catalogDescription:s.catalogDescription ?? "Every piece is a little different. That is the lovely part.",announcement:s.announcement ?? ""});
  const [navigation, setNavigation] = useState<string[]>(() => s.navigation ?? [...new Set(ctx.products.map((p) => p.category))].slice(0, 2));
  const formRef = useRef<HTMLFormElement>(null);

  async function save() {
    const f = formRef.current;
    if (f && !f.checkValidity()) {
      f.reportValidity();
      return;
    }
    try {
      const instagramUrl = (socials.find((entry) => entry.network === "instagram")?.url ?? "").trim();
      await update({ storeName, email, city, shipping: Number(shippingFee), freeShippingMin: Number(freeShippingMin), ...content, instagramUrl, socials: socials.map((entry) => ({ ...entry, url: entry.url.trim() })), supportUrl, navigation: [...new Set(navigation.map((name) => name.trim()).filter(Boolean))] });
      toast("Settings saved");
    } catch {
      toast("Could not save settings");
    }
  }

  // The inline value in the toggle row saves on its own, so the threshold can
  // be changed without touching the rest of the form.
  async function saveThreshold() {
    const value = Number(freeShippingMin);
    if (!Number.isFinite(value) || value < 0) {
      setFreeShippingMin(String(s.freeShippingMin ?? 800));
      return;
    }
    if (value === (s.freeShippingMin ?? 800)) return;
    try {
      await update({ freeShippingMin: value });
      toast("Free delivery threshold updated");
    } catch {
      toast("Could not update the threshold");
      setFreeShippingMin(String(s.freeShippingMin ?? 800));
    }
  }

  // Administrator changes are saved immediately and acknowledged by Convex.
  // The page never shows an unsaved person as an active administrator.
  async function persistAdmins(next: string[]) {
    if (savingAdmins) return false;
    if (!myEmail || !next.includes(myEmail)) {
      toast("Keep your own email in the administrator list");
      return false;
    }
    if (!next.length) {
      toast("At least one administrator is required");
      return false;
    }
    setSavingAdmins(true);
    try {
      await update({ adminEmails: next });
      setAdminEmails(next);
      toast("Administrator access updated");
      return true;
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not update administrators");
      return false;
    } finally {
      setSavingAdmins(false);
    }
  }

  async function addAdmin() {
    const address = newAdmin.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      toast("Enter a valid email address");
      return;
    }
    const effective = [...new Set((authorizedAdmins ?? adminEmails).map((email) => email.toLowerCase()))];
    if (effective.includes(address)) {
      toast("That email is already an administrator");
      setNewAdmin("");
      return;
    }
    if (await persistAdmins([...new Set([...effective, myEmail, address])])) setNewAdmin("");
  }

  async function removeAdmin(address: string) {
    if (address === myEmail) {
      toast("You cannot remove your own administrator access");
      return;
    }
    await persistAdmins(adminEmails.filter((entry) => entry !== address));
  }

  function moveLink(index: number, offset: number) {
    setNavigation((current) => {
      const next = [...current];
      const destination = index + offset;
      if (destination < 0 || destination >= next.length) return current;
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
  }

  function updateSocial(network: string, patch: Partial<SocialLink>) {
    setSocials((current) => current.map((entry) => (entry.network === network ? { ...entry, ...patch } : entry)));
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
          <div className="field"><label htmlFor="support">Support link</label><input id="support" placeholder="https://wa.me/? or mailto:you@example.com" value={supportUrl} onChange={e => setSupportUrl(e.target.value)} /></div>
          <div className="field admin-field">
            <label>Dashboard administrators</label>
            <p className="form-help">
              Only the listed accounts may access the dashboard. A new sign-up never grants access.
            </p>
            {adminEmails.length ? (
              <ul className="admin-list">
                {adminEmails.map((address) => (
                  <li key={address}>
                    <span className="admin-avatar">{(address[0] || "?").toUpperCase()}</span>
                    <span className="admin-address">
                      {address}
                      {address === myEmail ? <em> · you</em> : null}
                    </span>
                    <button
                      type="button"
                      className="row-action"
                      aria-label={`Remove ${address}`}
                      title="Remove administrator"
                      disabled={savingAdmins}
                      onClick={() => void removeAdmin(address)}
                    >
                      <Icon name="trash" size="sm" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="admin-add">
              <input
                id="newAdmin"
                type="email"
                placeholder="name@example.com"
                value={newAdmin}
                onChange={(e) => setNewAdmin(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void addAdmin();
                  }
                }}
              />
              <button type="button" className="btn secondary" disabled={savingAdmins || authorizedAdmins === undefined} onClick={() => void addAdmin()}>
                <Icon name="plus" size="sm" /> Add
              </button>
            </div>
            <small>Adding or removing an administrator saves immediately. Only the listed accounts can access the dashboard.</small>
          </div>
          <h2>Storefront & header</h2>
          <p>Choose the categories and collections shown in the storefront navigation. Drag-free controls let you reorder them.</p>
          <div className="field">
            <label id="header-links-heading">Header links</label>
            <div className="header-link-list" role="list" aria-labelledby="header-links-heading">
              {navigation.map((name, index) => (
                <div className="header-link-item" role="listitem" key={index}>
                  <span className="header-link-number" aria-hidden="true">{index + 1}</span>
                  <input
                    aria-label={`Header link ${index + 1}`}
                    placeholder="Category or collection"
                    value={name}
                    maxLength={70}
                    onChange={(e) => setNavigation((current) => current.map((value, i) => i === index ? e.target.value : value))}
                  />
                  <div className="header-link-actions">
                    <button type="button" aria-label={`Move link ${index + 1} up`} title="Move up" disabled={index === 0} onClick={() => moveLink(index, -1)}>↑</button>
                    <button type="button" aria-label={`Move link ${index + 1} down`} title="Move down" disabled={index === navigation.length - 1} onClick={() => moveLink(index, 1)}>↓</button>
                    <button type="button" aria-label={`Remove link ${index + 1}`} title="Remove link" onClick={() => setNavigation((current) => current.filter((_, i) => i !== index))}>×</button>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="btn secondary header-link-add" onClick={() => setNavigation((current) => [...current, ""])}>
              <Icon name="plus" size="sm" /> Add link
            </button>
          </div>
          {Object.entries(content).map(([key, value]) => {
            const label = key.replace(/([A-Z])/g, " $1");
            return key.endsWith("Image") ? <ImageUpload key={key} label={label} value={value} onChange={url => setContent(current => ({...current, [key]:url}))} /> : <div className="field" key={key}><label htmlFor={key}>{label}</label><input id={key} value={value} onChange={e => setContent(current => ({...current, [key]:e.target.value}))} /></div>;
          })}
        </section>
        <section className="settings-card">
          <h2>Social links</h2>
          <p>
            Instagram, Facebook and TikTok icons appear in the storefront header and footer when enabled.
            Turn one on, paste its link and save. Your email is set under Store details.
          </p>
          {SOCIAL_NETWORKS.map(({ network, label, placeholder }) => {
            const social = socials.find((entry) => entry.network === network);
            if (!social) return null;
            return (
              <div key={network} className="setting-row social-row">
                <span className="social-label">
                  <span className="social-badge"><Icon name={network} size="sm" /></span>
                  {label}
                </span>
                <input
                  className="social-url"
                  type="url"
                  inputMode="url"
                  placeholder={placeholder}
                  aria-label={`${label} link`}
                  value={social.url}
                  disabled={!social.enabled}
                  onChange={(e) => updateSocial(network, { url: e.target.value })}
                />
                <button
                  type="button"
                  role="switch"
                  aria-checked={social.enabled}
                  aria-label={`Show ${label} on the storefront`}
                  className={"toggle" + (social.enabled ? " on" : "")}
                  onClick={() => updateSocial(network, { enabled: !social.enabled })}
                >
                  <i />
                </button>
              </div>
            );
          })}
        </section>
        <section className="settings-card">
          <h2>Checkout & notifications</h2>
          <p>Changes apply to the live store.</p>
          <NotificationSetup />
          <div className="field">
            <label htmlFor="shippingFee">Standard delivery fee (EGP)</label>
            <input id="shippingFee" name="shippingFee" type="number" min="0" step="0.01" required value={shippingFee} onChange={e => setShippingFee(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="freeShippingMin">Free delivery from (EGP)</label>
            <input id="freeShippingMin" name="freeShippingMin" type="number" min="0" step="0.01" required value={freeShippingMin} onChange={e => setFreeShippingMin(e.target.value)} />
            <small>Set the amount here, then enable or disable free delivery below. Changes are saved with the other store settings.</small>
          </div>
          {TOGGLES.map((t) => (
            <div key={t.key} className="setting-row">
              <span>
                {t.key === "freeShipping" ? (
                  <strong className="setting-inline">
                    Free delivery from EGP
                    <input
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      value={freeShippingMin}
                      disabled={!s.freeShipping}
                      onChange={(e) => setFreeShippingMin(e.target.value)}
                      onBlur={saveThreshold}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.currentTarget.blur();
                        }
                      }}
                      aria-label="Free delivery threshold in EGP"
                    />
                  </strong>
                ) : (
                  <strong>{t.title(s.freeShippingMin)}</strong>
                )}
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

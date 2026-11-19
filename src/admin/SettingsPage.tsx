import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/react";
import { api } from "../../convex/_generated/api";
import { Icon } from "../components/Icon";
import { useToast } from "../components/Toast";
import { NotificationSetup } from "../components/NotificationSetup";
import { friendlyError, money } from "../lib/format";
import { Heading } from "./shared";
import { SaveBar, Section, TextField, Toggle, useSettingsDraft, withScheme } from "./forms";
import type { AdminCtx } from "./types";

const TABS = [
  { id: "general", label: "Store details", icon: "shop", hint: "Name, contact, social" },
  { id: "delivery", label: "Delivery & returns", icon: "truck", hint: "Areas, fees, returns" },
  { id: "checkout", label: "Checkout", icon: "card", hint: "Guest checkout, alerts" },
  { id: "team", label: "Team", icon: "users", hint: "Who can use the dashboard" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export function SettingsPage({ ctx }: { ctx: AdminCtx }) {
  const initial = (() => {
    const fromUrl = new URLSearchParams(location.search).get("tab");
    if (ctx.view === "shipping") return "delivery";
    return (TABS.some((t) => t.id === fromUrl) ? fromUrl : "general") as Tab;
  })();
  const [tab, setTab] = useState<Tab>(initial);
  const choose = (next: Tab) => {
    setTab(next);
    history.replaceState(history.state, "", "/admin/settings?tab=" + next);
  };
  const active = TABS.find((t) => t.id === tab)!;

  return (
    <>
      <Heading title="Settings" subtitle="How your store runs: contact details, delivery, checkout and team." />
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          {TABS.map((t) => (
            <button key={t.id} type="button" className={"settings-nav-item" + (t.id === tab ? " active" : "")} aria-current={t.id === tab ? "page" : undefined} onClick={() => choose(t.id)}>
              <span className="settings-nav-icon"><Icon name={t.icon} size="sm" /></span>
              <span>
                <strong>{t.label}</strong>
                <small>{t.hint}</small>
              </span>
            </button>
          ))}
        </nav>
        <div className="settings-content" key={active.id}>
          {tab === "general" ? <GeneralSettings ctx={ctx} /> : null}
          {tab === "delivery" ? <DeliverySettings ctx={ctx} /> : null}
          {tab === "checkout" ? <CheckoutSettings ctx={ctx} /> : null}
          {tab === "team" ? <TeamSettings /> : null}
        </div>
      </div>
    </>
  );
}

const SOCIAL_NETWORKS = [
  { network: "instagram", label: "Instagram", placeholder: "instagram.com/your-page" },
  { network: "facebook", label: "Facebook", placeholder: "facebook.com/your-page" },
  { network: "tiktok", label: "TikTok", placeholder: "tiktok.com/@your-page" },
] as const;

function GeneralSettings({ ctx }: { ctx: AdminCtx }) {
  const s = ctx.settings;
  const form = useSettingsDraft(
    () => ({
      storeName: s.storeName,
      email: s.email,
      phone: s.phone ?? "",
      whatsapp: s.whatsapp ?? "",
      address: s.address ?? "",
      city: s.city,
      supportUrl: s.supportUrl ?? "",
      socials: SOCIAL_NETWORKS.map(({ network }) => {
        const found = (s.socials ?? []).find((entry) => entry.network === network);
        const legacy = network === "instagram" ? s.instagramUrl ?? "" : "";
        return found ? { ...found } : { network, url: legacy, enabled: Boolean(legacy) };
      }),
    }),
    (d) => {
      if (!d.storeName.trim()) return "Enter your store name";
      if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) return "Enter a valid contact email";
      const socials = d.socials.map((entry) => ({ ...entry, url: withScheme(entry.url) }));
      return {
        storeName: d.storeName.trim(),
        email: d.email.trim(),
        phone: d.phone,
        whatsapp: d.whatsapp.replace(/[^\d+]/g, ""),
        address: d.address,
        city: d.city.trim(),
        supportUrl: withScheme(d.supportUrl),
        socials,
        instagramUrl: socials.find((x) => x.network === "instagram")?.url ?? "",
      };
    },
  );
  const d = form.draft;
  return (
    <>
      <Section icon="shop" title="Store" description="Shown in the header, footer, receipts and search results.">
        <TextField id="storeName" label="Store name" required maxLength={60} value={d.storeName} onChange={(v) => form.set("storeName", v)} />
        <div className="grid-2">
          <TextField id="email" label="Contact email" type="email" inputMode="email" required value={d.email} onChange={(v) => form.set("email", v)} />
          <TextField id="phone" label="Phone" inputMode="tel" placeholder="010 1234 5678" value={d.phone} onChange={(v) => form.set("phone", v)} />
        </div>
        <div className="grid-2">
          <TextField id="whatsapp" label="WhatsApp number" inputMode="tel" placeholder="201012345678" hint="With country code. Adds a WhatsApp button for customers." value={d.whatsapp} onChange={(v) => form.set("whatsapp", v)} />
          <TextField id="city" label="City" required value={d.city} onChange={(v) => form.set("city", v)} />
        </div>
        <TextField id="address" label="Business address" placeholder="Studio address, if you want it on receipts and pages" value={d.address} onChange={(v) => form.set("address", v)} />
        <TextField id="supportUrl" label="Support link" inputMode="url" placeholder="wa.me/201012345678 or you@example.com" hint="The “Support” link in your store header and footer." value={d.supportUrl} onChange={(v) => form.set("supportUrl", v)} />
      </Section>
      <Section icon="globe" title="Social profiles" description="Icons appear in your store header and footer when turned on.">
        {SOCIAL_NETWORKS.map(({ network, label, placeholder }) => {
          const social = d.socials.find((entry) => entry.network === network)!;
          const update = (patch: Partial<typeof social>) => form.set("socials", d.socials.map((entry) => (entry.network === network ? { ...entry, ...patch } : entry)));
          return (
            <div key={network} className="social-editor">
              <span className="social-badge"><Icon name={network} size="sm" /></span>
              <input aria-label={`${label} link`} inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder={placeholder} value={social.url} disabled={!social.enabled}
                onChange={(e) => update({ url: e.target.value })} onBlur={(e) => update({ url: withScheme(e.target.value) })} />
              <button type="button" role="switch" aria-checked={social.enabled} aria-label={`Show ${label}`} className={"toggle" + (social.enabled ? " on" : "")} onClick={() => update({ enabled: !social.enabled })}><i /></button>
            </div>
          );
        })}
      </Section>
      <SaveBar dirty={form.dirty} saving={form.saving} onSave={() => void form.save()} onDiscard={form.discard} />
    </>
  );
}

type ZoneDraft = { name: string; fee: string; eta: string; enabled: boolean };
const EGYPT_ZONES: { name: string; fee: number; eta: string }[] = [
  { name: "Cairo", fee: 60, eta: "1–2 days" },
  { name: "Giza", fee: 60, eta: "1–2 days" },
  { name: "Alexandria", fee: 70, eta: "2–3 days" },
  { name: "Delta & Canal cities", fee: 75, eta: "2–4 days" },
  { name: "Upper Egypt", fee: 90, eta: "3–5 days" },
  { name: "Red Sea & Sinai", fee: 110, eta: "4–6 days" },
];

function DeliverySettings({ ctx }: { ctx: AdminCtx }) {
  const s = ctx.settings;
  const form = useSettingsDraft(
    () => ({
      shipping: String(s.shipping ?? 65),
      freeShipping: s.freeShipping,
      freeShippingMin: String(s.freeShippingMin ?? 800),
      returnDays: String(s.returnDays ?? 14),
      zones: (s.zones ?? []).map((z) => ({ name: z.name, fee: String(z.fee), eta: z.eta ?? "", enabled: z.enabled })) as ZoneDraft[],
    }),
    (d) => {
      const fee = Number(d.shipping), min = Number(d.freeShippingMin), days = Number(d.returnDays);
      if (!d.shipping.trim() || !Number.isFinite(fee) || fee < 0) return "Enter a standard delivery fee of 0 or more";
      if (!Number.isFinite(min) || min < 0) return "Enter a free delivery amount of 0 or more";
      if (!Number.isInteger(days) || days < 14) return "Returns must be allowed for at least 14 days";
      const zones = d.zones.filter((z) => z.name.trim());
      if (zones.some((z) => !Number.isFinite(Number(z.fee)) || z.fee.trim() === "")) return "Every delivery area needs a fee";
      return { shipping: fee, freeShipping: d.freeShipping, freeShippingMin: min, returnDays: days, zones: zones.map((z) => ({ name: z.name.trim(), fee: Number(z.fee), eta: z.eta.trim() || undefined, enabled: z.enabled })) };
    },
  );
  const d = form.draft;
  const setZone = (i: number, patch: Partial<ZoneDraft>) => form.set("zones", d.zones.map((z, j) => (j === i ? { ...z, ...patch } : z)));
  const activeZones = d.zones.filter((z) => z.enabled && z.name.trim()).length;
  return (
    <>
      <Section icon="truck" title="Delivery fee" description={activeZones ? "Used when a customer's area isn't listed below." : "Charged on every order unless free delivery applies."}>
        <div className="grid-2">
          <TextField id="shipping" label="Standard delivery fee (EGP)" required inputMode="decimal" value={d.shipping} onChange={(v) => form.set("shipping", v)} />
          <TextField id="freeShippingMin" label="Free delivery on orders from (EGP)" required inputMode="decimal" value={d.freeShippingMin} onChange={(v) => form.set("freeShippingMin", v)} />
        </div>
        <Toggle label="Offer free delivery" description={d.freeShipping ? `Orders of ${money(Number(d.freeShippingMin) || 0)} or more ship free.` : "Every order pays the delivery fee."} checked={d.freeShipping} onChange={(v) => form.set("freeShipping", v)} />
      </Section>
      <Section
        icon="map"
        title="Delivery areas"
        description="Charge different fees by area. When any area is on, customers choose theirs at checkout."
        actions={!d.zones.length ? (
          <button type="button" className="btn secondary small" onClick={() => form.set("zones", EGYPT_ZONES.map((z) => ({ name: z.name, fee: String(z.fee), eta: z.eta, enabled: true })))}>
            <Icon name="sparkle" size="sm" /> Use Egypt presets
          </button>
        ) : undefined}
      >
        {d.zones.length ? (
          <div className="zone-table" role="table" aria-label="Delivery areas">
            <div className="zone-row zone-head" role="row">
              <span role="columnheader">Area</span><span role="columnheader">Fee (EGP)</span><span role="columnheader">Delivery time</span><span role="columnheader" className="sr-only">Actions</span>
            </div>
            {d.zones.map((zone, i) => (
              <div className={"zone-row" + (zone.enabled ? "" : " off")} role="row" key={i}>
                <input aria-label="Area name" placeholder="e.g. Cairo" value={zone.name} onChange={(e) => setZone(i, { name: e.target.value })} />
                <input aria-label="Fee" inputMode="decimal" placeholder="60" value={zone.fee} onChange={(e) => setZone(i, { fee: e.target.value.replace(/[^0-9.]/g, "") })} />
                <input aria-label="Delivery time" placeholder="1–2 days" value={zone.eta} onChange={(e) => setZone(i, { eta: e.target.value })} />
                <span className="zone-actions">
                  <button type="button" role="switch" aria-checked={zone.enabled} aria-label={`Deliver to ${zone.name || "this area"}`} className={"toggle small" + (zone.enabled ? " on" : "")} onClick={() => setZone(i, { enabled: !zone.enabled })}><i /></button>
                  <button type="button" className="row-action" aria-label={`Remove ${zone.name || "area"}`} onClick={() => form.set("zones", d.zones.filter((_, j) => j !== i))}><Icon name="trash" size="sm" /></button>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="form-help">No areas yet. Everyone pays the standard fee.</p>
        )}
        <button type="button" className="btn secondary small" onClick={() => form.set("zones", [...d.zones, { name: "", fee: "", eta: "", enabled: true }])}>
          <Icon name="plus" size="sm" /> Add area
        </button>
      </Section>
      <Section icon="undo" title="Returns" description="Customers can request a return from the order tracking page within this window after delivery.">
        <TextField id="returnDays" label="Return window (days)" required inputMode="numeric" value={d.returnDays} onChange={(v) => form.set("returnDays", v)} hint="Egyptian consumer law gives buyers at least 14 days. Custom-made items can be excluded in your returns policy." />
      </Section>
      <SaveBar dirty={form.dirty} saving={form.saving} onSave={() => void form.save()} onDiscard={form.discard} />
    </>
  );
}

function CheckoutSettings({ ctx }: { ctx: AdminCtx }) {
  const s = ctx.settings;
  const form = useSettingsDraft(
    () => ({ guestCheckout: s.guestCheckout, notifications: s.notifications }),
    (d) => ({ guestCheckout: d.guestCheckout, notifications: d.notifications }),
  );
  return (
    <>
      <Section icon="card" title="Checkout" description="Payment is cash on delivery. Customers confirm by phone before you ship.">
        <Toggle label="Guest checkout" description="Customers can order without creating an account. Recommended." checked={form.draft.guestCheckout} onChange={(v) => form.set("guestCheckout", v)} />
        <div className="info-row"><Icon name="shield" size="sm" /> Fake-order protection is on: hidden bot trap, and at most 3 orders per phone number every 15 minutes.</div>
      </Section>
      <Section icon="bell" title="New order alerts" description="Get a notification on this device when an order comes in.">
        <Toggle label="Order alerts" description="Turn alerts on for the whole store." checked={form.draft.notifications} onChange={(v) => form.set("notifications", v)} />
        <NotificationSetup />
      </Section>
      <SaveBar dirty={form.dirty} saving={form.saving} onSave={() => void form.save()} onDiscard={form.discard} />
    </>
  );
}

function TeamSettings() {
  const toast = useToast();
  const update = useMutation(api.settings.update);
  const roster = useQuery(api.access.roster);
  const [emails, setEmails] = useState<string[]>([]);
  useEffect(() => { if (roster) setEmails(roster); }, [roster]);
  const [newAdmin, setNewAdmin] = useState("");
  const [busy, setBusy] = useState(false);
  const { user } = useUser();
  const me = user?.primaryEmailAddress?.emailAddress?.toLowerCase() ?? "";

  async function persist(next: string[]) {
    if (!me || !next.includes(me)) return toast("Keep your own email in the list");
    setBusy(true);
    try {
      await update({ adminEmails: next });
      setEmails(next);
      toast("Team updated");
      return true;
    } catch (error) {
      toast(friendlyError(error, "Could not update the team"));
    } finally {
      setBusy(false);
    }
  }
  async function add() {
    const address = newAdmin.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return toast("Enter a valid email address");
    if (emails.includes(address)) return toast("Already on the team");
    if (await persist([...new Set([...emails, me, address])])) setNewAdmin("");
  }
  return (
    <Section icon="users" title="Administrators" description="People who can sign in to this dashboard. Changes save right away.">
      {roster === undefined ? <div className="page-spinner" style={{ minHeight: 120 }}><span className="spinner" /></div> : (
        <ul className="admin-list">
          {emails.map((address) => (
            <li key={address}>
              <span className="admin-avatar">{(address[0] || "?").toUpperCase()}</span>
              <span className="admin-address">{address}{address === me ? <em> · you</em> : null}</span>
              {address !== me ? (
                <button type="button" className="row-action" aria-label={`Remove ${address}`} disabled={busy} onClick={() => void persist(emails.filter((e) => e !== address))}>
                  <Icon name="trash" size="sm" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <form className="admin-add" onSubmit={(e) => { e.preventDefault(); void add(); }}>
        <input type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="done" aria-label="Email to add" placeholder="name@example.com" value={newAdmin} onChange={(e) => setNewAdmin(e.target.value)} />
        <button type="submit" className="btn secondary" disabled={busy || roster === undefined}><Icon name="plus" size="sm" /> Add</button>
      </form>
      <p className="form-help">They sign in with this email at <strong>/admin</strong>. Signing up alone never grants access.</p>
    </Section>
  );
}

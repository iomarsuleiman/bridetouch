import { DEFAULT_LOGO } from "../components/BrandLogo";
import { DEFAULT_ACCENT, DEFAULT_BRAND, themeVars } from "../lib/theme";
import { Headline } from "../lib/headline";
import { Icon } from "../components/Icon";
import { SmartImage } from "../components/SmartImage";
import { ImageUpload } from "./ImageUpload";
import { SaveBar, Section, TextField, useSettingsDraft } from "./forms";
import { Heading } from "./shared";
import type { AdminCtx } from "./types";

const BRANDS = ["#355241", "#2f3e46", "#5b4636", "#7a4f5a", "#3d4f7c", "#6b5b95", "#1f1f1f"];
const ACCENTS = ["#cb887a", "#c7768f", "#b98b5e", "#d4a373", "#8a9a6b", "#6f8fa3", "#9a7aa8"];

function ColorPicker({ label, hint, value, options, onChange }: { label: string; hint: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="swatches" role="radiogroup" aria-label={label}>
        {options.map((color) => (
          <button key={color} type="button" role="radio" aria-checked={value.toLowerCase() === color} aria-label={color} className={"swatch" + (value.toLowerCase() === color ? " on" : "")} style={{ background: color }} onClick={() => onChange(color)} />
        ))}
        <label className={"swatch custom" + (!options.includes(value.toLowerCase()) ? " on" : "")} title="Custom color" style={!options.includes(value.toLowerCase()) ? { background: value } : undefined}>
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={`Custom ${label.toLowerCase()}`} />
          {options.includes(value.toLowerCase()) ? <Icon name="plus" size="sm" /> : null}
        </label>
      </div>
      <small className="field-hint">{hint}</small>
    </div>
  );
}

export function AppearancePage({ ctx }: { ctx: AdminCtx }) {
  const s = ctx.settings;
  const form = useSettingsDraft(
    () => ({
      logoImage: s.logoImage || DEFAULT_LOGO,
      accentColor: s.accentColor || DEFAULT_ACCENT,
      brandColor: s.brandColor || DEFAULT_BRAND,
      announcement: s.announcement ?? "",
      heroTitle: s.heroTitle ?? "",
      heroDescription: s.heroDescription ?? "",
      heroImage: s.heroImage ?? "",
      storyTitle: s.storyTitle ?? "",
      storyDescription: s.storyDescription ?? "",
      storyImage: s.storyImage ?? "",
      catalogTitle: s.catalogTitle ?? "",
      catalogDescription: s.catalogDescription ?? "",
    }),
    (d) => ({ ...d }),
  );
  const d = form.draft;
  const heroImage = d.heroImage || ctx.products[0]?.img || "";

  return (
    <>
      <Heading
        title="Appearance"
        subtitle="Your logo, brand color and the words on your homepage."
        actions={<a className="btn secondary" href="/" target="_blank" rel="noopener"><Icon name="external" size="sm" /> View store</a>}
      />
      <div className="appearance-layout">
        <div className="appearance-form">
          <Section icon="palette" title="Brand" description="Your logo and the two colors your store is built around.">
            <ImageUpload label="Logo" value={d.logoImage} onChange={(v) => form.set("logoImage", v)} />
            <ColorPicker label="Main color" hint="Buttons, the bag, the top banner and the selected menu item." value={d.brandColor} options={BRANDS} onChange={(v) => form.set("brandColor", v)} />
            <ColorPicker label="Highlight color" hint="The italic part of your headline, sale prices and badges." value={d.accentColor} options={ACCENTS} onChange={(v) => form.set("accentColor", v)} />
            <button type="button" className="btn ghost small" style={{ justifySelf: "start" }} onClick={() => form.patch({ brandColor: DEFAULT_BRAND, accentColor: DEFAULT_ACCENT })}>Reset to default colors</button>
            <TextField id="announcement" label="Announcement bar" maxLength={160} placeholder="Orders placed today ship Sunday" hint="A short line across the top of every page. Leave empty to hide it." value={d.announcement} onChange={(v) => form.set("announcement", v)} />
          </Section>
          <Section icon="home" title="Homepage" description="The first thing customers see.">
            <TextField id="heroTitle" label="Headline" maxLength={120} placeholder="A little something, made by hand." value={d.heroTitle} onChange={(v) => form.set("heroTitle", v)} />
            <TextField id="heroDescription" label="Intro" multiline maxLength={400} placeholder="One or two sentences about what you make." value={d.heroDescription} onChange={(v) => form.set("heroDescription", v)} />
            <ImageUpload label="Homepage image" value={d.heroImage} onChange={(v) => form.set("heroImage", v)} />
          </Section>
          <Section icon="heart" title="Your story" description="The band in the middle of the homepage.">
            <TextField id="storyTitle" label="Title" maxLength={120} placeholder="Good things take a little time." value={d.storyTitle} onChange={(v) => form.set("storyTitle", v)} />
            <TextField id="storyDescription" label="Text" multiline maxLength={400} value={d.storyDescription} onChange={(v) => form.set("storyDescription", v)} />
            <ImageUpload label="Story image" value={d.storyImage} onChange={(v) => form.set("storyImage", v)} />
          </Section>
          <Section icon="bag" title="Shop page" description="The heading above all your products.">
            <TextField id="catalogTitle" label="Title" maxLength={120} placeholder="Handmade, for you." value={d.catalogTitle} onChange={(v) => form.set("catalogTitle", v)} />
            <TextField id="catalogDescription" label="Intro" multiline maxLength={400} value={d.catalogDescription} onChange={(v) => form.set("catalogDescription", v)} />
          </Section>
        </div>
        <aside className="appearance-preview" aria-label="Preview">
          <div className="preview-frame" style={themeVars(d.brandColor, d.accentColor)}>
            <div className="preview-bar"><i /><i /><i /><span>{location.host || "your store"}</span></div>
            {d.announcement ? <div className="preview-announce">{d.announcement}</div> : null}
            <div className="preview-header">
              <SmartImage src={d.logoImage} alt="" />
              <strong>{s.storeName}.</strong>
              <span className="preview-pill" />
            </div>
            <div className="preview-hero">
              <div>
                <h3><Headline text={d.heroTitle} /></h3>
                <p>{d.heroDescription || "Tell customers what you make."}</p>
                <span className="preview-cta">Explore the collection</span>
              </div>
              {heroImage ? <SmartImage src={heroImage} alt="" /> : <span className="img-fallback" />}
            </div>
            <div className="preview-grid">
              {ctx.products.slice(0, 3).map((p) => (
                <div key={p._id}>
                  <SmartImage src={p.img} alt="" />
                  <small>{p.name}</small>
                  <b>EGP {p.price}</b>
                </div>
              ))}
            </div>
          </div>
          <p className="form-help">Preview updates as you type. Save to publish.</p>
        </aside>
      </div>
      <SaveBar dirty={form.dirty} saving={form.saving} onSave={() => void form.save()} onDiscard={form.discard} />
    </>
  );
}


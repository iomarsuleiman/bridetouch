import { DEFAULT_LOGO } from "../components/BrandLogo";
import { Icon } from "../components/Icon";
import { SmartImage } from "../components/SmartImage";
import { ImageUpload } from "./ImageUpload";
import { SaveBar, Section, TextField, useSettingsDraft } from "./forms";
import { Heading } from "./shared";
import type { AdminCtx } from "./types";

const ACCENTS = ["#cb887a", "#b98b5e", "#8a9a6b", "#6f8fa3", "#9a7aa8", "#c7768f", "#355241"];

export function AppearancePage({ ctx }: { ctx: AdminCtx }) {
  const s = ctx.settings;
  const form = useSettingsDraft(
    () => ({
      logoImage: s.logoImage || DEFAULT_LOGO,
      accentColor: s.accentColor || "#cb887a",
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
          <Section icon="palette" title="Brand" description="Your logo and the accent color used for sale prices, badges and highlights.">
            <ImageUpload label="Logo" value={d.logoImage} onChange={(v) => form.set("logoImage", v)} />
            <div className="field">
              <label>Accent color</label>
              <div className="swatches" role="radiogroup" aria-label="Accent color">
                {ACCENTS.map((color) => (
                  <button key={color} type="button" role="radio" aria-checked={d.accentColor === color} aria-label={color} className={"swatch" + (d.accentColor === color ? " on" : "")} style={{ background: color }} onClick={() => form.set("accentColor", color)} />
                ))}
                <label className="swatch custom" title="Custom color">
                  <input type="color" value={d.accentColor} onChange={(e) => form.set("accentColor", e.target.value)} aria-label="Custom accent color" />
                  <Icon name="plus" size="sm" />
                </label>
              </div>
            </div>
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
          <div className="preview-frame" style={{ ["--accent" as string]: d.accentColor }}>
            <div className="preview-bar"><i /><i /><i /><span>{location.host || "your store"}</span></div>
            {d.announcement ? <div className="preview-announce">{d.announcement}</div> : null}
            <div className="preview-header">
              <SmartImage src={d.logoImage} alt="" />
              <strong>{s.storeName}.</strong>
              <span className="preview-pill" />
            </div>
            <div className="preview-hero">
              <div>
                <h3>{d.heroTitle || "A little something, made by hand."}</h3>
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
                  <b style={{ color: d.accentColor }}>EGP {p.price}</b>
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

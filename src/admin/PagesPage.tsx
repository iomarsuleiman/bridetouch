import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { Icon } from "../components/Icon";
import { useToast } from "../components/Toast";
import { friendlyError } from "../lib/format";
import { Markdown } from "../lib/markdown";
import { Section } from "./forms";
import { DeleteButton, Heading } from "./shared";
import type { AdminCtx } from "./types";

const slugify = (text: string) => text.toLowerCase().trim().replace(/[^a-z0-9؀-ۿ]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

export function PagesPage(_: { ctx: AdminCtx }) {
  const pages = useQuery(api.pages.listAll);
  const createStarters = useMutation(api.pages.createStarterPages);
  const move = useMutation(api.pages.move);
  const toast = useToast();
  const [editing, setEditing] = useState<Id<"pages"> | "new" | null>(null);

  if (pages === undefined) return <div className="page-spinner"><span className="spinner" /></div>;
  const current = editing && editing !== "new" ? pages.find((p) => p._id === editing) ?? null : null;
  if (editing) return <PageEditor page={current} onDone={() => setEditing(null)} />;

  const policies = pages.filter((p) => p.kind === "policy");
  const others = pages.filter((p) => p.kind !== "policy");
  const missing = ["about", "faq", "shipping", "returns", "privacy", "terms"].filter((slug) => !pages.some((p) => p.slug === slug));

  const row = (p: Doc<"pages">, index: number, list: Doc<"pages">[]) => (
    <li key={p._id} className="page-row">
      <button type="button" className="page-row-main" onClick={() => setEditing(p._id)}>
        <span className="section-icon small"><Icon name={p.kind === "policy" ? "shield" : "file"} size="sm" /></span>
        <span>
          <strong>{p.title}</strong>
          <small>/pages/{p.slug} · edited {new Date(p.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</small>
        </span>
        <span className={"badge " + (p.published ? "green" : "")}>{p.published ? "Published" : "Draft"}</span>
      </button>
      <span className="row-actions">
        <button type="button" className="row-action" aria-label={`Move ${p.title} up`} disabled={index === 0} onClick={() => void move({ id: p._id, direction: -1 })}><Icon name="up" size="sm" /></button>
        <button type="button" className="row-action" aria-label={`Move ${p.title} down`} disabled={index === list.length - 1} onClick={() => void move({ id: p._id, direction: 1 })}><Icon name="chevron" size="sm" /></button>
        {p.published ? <a className="row-action" href={`/pages/${p.slug}`} target="_blank" rel="noopener" aria-label={`View ${p.title}`}><Icon name="external" size="sm" /></a> : null}
      </span>
    </li>
  );

  return (
    <>
      <Heading
        title="Pages & policies"
        subtitle="About, FAQ and the policies customers expect before they buy."
        actions={<button className="btn primary" type="button" onClick={() => setEditing("new")}><Icon name="plus" size="sm" /> New page</button>}
      />
      {missing.length ? (
        <div className="callout">
          <span className="section-icon"><Icon name="sparkle" size="sm" /></span>
          <div>
            <strong>{pages.length ? "Add the missing essentials" : "Start with ready-made pages"}</strong>
            <p>About, FAQ, Shipping, Returns (14-day, per Egyptian consumer law), Privacy and Terms, pre-filled with your store details. They're saved as drafts for you to review.</p>
          </div>
          <button type="button" className="btn primary small" onClick={async () => {
            try { const n = await createStarters(); toast(`${n} draft ${n === 1 ? "page" : "pages"} added`); } catch (e) { toast(friendlyError(e, "Could not add pages")); }
          }}>Add {missing.length} {missing.length === 1 ? "page" : "pages"}</button>
        </div>
      ) : null}
      <div className="pages-columns">
        <Section icon="shield" title="Policies" description="Linked in your footer and at checkout once published.">
          {policies.length ? <ul className="page-list">{policies.map((p, i) => row(p, i, policies))}</ul> : <p className="form-help">No policies yet.</p>}
        </Section>
        <Section icon="file" title="Pages" description="Add them to your menu from Navigation.">
          {others.length ? <ul className="page-list">{others.map((p, i) => row(p, i, others))}</ul> : <p className="form-help">No pages yet.</p>}
        </Section>
      </div>
    </>
  );
}

function PageEditor({ page, onDone }: { page: Doc<"pages"> | null; onDone: () => void }) {
  const save = useMutation(api.pages.save);
  const remove = useMutation(api.pages.remove);
  const toast = useToast();
  const [title, setTitle] = useState(page?.title ?? "");
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!page);
  const [body, setBody] = useState(page?.body ?? "");
  const [kind, setKind] = useState(page?.kind ?? "page");
  const published = page?.published ?? false;
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"write" | "preview">("write");
  useEffect(() => { if (!slugTouched) setSlug(slugify(title)); }, [title, slugTouched]);

  async function submit(publish = published) {
    setSaving(true);
    try {
      await save({ id: page?._id, title, slug, body, published: publish, kind });
      toast(publish ? "Page published" : "Draft saved");
      onDone();
    } catch (e) {
      toast(friendlyError(e, "Could not save the page"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="editor-top">
        <button type="button" className="btn ghost small" onClick={onDone}><Icon name="left" size="sm" /> Pages</button>
        <span className="editor-status">{published ? "Published" : "Draft"}</span>
        <span style={{ flex: 1 }} />
        {page ? <DeleteButton label="Delete" onDelete={async () => { try { await remove({ id: page._id }); toast("Page deleted"); onDone(); } catch (e) { toast(friendlyError(e, "Could not delete")); } }} /> : null}
        <button type="button" className="btn secondary small" disabled={saving} onClick={() => void submit(false)}>{published ? "Unpublish" : "Save draft"}</button>
        <button type="button" className="btn primary small" disabled={saving} onClick={() => void submit(true)}>{saving ? "Saving…" : published ? "Save" : "Publish"}</button>
      </div>
      <div className="page-editor">
        <div className="page-editor-meta">
          <input className="page-title-input" aria-label="Page title" placeholder="Page title" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="page-meta-row">
            <label className="slug-field">
              <span>/pages/</span>
              <input aria-label="Page address" value={slug} autoCapitalize="none" autoCorrect="off" spellCheck={false} onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }} />
            </label>
            <div className="segmented" role="group" aria-label="Page type">
              <button type="button" aria-pressed={kind === "page"} className={kind === "page" ? "current" : ""} onClick={() => setKind("page")}>Page</button>
              <button type="button" aria-pressed={kind === "policy"} className={kind === "policy" ? "current" : ""} onClick={() => setKind("policy")}>Policy</button>
            </div>
          </div>
        </div>
        <div className="segmented editor-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={view === "write"} className={view === "write" ? "current" : ""} onClick={() => setView("write")}>Write</button>
          <button type="button" role="tab" aria-selected={view === "preview"} className={view === "preview" ? "current" : ""} onClick={() => setView("preview")}>Preview</button>
        </div>
        <div className={"page-editor-panes show-" + view}>
          <div className="page-editor-write">
            <textarea aria-label="Page content" value={body} onChange={(e) => setBody(e.target.value)} placeholder={"# Heading\n\nWrite your page here.\n\n- Bullet point\n- **Bold** and _italic_\n- [A link](https://example.com)"} />
            <p className="form-help"># Heading · ## Subheading · - list · 1. numbered · **bold** · _italic_ · [link](https://…)</p>
          </div>
          <article className="page-editor-preview prose">
            {body.trim() ? <Markdown text={body} /> : <p className="muted">Nothing to preview yet.</p>}
          </article>
        </div>
      </div>
    </>
  );
}

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { linkHandler } from "../hooks/useHashRoute";
import { Markdown } from "../lib/markdown";
import { clip, useSeo } from "../lib/seo";
import { NotFoundPage } from "./NotFoundPage";

export function PageView({ slug, products, storeName }: { slug: string; products: Doc<"products">[]; storeName?: string }) {
  const page = useQuery(api.pages.getBySlug, { slug });
  const all = useQuery(api.pages.listPublished) ?? [];
  useSeo({ title: page?.title, description: clip(page?.body.replace(/[#*_>[\]()`-]/g, " ")), path: "/pages/" + slug }, storeName);

  if (page === undefined) {
    return (
      <div className="page-shell" role="status" aria-label="Loading">
        <div className="skeleton skeleton-line" style={{ height: 44, width: "60%" }} />
        <div className="skeleton skeleton-line" style={{ marginTop: 24 }} />
        <div className="skeleton skeleton-line" style={{ width: "85%" }} />
      </div>
    );
  }
  if (!page) return <NotFoundPage products={products} storeName={storeName} />;
  const related = all.filter((p) => p.slug !== slug && p.kind === page.kind).slice(0, 6);

  return (
    <div className="page-shell">
      {!page.published ? <div className="draft-banner">Draft preview. Only administrators can see this page.</div> : null}
      <article className="prose page-article">
        {/^#\s/.test(page.body.trim()) ? null : <h1>{page.title}</h1>}
        <Markdown text={page.body} />
      </article>
      <p className="page-updated">Last updated {new Date(page.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
      {related.length ? (
        <nav className="page-related" aria-label={page.kind === "policy" ? "Other policies" : "More pages"}>
          {related.map((p) => (
            <a key={p.slug} href={`/pages/${p.slug}`} onClick={linkHandler(`pages/${p.slug}`)}>{p.title}</a>
          ))}
        </nav>
      ) : null}
    </div>
  );
}

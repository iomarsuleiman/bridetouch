import { friendlyError } from "../lib/format";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Icon } from "../components/Icon";
import { useToast } from "../components/Toast";
import { DeleteButton, Heading } from "./shared";
import type { Id } from "../../convex/_generated/dataModel";
import type { AdminCtx } from "./types";

/** Curated collections are saved records; product categories exist independently. */
export function CollectionsPage({ ctx }: { ctx: AdminCtx }) {
  const toast = useToast();
  const add = useMutation(api.collections.add);
  const removeCollection = useMutation(api.collections.remove);
  const addCategory = useMutation(api.categories.add);
  const savedCategories = useQuery(api.categories.list) ?? [];
  const [newCategory, setNewCategory] = useState("");
  const [creating, setCreating] = useState<string | null>(null);
  const categories = [...new Set([...savedCategories.map((entry) => entry.name), ...ctx.products.map((product) => product.category.trim())].filter(Boolean))].sort((a, b) => a.localeCompare(b));

  async function deleteCollection(id: Id<"collections">, name: string) {
    try {
      await removeCollection({ id });
      toast(`${name} deleted`);
    } catch (error) {
      toast(friendlyError(error, "Could not delete collection"));
    }
  }

  async function createCategory() {
    if (!newCategory.trim() || creating) return;
    setCreating(newCategory);
    try {
      await addCategory({ name: newCategory.trim() });
      setNewCategory("");
      toast("Category created");
    } catch (error) {
      toast(friendlyError(error, "Could not save category"));
    } finally {
      setCreating(null);
    }
  }

  async function createFromCategory(name: string) {
    if (creating) return;
    if (ctx.collections.some((collection) => collection.name.toLowerCase() === name.toLowerCase())) {
      toast("This category already has a collection");
      return;
    }
    const products = ctx.products.filter((product) => product.category === name);
    setCreating(name);
    try {
      await add({ name, image: products.find((product) => product.img)?.img ?? "", productNumbers: products.map((product) => product.number) });
      toast("Collection created");
    } catch (error) {
      toast(friendlyError(error, "Could not create collection"));
    } finally {
      setCreating(null);
    }
  }

  return (
    <>
      <Heading
        title="Collections"
        subtitle="Curate how your products are discovered."
        actions={
          <button className="btn primary" type="button" onClick={() => ctx.openModal("add-collection")}>
            <Icon name="plus" size="sm" /> Create collection
          </button>
        }
      />
      {ctx.collections.length ? (
        <div className="card-list">
          {ctx.collections.map((collection) => {
            const count = ctx.products.filter((product) => collection.productNumbers?.includes(product.number) || (!collection.productNumbers?.length && product.category === collection.name)).length;
            return (
              <article key={collection._id} className="collection-card">
                {collection.image ? <img src={collection.image} alt={collection.name} loading="lazy" /> : <div className="collection-image-placeholder" aria-hidden="true"><Icon name="grid" /></div>}
                <div className="cc-body">
                  <span>
                    <strong>{collection.name}</strong>
                    <small>{count ? `${count} ${count === 1 ? "product" : "products"}` : "No products assigned — edit to add"} · Collection</small>
                  </span>
                  <span className="row-actions">
                    <button className="btn icon-only ghost" onClick={() => ctx.openEditCollection(collection._id)} aria-label={"Edit " + collection.name}>
                      <Icon name="edit" />
                    </button>
                    <DeleteButton label="" onDelete={() => deleteCollection(collection._id, collection.name)} />
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="collection-empty-state">
          <strong>No curated collections yet</strong>
          <span>Your product categories are shown below. Turn a category into a collection, or create one from scratch.</span>
        </div>
      )}
      <section className="collection-category-section" aria-label="Product categories">
          <div className="collection-category-heading">
            <h2>Product categories</h2>
            <p>Categories stay saved even when they contain no products.</p>
          </div>
          <div className="option-add-value collection-create-category">
            <input aria-label="New product category" placeholder="New category" value={newCategory}
              maxLength={60} onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void createCategory(); } }} />
            <button type="button" className="btn secondary" disabled={!newCategory.trim() || creating !== null}
              onClick={() => void createCategory()}><Icon name="plus" size="sm" /> Add category</button>
          </div>
          <div className="card-list">
            {categories.map((name) => {
              const products = ctx.products.filter((product) => product.category === name);
              const alreadySaved = ctx.collections.some((collection) => collection.name.toLowerCase() === name.toLowerCase());
              const image = products.find((product) => product.img)?.img;
              return (
                <article key={name} className="collection-card">
                  {image ? <img src={image} alt="" loading="lazy" /> : <div className="collection-image-placeholder" aria-hidden="true"><Icon name="grid" /></div>}
                  <div className="cc-body">
                    <span>
                      <strong>{name}</strong>
                      <small>{products.length} {products.length === 1 ? "product" : "products"} · Category</small>
                    </span>
                    <button type="button" className="btn secondary" disabled={alreadySaved || creating !== null}
                      onClick={() => void createFromCategory(name)}>
                      {alreadySaved ? "Added" : creating === name ? "Creating…" : "Create collection"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
      </section>
    </>
  );
}

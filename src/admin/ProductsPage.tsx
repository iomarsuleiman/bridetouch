import { useState } from "react";
import { Badge } from "../components/Badge";
import { Icon } from "../components/Icon";
import { money } from "../lib/format";
import { SmartImage } from "../components/SmartImage";
import { DeleteButton, Heading } from "./shared";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useToast } from "../components/Toast";
import { friendlyError } from "../lib/format";
import type { AdminCtx } from "./types";

// Port of the vanilla productsPage().
export function ProductsPage({ ctx }: { ctx: AdminCtx }) {
  const [tab, setTab] = useState("All");
  const [query, setQuery] = useState("");
  const toast = useToast();
  const remove = useMutation(api.products.remove);
  async function deleteProduct(id: Id<"products">, name: string) {
    try {
      await remove({ id });
      toast(`${name} deleted`);
    } catch (error) {
      toast(friendlyError(error, "Could not delete product"));
    }
  }
  const tabs = ["All", "In stock", "Low stock", "Sold out"];
  const q = query.trim().toLowerCase();
  const items = ctx.products.filter(
    (p) =>
      (tab === "All" ||
        (tab === "In stock" && p.stock > 0) ||
        (tab === "Low stock" && p.stock > 0 && p.stock <= 5) ||
        (tab === "Sold out" && p.stock <= 0)) &&
      (!q || (p.name + " " + p.category + " BT-" + String(p.number).padStart(3, "0")).toLowerCase().includes(q)),
  );
  const counts: Record<string, number> = {
    All: ctx.products.length,
    "In stock": ctx.products.filter((p) => p.stock > 0).length,
    "Low stock": ctx.products.filter((p) => p.stock > 0 && p.stock <= 5).length,
    "Sold out": ctx.products.filter((p) => p.stock <= 0).length,
  };

  return (
    <>
      <Heading
        title="Products"
        subtitle="Your products, beautifully organized."
        actions={
          <button className="btn primary" type="button" onClick={() => ctx.openModal("add-product")}>
            <Icon name="plus" size="sm" /> Add product
          </button>
        }
      />
      <section className="panel">
        <div className="tabs" role="tablist" aria-label="Product stock filter">
          {tabs.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              className={"tab" + (tab === t ? " active" : "")}
              onClick={() => setTab(t)}
            >
              {t} <span className="tab-count">{counts[t]}</span>
            </button>
          ))}
        </div>
        <div className="toolbar">
          <div className="search">
            <Icon name="search" size="sm" />
            <input
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              aria-label="Search products"
              placeholder="Search name, category or SKU"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="toolbar-right">
            <span className="muted" style={{ fontSize: 12 }}>
              {ctx.products.length} products
            </span>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Status</th>
                <th>Inventory</th>
                <th>Category</th>
                <th>Price</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p._id}>
                  <td>
                    <div className="prod-row">
                      <SmartImage src={p.img} alt="" />
                      <span>
                        <strong>{p.name}</strong>
                        <small>SKU · BT-{String(p.number).padStart(3, "0")}</small>
                      </span>
                    </div>
                  </td>
                  <td>
                    <Badge text={p.stock > 0 ? "Active" : "Sold out"} />
                  </td>
                  <td>
                    {p.stock} available {p.stock > 0 && p.stock <= 5 ? <span className="badge amber">Low</span> : null}
                  </td>
                  <td>{p.category}</td>
                  <td>{money(p.price)}</td>
                  <td>
                    <span className="row-actions">
                      <button
                        className="row-action"
                        onClick={() => ctx.openEditProduct(p._id)}
                        aria-label={"Edit " + p.name}
                        title="Edit"
                      >
                        <Icon name="edit" />
                      </button>
                      <DeleteButton label="" onDelete={() => deleteProduct(p._id, p.name)} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mobile-cards">
          {items.map((p) => (
            <div key={p._id} className="mobile-product-row">
            <button
              className="mobile-data"
              style={{ flex: 1, minWidth: 0, textAlign: "left" }}
              onClick={() => ctx.openEditProduct(p._id)}
            >
              <SmartImage style={{ width: 45, height: 50, objectFit: "cover", borderRadius: 8, flex: "none" }} src={p.img} alt="" />
              <span style={{ flex: 1 }}>
                <strong>{p.name}</strong>
                <small>
                  {p.stock > 0 ? `${p.stock} in stock` : "Sold out"} · {p.category}
                </small>
              </span>
              <strong>{money(p.price)}</strong>
              <Icon name="right" size="sm" />
            </button>
            <DeleteButton label="" onDelete={() => deleteProduct(p._id, p.name)} />
            </div>
          ))}
        </div>
        {items.length ? null : (
          <div className="empty">
            {ctx.products.length ? (q ? "No products match that search." : `No products are ${tab.toLowerCase()}.`) : (
              <>
                <h3>No products yet</h3>
                <p>Add your first product to start selling.</p>
                <button className="btn primary" type="button" onClick={() => ctx.openModal("add-product")}><Icon name="plus" size="sm" /> Add product</button>
              </>
            )}
          </div>
        )}
      </section>
    </>
  );
}

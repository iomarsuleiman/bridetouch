import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { saleDiscount } from "./salePricing";
import type { Doc } from "../../convex/_generated/dataModel";
import { money } from "../lib/format";
import { cartItemKey, useCart } from "../lib/cart";
import { availableStock, matchVariant, priceForVariant } from "./productVariants";
import { useToast } from "../components/Toast";
import { Icon } from "../components/Icon";
import { SmartImage } from "../components/SmartImage";
import { useStoreUI } from "./ui";
import { linkHandler, navigate } from "../hooks/useHashRoute";
import { clip, useJsonLd, useSeo } from "../lib/seo";
import { ProductCard } from "./ProductCard";

export function ProductDetailPage({
  product: p,
  products,
  settings,
}: {
  product: Doc<"products">;
  products: Doc<"products">[];
  settings: Doc<"settings">;
}) {
  const storeName = settings.storeName;
  const cart = useCart();
  const toast = useToast();
  const { goToCategory, openCart } = useStoreUI();
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const sales = useQuery(api.sales.activeList) ?? [];
  const collections = useQuery(api.collections.list) ?? [];
  const [selected, setSelected] = useState<string[]>(() =>
    p.variants?.find((variant) => variant.stock > 0)?.values ??
    p.options?.map((option) => option.values[0]) ?? [],
  );
  const hasOptions = !!p.options?.length;
  const chosen = hasOptions ? selected : undefined;
  const selectedVariant = hasOptions ? matchVariant(p, chosen) : undefined;
  const stock = availableStock(p, chosen);
  const unitPrice = priceForVariant(p, chosen);
  const inBag = cart.items.find((entry) => cartItemKey(entry) === cartItemKey({ number: p.number, variant: chosen }))?.qty ?? 0;
  const canAdd = Math.max(0, stock - inBag);
  const qty = Math.min(quantity, Math.max(1, canAdd));
  const saleSavings = saleDiscount([{ number: p.number, subtotal: unitPrice }], sales, collections, Date.now());
  const quantitySavings = saleDiscount([{ number: p.number, subtotal: unitPrice * qty }], sales, collections, Date.now());
  const valid = !hasOptions || !!selectedVariant;
  const soldOut = stock <= 0;

  useSeo(
    {
      title: p.name,
      description: clip(p.description || `${p.name} — ${p.category} at ${storeName ?? "bridetouch"}.`),
      image: p.img,
      path: "/product/" + p.number,
      type: "product",
    },
    storeName,
  );
  useJsonLd("ld-product", {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description || undefined,
    image: p.img ? [new URL(p.img, location.origin).href] : undefined,
    sku: "BT-" + String(p.number).padStart(3, "0"),
    category: p.category,
    brand: { "@type": "Brand", name: storeName ?? "bridetouch" },
    offers: {
      "@type": "Offer",
      url: location.origin + "/product/" + p.number,
      priceCurrency: "EGP",
      price: unitPrice - saleSavings,
      availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  });

  function setChoice(index: number, value: string) {
    setSelected((current) => current.map((entry, i) => i === index ? value : entry));
    setQuantity(1);
  }

  function addToBag(buyNow = false) {
    if (!valid || soldOut) {
      toast("This option is sold out");
      return;
    }
    const item = { number: p.number, qty, variant: chosen };
    if (buyNow) {
      if (qty > stock) return toast(`Only ${stock} available`);
      cart.clear();
      cart.add(item);
      navigate("checkout");
      return;
    }
    if (canAdd <= 0) {
      toast(`You already have all ${stock} in your bag`);
      return;
    }
    cart.add(item);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1600);
    toast(`${p.name} added to your bag`);
  }

  const related = products
    .filter((other) => other.number !== p.number && other.category === p.category && other.stock > 0)
    .concat(products.filter((other) => other.number !== p.number && other.category !== p.category && other.stock > 0))
    .slice(0, 4);
  const categoryHref = "/catalog?category=" + encodeURIComponent(p.category);

  return (
    <>
      <div className="product-detail">
        <div className="detail-media">
          <nav className="mini-breadcrumb" aria-label="Breadcrumb">
            <a href="/catalog" onClick={linkHandler("catalog", () => goToCategory("All"))}>Shop all</a>
            <span aria-hidden="true">/</span>
            <a href={categoryHref} onClick={linkHandler(categoryHref, () => goToCategory(p.category))}>{p.category}</a>
          </nav>
          <div className="detail-image-wrap">
            <SmartImage className="detail-image" src={p.img} alt={p.name} fetchPriority="high" />
            {soldOut ? <span className="tile-tag sold">Sold out</span> : saleSavings ? <span className="tile-tag sale">{Math.round((saleSavings / unitPrice) * 100)}% off</span> : null}
          </div>
        </div>
        <div className="detail-info">
          <h1>{p.name}</h1>
          <div className="price">
            {saleSavings ? <><s className="old-price">{money(unitPrice)}</s> <span className="sale-price">{money(unitPrice - saleSavings)}</span></> : money(unitPrice)}
          </div>
          {p.description ? <p className="desc">{p.description}</p> : null}
          {hasOptions
            ? p.options!.map((option, index) => (
              <fieldset className="detail-choice" key={option.name}>
                <legend>{option.name}: <span className="choice-value">{selected[index]}</span></legend>
                <div className="variant-choices">
                  {option.values.map((value) => {
                    const trial = selected.map((entry, i) => i === index ? value : entry);
                    const unavailable = availableStock(p, trial) <= 0;
                    return (
                      <button key={value} type="button" className={"chip" + (selected[index] === value ? " on" : "") + (unavailable ? " unavailable" : "")}
                        aria-pressed={selected[index] === value}
                        aria-label={unavailable ? `${value} (sold out)` : value}
                        title={unavailable ? "Sold out in this combination" : undefined}
                        onClick={() => setChoice(index, value)}>
                        {value}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))
            : p.color ? (
              <div className="detail-choice"><p className="choice-label">Color / finish: <span className="choice-value">{p.color}</span></p></div>
            ) : null}
          {!soldOut ? (
            <div className="detail-choice">
              <p className="choice-label" id="qty-label">Quantity</p>
              <div className="qty-row">
                <div className="qty-step" role="group" aria-labelledby="qty-label">
                  <button type="button" disabled={qty <= 1} onClick={() => setQuantity(Math.max(1, qty - 1))} aria-label="Decrease quantity">
                    <Icon name="minus" size="sm" />
                  </button>
                  <strong aria-live="polite">{qty}</strong>
                  <button type="button" disabled={qty >= canAdd} onClick={() => setQuantity(Math.min(canAdd, qty + 1))} aria-label="Increase quantity">
                    <Icon name="plus" size="sm" />
                  </button>
                </div>
                <span className={"stock-note" + (stock <= 3 ? " low" : "")}>
                  {stock <= 3 ? `Only ${stock} left` : "In stock"}
                  {inBag ? ` · ${inBag} in your bag` : ""}
                </span>
              </div>
            </div>
          ) : (
            <p className="sold-out-note">
              <Icon name="info" size="sm" /> {hasOptions ? "This combination is sold out. Try another option." : "This piece is sold out for now."}
            </p>
          )}
          <div className="product-purchase-actions">
            <button className={"btn primary" + (justAdded ? " added" : "")} onClick={() => addToBag(false)} disabled={!valid || soldOut}>
              {soldOut ? "Sold out" : justAdded ? <>Added <Icon name="check" size="sm" /></> : <>Add to bag · {money(unitPrice * qty - quantitySavings)} <Icon name="bag" size="sm" /></>}
            </button>
            {justAdded ? (
              <button className="btn secondary" onClick={openCart}>
                View bag <Icon name="arrow" size="sm" />
              </button>
            ) : soldOut ? null : (
              <button className="btn secondary" onClick={() => addToBag(true)} disabled={!valid}>
                Buy now <Icon name="arrow" size="sm" />
              </button>
            )}
          </div>
          <ul className="detail-notes">
            <li><Icon name="wallet" size="sm" /> Cash on delivery</li>
            <li><Icon name="truck" size="sm" /> {settings.freeShipping ? `Free delivery over ${money(settings.freeShippingMin ?? 800)}` : `Delivery ${money(settings.shipping)}`}</li>
          </ul>
        </div>
      </div>
      {related.length ? (
        <section className="shop-section related-section" aria-labelledby="related-heading">
          <div className="section-heading reveal"><h2 id="related-heading">You may also like.</h2></div>
          <div className="product-grid">
            {related.map((item) => <ProductCard key={item._id} product={item} />)}
          </div>
        </section>
      ) : null}
    </>
  );
}

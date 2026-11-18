import { orderMetrics } from "./metrics";
import { OrderChart } from "./OrderChart";
import { useState } from "react";
import { Icon } from "../components/Icon";
import { money } from "../lib/format";
import { SmartImage } from "../components/SmartImage";
import { navigate } from "../hooks/useHashRoute";
import { Heading, Select, Stat } from "./shared";
import { OrdersTable } from "./OrdersTable";
import type { AdminCtx } from "./types";

// Port of the vanilla overview().
export function OverviewPage({ ctx }: { ctx: AdminCtx }) {
  const [period, setPeriod] = useState("Last 7 days");
  const metrics = orderMetrics(ctx.orders, period);
  const newCount = ctx.orders.filter(o => o.status === "New").length;
  const recent = ctx.orders.slice(0, 5);
  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Good evening" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const inStock = ctx.products.filter((p) => p.stock > 0).length;
  const lowStock = ctx.products.filter((p) => p.stock > 0 && p.stock <= 3).length;
  const soldOut = ctx.products.length - inStock;
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const popular = ctx.products.filter(p => metrics.sold.has(p.number)).sort((a,b)=>(metrics.sold.get(b.number) ?? 0)-(metrics.sold.get(a.number) ?? 0)).slice(0,4);

  return (
    <>
      <Heading
        title={
          <>
            {greeting} <span style={{ color: "#d9a89b" }}>✳</span>
          </>
        }
        subtitle="Here is what is happening in your store today."
        actions={
          <button className="btn secondary" type="button" onClick={() => navigate("shop")}>
            <Icon name="external" size="sm" /> View store
          </button>
        }
      />
      <div className="stat-grid">
        <Stat label="Total orders" value={metrics.selected.length} change={period} icon="bag" />
        <Stat label="Order value" value={money(metrics.total)} change="Excludes cancelled orders" icon="wallet" />
        <Stat label="Needs attention" value={plural(newCount, "order")} change={newCount ? "New orders to confirm" : "Nothing waiting"} icon="clock" />
        <Stat
          label="In stock"
          value={plural(inStock, "product")}
          change={soldOut || lowStock ? [soldOut ? `${soldOut} sold out` : "", lowStock ? `${lowStock} running low` : ""].filter(Boolean).join(" · ") : "All stocked up"}
          icon="package"
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Sales overview</h2>
              <p>Order value over time</p>
            </div>
            <Select label={period} options={["Last 7 days", "Last 30 days", "This month"]} onChange={setPeriod} />
          </div>
          <OrderChart days={metrics.days} />
          <div className="chart-footer">
            <span className="legend">Order value</span>
            <span>EGP · {period}</span>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Popular right now</h2>
              <p>Your most-loved pieces</p>
            </div>
            <button className="text-button" onClick={() => navigate("admin/products")}>
              View products
            </button>
          </div>
          <div className="activity">
            {!popular.length ? <div className="empty">Sales will appear here when orders arrive.</div> : null}
            {popular.map((p) => (
              <div key={p._id} className="activity-row">
                <SmartImage className="activity-image" src={p.img} alt="" />
                <div className="info">
                  <strong>{p.name}</strong>
                  <small>{metrics.sold.get(p.number) ?? 0} sold</small>
                </div>
                <strong className="number">{money(p.price)}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <h2>Recent orders</h2>
            <p>Stay on top of every order</p>
          </div>
          <button className="text-button" onClick={() => navigate("admin/orders")}>
            All orders <Icon name="arrow" size="sm" />
          </button>
        </div>
        <OrdersTable rows={recent} onOpen={ctx.openOrder} />
      </section>
    </>
  );
}

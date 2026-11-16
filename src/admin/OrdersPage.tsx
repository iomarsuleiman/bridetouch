import { useState } from "react";
import { Icon } from "../components/Icon";
import { useToast } from "../components/Toast";
import { Heading, Select } from "./shared";
import { OrdersTable } from "./OrdersTable";
import { exportOrders } from "./utils";
import type { AdminCtx } from "./types";

// Port of the vanilla orderPage().
export function OrdersPage({ ctx }: { ctx: AdminCtx }) {
  const toast = useToast();
  const [tab, setTab] = useState("All");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const tabs = ["All", "New", "Confirmed", "Making", "Packed", "Shipped", "Delivered", "Cancelled"];
  const filtered = ctx.orders.filter(
    (o) =>
      (tab === "All" || o.status === tab) &&
      (filter === "All" || o.payment === filter) &&
      (!query || (String(o.number) + " " + o.customer).toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <>
      <Heading
        title="Orders"
        subtitle="Manage orders from placement to delivery."
        actions={
          <button className="btn primary" type="button" onClick={() => ctx.openModal("new-order")}>
            <Icon name="plus" size="sm" /> New order
          </button>
        }
      />
      <section className="panel">
        <div className="tabs" role="tablist" aria-label="Filter orders">
          {tabs.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              className={"tab" + (tab === t ? " active" : "")}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="toolbar">
          <div className="search">
            <Icon name="search" size="sm" />
            <input
              aria-label="Search orders"
              placeholder="Search orders"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="toolbar-right">
            <Select label={filter} options={["All", "Unpaid", "Collected", "Settled"]} onChange={setFilter} />
            <button
              className="btn secondary"
              type="button"
              onClick={() => {
                exportOrders(ctx.orders);
                toast("CSV exported");
              }}
            >
              <Icon name="download" size="sm" /> Export
            </button>
          </div>
        </div>
        <OrdersTable rows={filtered} onOpen={ctx.openOrder} />
      </section>
    </>
  );
}

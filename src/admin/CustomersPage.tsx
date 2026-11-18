import { Icon } from "../components/Icon";
import { useToast } from "../components/Toast";
import { money } from "../lib/format";
import { Heading } from "./shared";
import { customerSummary, exportCustomers } from "./utils";
import { useState } from "react";
import type { AdminCtx } from "./types";

// Port of the vanilla customersPage() — orders aggregated by phone number.
export function CustomersPage({ ctx }: { ctx: AdminCtx }) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const all = customerSummary(ctx.orders);
  const q = query.trim().toLowerCase();
  const customers = q ? all.filter((c) => (c.name + " " + c.phone + " " + c.city).toLowerCase().includes(q)) : all;

  return (
    <>
      <Heading
        title="Customers"
        subtitle="A little history behind each order."
        actions={
          <button
            className="btn secondary"
            type="button"
            onClick={() => {
              exportCustomers(ctx.orders);
              toast("CSV exported");
            }}
          >
            <Icon name="download" size="sm" /> Export
          </button>
        }
      />
      <section className="panel">
        <div className="toolbar">
          <div className="search">
            <Icon name="search" size="sm" />
            <input type="search" aria-label="Search customers" placeholder="Search name, phone or city" value={query}
              enterKeyHint="search" autoComplete="off" onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="toolbar-right"><span className="muted" style={{ fontSize: 12 }}>{all.length} customers</span></div>
        </div>
        {!customers.length ? <div className="empty">{all.length ? "No customers match that search." : "Customers appear here after their first order."}</div> : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Location</th>
                <th>Orders</th>
                <th>Order value</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.phone}>
                  <td>
                    <div className="order-customer">
                      <span className="customer-avatar">{c.name.charAt(0)}</span>
                      {c.name}
                    </div>
                  </td>
                  <td><a className="text-link" href={`tel:${c.phone}`}>{c.phone}</a></td>
                  <td>{c.city}</td>
                  <td>{c.orders}</td>
                  <td>{money(c.spent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mobile-cards">
          {customers.map((c) => (
            <a key={c.phone} className="mobile-data" href={`tel:${c.phone}`} aria-label={`Call ${c.name}`}>
              <span className="customer-avatar">{c.name.charAt(0)}</span>
              <span style={{ flex: 1 }}>
                <strong>{c.name}</strong>
                <small>
                  {c.phone} · {c.orders} {c.orders === 1 ? "order" : "orders"}
                </small>
              </span>
              <strong>{money(c.spent)}</strong>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}

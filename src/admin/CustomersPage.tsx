import { Icon } from "../components/Icon";
import { useToast } from "../components/Toast";
import { money } from "../lib/format";
import { Heading } from "./shared";
import { exportCustomers } from "./utils";
import type { AdminCtx } from "./types";

// Port of the vanilla customersPage() — orders aggregated by phone number.
export function CustomersPage({ ctx }: { ctx: AdminCtx }) {
  const toast = useToast();
  const byPhone = new Map<string, { name: string; phone: string; city: string; orders: number; spent: number }>();
  for (const o of ctx.orders) {
    const existing = byPhone.get(o.phone);
    if (existing) {
      existing.orders++;
      existing.spent += o.total;
    } else {
      byPhone.set(o.phone, { name: o.customer, phone: o.phone, city: o.city, orders: 1, spent: o.total });
    }
  }
  const customers = [...byPhone.values()];

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
      {!customers.length ? <div className="empty">Customers appear here after their first order.</div> : null}
      <section className="panel">
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
                  <td>{c.phone}</td>
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
            <div key={c.phone} className="mobile-data">
              <span className="customer-avatar">{c.name.charAt(0)}</span>
              <span style={{ flex: 1 }}>
                <strong>{c.name}</strong>
                <small>
                  {c.phone} · {c.orders} orders
                </small>
              </span>
              <strong>{money(c.spent)}</strong>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

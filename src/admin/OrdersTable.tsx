import type { Doc, Id } from "../../convex/_generated/dataModel";
import { Badge } from "../components/Badge";
import { Icon } from "../components/Icon";
import { money, formatOrderDate } from "../lib/format";

// Port of the vanilla tableOrders() — table on desktop, cards on mobile.
export function OrdersTable({
  rows,
  onOpen,
}: {
  rows: Doc<"orders">[];
  onOpen: (id: Id<"orders">) => void;
}) {
  return (
    <>
      {!rows.length ? <div className="empty">No orders to show.</div> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Total</th>
              <th>Order status</th>
              <th>Payment</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o._id}>
                <td>
                  <button className="text-button" onClick={() => onOpen(o._id)}>
                    #ML-{o.number}
                  </button>
                </td>
                <td>
                  <div className="order-customer">
                    <span className="customer-avatar">{o.customer.charAt(0)}</span>
                    {o.customer}
                  </div>
                </td>
                <td>{formatOrderDate(o.date)}</td>
                <td style={{ color: "#415b46", fontWeight: 750 }}>{money(o.total)}</td>
                <td>
                  <Badge text={o.status} />
                </td>
                <td>
                  <Badge text={o.payment} />
                </td>
                <td>
                  <button
                    className="row-action"
                    onClick={() => onOpen(o._id)}
                    aria-label={"Open order ML-" + o.number}
                  >
                    <Icon name="right" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mobile-cards">
        {rows.map((o) => (
          <button
            key={o._id}
            className="mobile-data"
            style={{ width: "100%", textAlign: "left" }}
            onClick={() => onOpen(o._id)}
          >
            <span className="customer-avatar">{o.customer.charAt(0)}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <strong>
                #ML-{o.number} · {o.customer}
              </strong>
              <small>{formatOrderDate(o.date)}</small>
            </span>
            <span className="right">
              <strong>{money(o.total)}</strong>
              <small>{o.status}</small>
            </span>
            <Icon name="right" size="sm" />
          </button>
        ))}
      </div>
    </>
  );
}

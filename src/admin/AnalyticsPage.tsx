import { orderMetrics } from "./metrics";
import { OrderChart } from "./OrderChart";
import { useState } from "react";
import { money } from "../lib/format";
import { Heading, Select, Stat } from "./shared";
import type { AdminCtx } from "./types";

const STATUSES = ["New", "Confirmed", "Making", "Packed", "Shipped", "Delivered", "Cancelled"];

// Port of the vanilla analyticsPage().
export function AnalyticsPage({ ctx }: { ctx: AdminCtx }) {
  const [period, setPeriod] = useState("Last 7 days");
  const {selected, total, paid, average, days} = orderMetrics(ctx.orders,period);

  return (
    <>
      <Heading
        title="Analytics"
        subtitle="A clear picture of your store."
        actions={
          <Select label={period} options={["Last 7 days", "Last 30 days", "This month"]} onChange={setPeriod} />
        }
      />
      <div className="stat-grid">
        <Stat label="Order value" value={money(total)} change="Excludes cancelled orders" icon="chart" />
        <Stat label="Cash collected" value={money(paid)} change="Recorded payments" icon="wallet" />
        <Stat
          label="Average order"
          value={money(Math.round(average))}
          change="For selected period"
          icon="bag"
        />
        <Stat label="Outstanding COD" value={money(total - paid)} change="Not yet collected" icon="clock" />
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Order activity</h2>
              <p>Daily orders for the selected period</p>
            </div>

          </div>
          <OrderChart days={days} volume />
          <div className="chart-footer">
            <span className="legend">Order volume</span>
            <span>{period}</span>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <h2>Order status</h2>
          </div>
          <div style={{ padding: "0 22px 25px" }}>
            {STATUSES.map((s) => {
              const n = selected.filter((o) => o.status === s).length;
              return (
                <div key={s} style={{ margin: "15px 0" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 9,
                      fontSize: 12,
                      color: "#68796b",
                    }}
                  >
                    <span>{s}</span>
                    <strong>{n}</strong>
                  </div>
                  <div className="mini-progress">
                    <i style={{ width: (n / Math.max(1, selected.length)) * 100 + "%" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}

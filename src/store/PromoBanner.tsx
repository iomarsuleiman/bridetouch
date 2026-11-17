import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import type { Doc } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { Icon } from "../components/Icon";
import { useStoreUI } from "./ui";

function countdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const clock = `${pad(h)}:${pad(m)}:${pad(s)}`;
  return d > 0 ? `${d}d ${clock}` : clock;
}

// The top banner now promotes sales, discounts and timed offers.
// The dashboard is intentionally NOT linked here — it is reachable
// only by typing /admin.
export function PromoBanner() {
  const sale = useQuery(api.sales.active);
  const offers = useQuery(api.offers.list);
  const { goToCategory } = useStoreUI();

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(t);
  }, []);

  if (sale) {
    return (
      <div className="demo-banner">
        <Icon name="sparkle" size="sm" />
        {sale.name} · {sale.percentOff}% off everything applied at checkout
        <span className="light banner-clock">· {countdown(sale.endsAt - now)} left</span>
        <button type="button" onClick={() => goToCategory("All")}>
          Shop the sale <Icon name="arrow" size="sm" />
        </button>
      </div>
    );
  }

  const active = (offers ?? []).filter((o) => o.active);
  if (active.length) {
    return (
      <div className="demo-banner">
        <Icon name="gift" size="sm" />
        {active.map((o) => (
          <span key={o._id}>
            {o.name} <span className="light">· {o.details}</span>
          </span>
        ))}
        <button type="button" onClick={() => goToCategory("All")}>
          Shop now <Icon name="arrow" size="sm" />
        </button>
      </div>
    );
  }

  return null;
}

export type SaleDoc = Doc<"sales">;

import type { Doc } from "../../convex/_generated/dataModel";
export function orderMetrics(orders: Doc<"orders">[], period: string, now = Date.now()) {
  const end = new Date(now); end.setHours(23,59,59,999);
  const start = new Date(now); start.setHours(0,0,0,0);
  if (period === "This month") start.setDate(1);
  else start.setDate(start.getDate() - (period === "Last 30 days" ? 29 : 6));
  const placed = (o: Doc<"orders">) => o.placedAt ?? o._creationTime;
  const selected = orders.filter(o => placed(o) >= start.getTime() && placed(o) <= end.getTime());
  const active = selected.filter(o => o.status !== "Cancelled");
  const total = active.reduce((sum,o) => sum + o.total,0);
  const paid = active.filter(o => o.payment === "Collected" || o.payment === "Settled").reduce((sum,o) => sum + o.total,0);
  const days: {label:string; total:number; count:number}[] = [];
  for (const day = new Date(start); day <= end; day.setDate(day.getDate()+1)) {
    const next = new Date(day); next.setDate(next.getDate()+1);
    const rows = active.filter(o => placed(o) >= day.getTime() && placed(o) < next.getTime());
    days.push({label:day.toLocaleDateString("en-GB",{day:"numeric",month:"short"}),total:rows.reduce((sum,o)=>sum+o.total,0),count:rows.length});
  }
  const sold = new Map<number,number>();
  for (const order of active) for (const item of order.items) sold.set(item.number,(sold.get(item.number) ?? 0)+item.qty);
  return {selected,total,paid,average:active.length ? total/active.length : 0,days,sold};
}

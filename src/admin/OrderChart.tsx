import { money } from "../lib/format";
export function OrderChart({days,volume=false}:{days:{label:string;total:number;count:number}[];volume?:boolean}) {
  const max = Math.max(1,...days.map(day=>volume?day.count:day.total));
  return <div className="chart-plot" role="img" aria-label={volume?"Daily order counts":"Daily order value"}><div className="chart-bars">{days.map(day=><div className="chart-col" key={day.label}><div className="chart-bar" style={{height:`${((volume?day.count:day.total)/max)*100}%`}} title={`${day.label}: ${volume ? day.count+" orders" : money(day.total)}`} /><span>{day.label}</span></div>)}</div></div>;
}

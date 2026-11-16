import { statusVariant } from "../lib/format";

export function Badge({ text }: { text: string }) {
  return <span className={`badge ${statusVariant(text)}`}>{text}</span>;
}

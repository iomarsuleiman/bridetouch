/** Homepage headline: everything after the first comma is shown in the
 *  highlight color ("A little something, <em>made by hand.</em>"). */
export function Headline({ text }: { text?: string }) {
  const value = text?.trim() || "A little something, made by hand.";
  const i = value.indexOf(",");
  return i > 0 && i < value.length - 1 ? <>{value.slice(0, i + 1)} <em>{value.slice(i + 1).trim()}</em></> : <>{value}</>;
}

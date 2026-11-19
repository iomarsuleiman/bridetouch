import type { ReactNode } from "react";

/** A deliberately small Markdown renderer for store pages: headings (#, ##,
 *  ###), paragraphs, bullet and numbered lists, **bold**, _italic_ and
 *  [links](https://…). It builds React elements, never raw HTML, so page
 *  content can't inject scripts. */
export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      const content = inline(heading[2]);
      blocks.push(level === 1 ? <h1 key={key++}>{content}</h1> : level === 2 ? <h2 key={key++}>{content}</h2> : <h3 key={key++}>{content}</h3>);
      i++;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: ReactNode[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) items.push(<li key={items.length}>{inline(lines[i++].replace(/^\s*[-*]\s+/, ""))}</li>);
      blocks.push(<ul key={key++}>{items}</ul>);
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: ReactNode[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(<li key={items.length}>{inline(lines[i++].replace(/^\s*\d+[.)]\s+/, ""))}</li>);
      blocks.push(<ol key={key++}>{items}</ol>);
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|\s*[-*]\s+|\s*\d+[.)]\s+)/.test(lines[i])) para.push(lines[i++]);
    blocks.push(<p key={key++}>{inline(para.join(" "))}</p>);
  }
  return <>{blocks}</>;
}

const SAFE_HREF = /^(https:\/\/|mailto:|tel:|\/(?!\/))/i;

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*|_(.+?)_|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let k = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) out.push(text.slice(last, match.index));
    if (match[1] !== undefined) out.push(<strong key={k++}>{match[1]}</strong>);
    else if (match[2] !== undefined) out.push(<em key={k++}>{match[2]}</em>);
    else {
      const href = match[4];
      out.push(SAFE_HREF.test(href)
        ? <a key={k++} href={href} {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{match[3]}</a>
        : match[3]);
    }
    last = pattern.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

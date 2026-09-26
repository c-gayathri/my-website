export type SummaryPart = { text: string; href?: string };

/** Split authored summary text into plain spans and safe HTTP(S) links. */
export function summaryParts(value: string): SummaryPart[] {
  const pattern = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|https?:\/\/[^\s<>()]+)/g;
  const parts: SummaryPart[] = [];
  let cursor = 0;
  for (const match of value.matchAll(pattern)) {
    const at = match.index ?? 0;
    if (at > cursor) parts.push({ text: value.slice(cursor, at) });
    parts.push({ text: match[2] ?? match[0], href: match[3] ?? match[0] });
    cursor = at + match[0].length;
  }
  if (cursor < value.length) parts.push({ text: value.slice(cursor) });
  return parts;
}

// ── Featured writing order ────────────────────────────────────────────
// Entries listed here are featured and appear first in this exact order.
// Unlisted entries follow in descending date order. The same rules are used
// by both the Writing Pad and the Index.

export const writingOrder: string[] = [
  'heisenberg-s-maps',
  'pain-is-red',
  'subliminal',
  'cotton-candy-fluff',
];

const featuredPositions = new Map(writingOrder.map((id, index) => [id, index] as const));

export const isFeaturedWriting = (id: string) => featuredPositions.has(id);

export function sortWritingEntries<T extends { id: string; data: { date: Date } }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => {
    const aPosition = featuredPositions.get(a.id);
    const bPosition = featuredPositions.get(b.id);
    if (aPosition != null || bPosition != null) {
      if (aPosition == null) return 1;
      if (bPosition == null) return -1;
      return aPosition - bPosition;
    }
    return b.data.date.valueOf() - a.data.date.valueOf() || a.id.localeCompare(b.id);
  });
}

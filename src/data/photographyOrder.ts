// Projects listed here are featured at the top of Photography in this order.
// Other photography projects follow by descending year, then title.
export const photographyOrder: string[] = [];

const positions = new Map(photographyOrder.map((id, index) => [id, index] as const));

export function sortPhotographyProjects<T extends { id: string; data: { year: number; title: string } }>(projects: T[]): T[] {
  return [...projects].sort((a, b) => {
    const aFeatured = positions.get(a.id);
    const bFeatured = positions.get(b.id);
    if (aFeatured !== undefined || bFeatured !== undefined) {
      if (aFeatured === undefined) return 1;
      if (bFeatured === undefined) return -1;
      return aFeatured - bFeatured;
    }
    return b.data.year - a.data.year || a.data.title.localeCompare(b.data.title);
  });
}

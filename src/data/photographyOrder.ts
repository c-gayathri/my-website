// Projects listed here are featured at the top of Photography in this order.
// Other photography projects follow by descending year, then title.
// Add project ids here to feature them at the top of Photography. The order
// in this list is the display order for featured projects. This small example
// keeps three real projects in a visible, editable sequence.
export const photographyOrder: string[] = ['aah-said-the-startled-green-being', 'earthen', 'gloaming', 'reaching', 'witching-hour', 'cherry-coke'];

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

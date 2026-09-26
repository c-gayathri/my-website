/** Return project artwork in source order for collage previews. */
export function projectPreviewImages(data: any, options: { includeVideoPoster?: boolean } = {}) {
  const pool = [data.hero, ...(data.gallery ?? []), data.thumbnail,
    ...(options.includeVideoPoster === false ? [] : [data.videoPoster])].filter(Boolean);
  const unique = pool.filter((image: any, index: number) =>
    pool.findIndex((other: any) => other?.src === image?.src) === index,
  );
  if (data.featuredImage) {
    const hit = unique.find((image: any) => String(image.src).includes(data.featuredImage));
    if (hit) return [hit, ...unique.filter((image: any) => image !== hit)];
  }
  return unique;
}

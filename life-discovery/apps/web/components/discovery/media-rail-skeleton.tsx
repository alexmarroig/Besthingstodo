"use client";

import MediaTileSkeleton, { MediaTileVariant } from "./media-tile-skeleton";

export default function MediaRailSkeleton({
  title,
  count = 4,
  variant = "landscape",
}: {
  title: string;
  count?: number;
  variant?: MediaTileVariant;
}) {
  return (
    <section className="space-y-4" aria-busy="true" aria-label={`Carregando ${title}`}>
      <div className="space-y-2">
        <div className="shimmer h-3 w-32 rounded-md" />
        <div className="shimmer h-4 w-64 max-w-full rounded-md" />
      </div>
      <div className="flex gap-3 overflow-hidden pb-2">
        {Array.from({ length: count }).map((_, index) => (
          <MediaTileSkeleton key={`${title}-${index}`} variant={variant} />
        ))}
      </div>
    </section>
  );
}

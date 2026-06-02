"use client";

export type MediaTileVariant = "landscape" | "poster";

export default function MediaTileSkeleton({ variant = "landscape" }: { variant?: MediaTileVariant }) {
  const isPoster = variant === "poster";

  return (
    <div
      className={`shrink-0 snap-start ${isPoster ? "w-[128px] sm:w-[142px]" : "w-[200px] sm:w-[228px]"}`}
      aria-hidden
    >
      <div className={`experience-card overflow-hidden ${isPoster ? "aspect-[2/3]" : "aspect-[4/3]"}`}>
        <div className="shimmer h-full w-full" />
      </div>
      <div className="mt-2.5 space-y-1.5">
        <div className="shimmer h-3.5 w-[85%] rounded-md" />
        <div className="shimmer h-3 w-[50%] rounded-md" />
      </div>
    </div>
  );
}

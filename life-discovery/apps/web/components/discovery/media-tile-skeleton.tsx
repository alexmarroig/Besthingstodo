"use client";

export type MediaTileVariant = "landscape" | "poster" | "food";

export default function MediaTileSkeleton({ variant = "landscape" }: { variant?: MediaTileVariant }) {
  const isPoster = variant === "poster";

  return (
    <div
      className={`shrink-0 snap-start ${isPoster ? "w-[134px] sm:w-[148px]" : variant === "food" ? "w-[260px] sm:w-[300px]" : "w-[210px] sm:w-[236px]"}`}
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

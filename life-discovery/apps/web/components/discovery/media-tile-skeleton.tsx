"use client";

export type MediaTileVariant = "landscape" | "poster" | "food";

export default function MediaTileSkeleton({ variant = "landscape" }: { variant?: MediaTileVariant }) {
  const isPoster = variant === "poster";

  return (
    <div
      className={`shrink-0 snap-start ${isPoster ? "w-[min(38vw,168px)] sm:w-[174px] lg:w-[186px]" : variant === "food" ? "w-[min(74vw,272px)] sm:w-[286px] lg:w-[306px]" : "w-[min(69vw,248px)] sm:w-[264px] lg:w-[288px]"}`}
      aria-hidden
    >
      <div className={`experience-card overflow-hidden ${isPoster ? "aspect-[2/3]" : variant === "food" ? "aspect-[5/4]" : "aspect-[4/3]"}`}>
        <div className="shimmer h-full w-full" />
      </div>
      <div className="mt-2.5 space-y-1.5">
        <div className="shimmer h-3.5 w-[85%] rounded-md" />
        <div className="shimmer h-3 w-[50%] rounded-md" />
      </div>
    </div>
  );
}

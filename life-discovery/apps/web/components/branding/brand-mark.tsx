type BrandMarkSize = "sm" | "md" | "lg";

const sizeStyles: Record<BrandMarkSize, { outer: string; inner: string }> = {
  sm: {
    outer: "h-10 w-10",
    inner: "h-8 w-8 rounded-[0.85rem] text-xs",
  },
  md: {
    outer: "h-[4.5rem] w-[4.5rem]",
    inner: "h-[3.35rem] w-[3.35rem] rounded-[1.15rem] text-lg",
  },
  lg: {
    outer: "h-24 w-24",
    inner: "h-[4.5rem] w-[4.5rem] rounded-[1.35rem] text-2xl",
  },
};

export default function BrandMark({
  size = "md",
  glow = false,
}: {
  size?: BrandMarkSize;
  glow?: boolean;
}) {
  const styles = sizeStyles[size];

  return (
    <div className={`relative flex items-center justify-center ${styles.outer}`}>
      <div
        className={`absolute inset-0 rounded-full bg-gradient-to-br from-[#ff7a59]/25 via-transparent to-[#f4d06f]/15 ${
          glow ? "animate-pulse-glow" : ""
        }`}
        aria-hidden
      />
      <div
        className="absolute inset-[3px] rounded-full border border-white/10"
        aria-hidden
      />
      <div
        className={`relative flex items-center justify-center bg-gradient-to-br from-[#ff7a59]/35 via-[#1a2433]/80 to-[#f4d06f]/15 font-bold tracking-[0.18em] text-[#fff2cf] ring-1 ring-white/12 shadow-glow-sm ${styles.inner}`}
      >
        R2
      </div>
    </div>
  );
}

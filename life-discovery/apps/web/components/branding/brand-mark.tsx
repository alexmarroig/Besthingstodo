type BrandMarkSize = "sm" | "md" | "lg";

const dimensions: Record<BrandMarkSize, string> = {
  sm: "h-9 w-9",
  md: "h-14 w-14",
  lg: "h-20 w-20",
};

export default function BrandMark({
  size = "md",
  glow: _glow = false,
}: {
  size?: BrandMarkSize;
  glow?: boolean;
}) {
  void _glow;
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-[13px] border border-[#d4b47a]/35 bg-[#171d22] text-[#e7c98e] ${dimensions[size]}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 40 40" fill="none" className="h-[64%] w-[64%]">
        <circle cx="20" cy="20" r="15.5" stroke="currentColor" strokeWidth="1" opacity=".5" />
        <path d="M11 28L20 10L29 28L20 24L11 28Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <circle cx="20" cy="20" r="2.1" fill="currentColor" />
      </svg>
    </span>
  );
}

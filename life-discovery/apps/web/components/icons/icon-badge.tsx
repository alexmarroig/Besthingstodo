import type { LucideIcon } from "lucide-react";

type IconBadgeVariant = "neutral" | "coral" | "gold" | "active";

const variantStyles: Record<IconBadgeVariant, string> = {
  neutral: "bg-white/[0.06] text-white/75 group-hover:bg-[#ff7a59]/12 group-hover:text-[#ffb89a]",
  coral: "bg-gradient-to-br from-[#ff7a59]/20 to-[#ff7a59]/5 text-[#ffb89a] ring-1 ring-[#ff7a59]/20",
  gold: "bg-gradient-to-br from-[#f4d06f]/18 to-transparent text-[#f4d06f] ring-1 ring-[#f4d06f]/15",
  active: "bg-gradient-to-b from-[#ff7a59]/30 to-[#ff7a59]/10 text-white ring-1 ring-[#ff7a59]/35",
};

export default function IconBadge({
  icon: Icon,
  variant = "neutral",
  size = "md",
  className = "",
}: {
  icon: LucideIcon;
  variant?: IconBadgeVariant;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClass =
    size === "sm" ? "h-9 w-9 [&_svg]:h-[18px] [&_svg]:w-[18px]" : size === "lg" ? "h-14 w-14 [&_svg]:h-7 [&_svg]:w-7" : "h-10 w-10 [&_svg]:h-5 [&_svg]:w-5";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-2xl transition duration-300 ${sizeClass} ${variantStyles[variant]} ${className}`}
    >
      <Icon strokeWidth={size === "lg" ? 1.75 : 2} aria-hidden />
    </span>
  );
}

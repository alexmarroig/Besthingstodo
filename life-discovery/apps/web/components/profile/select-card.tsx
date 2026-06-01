"use client";

export function SelectCard({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
        selected
          ? "border-[#f97352]/50 bg-[#f97352]/15 text-white"
          : "border-white/10 bg-white/5 text-white/72 hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );
}

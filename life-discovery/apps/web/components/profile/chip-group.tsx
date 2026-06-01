"use client";

export function ChipGroup({
  title,
  options,
  values,
  onToggle,
}: {
  title: string;
  options: string[];
  values: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.22em] text-white/50">{title}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            className={`rounded-full px-3 py-1.5 text-xs transition ${
              values.includes(option)
                ? "bg-[#f97352] text-white"
                : "border border-white/12 bg-white/6 text-white/70 hover:bg-white/10"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

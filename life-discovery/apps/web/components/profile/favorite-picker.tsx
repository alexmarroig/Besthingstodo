"use client";

import { useState } from "react";

export function FavoritePicker({
  title,
  placeholder,
  values,
  onChange,
}: {
  title: string;
  placeholder: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const trimmed = draft.trim();
    if (!trimmed || values.includes(trimmed)) return;
    onChange([...values, trimmed]);
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.22em] text-white/50">{title}</p>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="flex-1 rounded-[1rem] border border-white/8 bg-white/6 px-4 py-2.5 text-sm text-white"
        />
        <button
          type="button"
          onClick={add}
          className="shrink-0 rounded-full bg-[#f97352] px-4 py-2 text-xs font-medium text-white"
        >
          Adicionar
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onChange(values.filter((item) => item !== value))}
            className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs text-white/80"
          >
            {value} ×
          </button>
        ))}
      </div>
    </div>
  );
}

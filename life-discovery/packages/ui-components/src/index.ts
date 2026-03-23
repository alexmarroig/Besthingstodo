export type AppCardProps = {
  title: string;
  subtitle?: string;
};

export const editorialTokens = {
  color: {
    background: "#08111d",
    surface: "#112136",
    border: "rgba(255,255,255,0.08)",
    accent: "#f97352",
    accentSoft: "#f4d06f",
    text: "#ffffff",
    textMuted: "rgba(255,255,255,0.68)"
  },
  radius: {
    xl: "1.5rem",
    hero: "2.5rem"
  }
} as const;

export function appCardClassName(): string {
  return "rounded-2xl border border-neutral-200 bg-white p-4";
}

export function editorialCardClassName(): string {
  return "rounded-[2rem] border border-white/8 bg-[#112136] p-5 text-white";
}

export function primaryButtonClassName(): string {
  return "rounded-full bg-[#f97352] px-5 py-3 text-sm font-medium text-white shadow-[0_18px_35px_rgba(249,115,82,0.28)]";
}

export type AppCardProps = {
  title: string;
  subtitle?: string;
};

export function appCardClassName(): string {
  return "rounded-2xl border border-neutral-200 bg-white p-4";
}

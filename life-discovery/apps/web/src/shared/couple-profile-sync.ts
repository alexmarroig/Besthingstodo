import type { CoupleSnapshot } from "@life/shared-types";

export async function syncCoupleProfileToSupabase(profile: CoupleSnapshot, userId: string) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { synced: false, reason: "missing_env" as const };

  const payload = {
    user_id: userId,
    city: profile.city,
    neighborhood: profile.neighborhood,
    profile,
    updated_at: new Date().toISOString(),
  };

  const res = await fetch(`${url}/rest/v1/couple_profiles?on_conflict=user_id`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(payload),
  });

  return { synced: res.ok, status: res.status, reason: res.ok ? ("ok" as const) : ("error" as const) };
}

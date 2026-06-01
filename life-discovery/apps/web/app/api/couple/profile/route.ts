import { NextResponse } from "next/server";

import { buildCoupleProfileFromForm } from "@/shared/couple-profile-builder";
import { syncCoupleProfileToSupabase } from "@/shared/couple-profile-sync";
import type { CoupleSnapshot } from "@life/shared-types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { profile: Partial<CoupleSnapshot>; user_id?: string };
    const profile = buildCoupleProfileFromForm(body.profile || {});
    const userId = body.user_id || profile.user_id || "local-user";

    const sync = await syncCoupleProfileToSupabase({ ...profile, user_id: userId }, userId);

    return NextResponse.json({ profile, sync }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "sync_failed" },
      { status: 500 }
    );
  }
}

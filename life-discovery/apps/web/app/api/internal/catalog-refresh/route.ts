import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { refreshCatalog } from "@/server/catalog-refresh";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization") || "";
  const expectedHeader = `Bearer ${expected}`;
  if (!expected || Buffer.byteLength(provided) !== Buffer.byteLength(expectedHeader) || !timingSafeEqual(Buffer.from(provided), Buffer.from(expectedHeader))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try { return NextResponse.json(await refreshCatalog(), { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "A coleta falhou. Os últimos dados válidos foram preservados." }, { status: 503 }); }
}

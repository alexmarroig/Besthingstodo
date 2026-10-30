import { NextResponse } from "next/server";
import { AccountAccessError, requireAccount } from "@/server/auth";
import { mutateAccountState, readAccountState } from "@/server/account-repository";
import { parseStatePatch } from "@/shared/account-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
function failure(error: unknown) {
  if (error instanceof AccountAccessError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
  return NextResponse.json({ error: "Não foi possível sincronizar. As alterações continuam neste aparelho." }, { status: 503, headers });
}
export async function GET() {
  try { const account = await requireAccount(); return NextResponse.json({ ...await readAccountState(account), accountId: account }, { headers }); }
  catch (error) { return failure(error); }
}
export async function PATCH(request: Request) {
  try {
    const account = await requireAccount();
    if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "Origem inválida." }, { status: 403, headers });
    const body = await request.text();
    if (body.length > 512_000) return NextResponse.json({ error: "Alteração muito grande." }, { status: 413, headers });
    let patch;
    try {
      const { expectedAccountId, ...changes } = JSON.parse(body);
      if (expectedAccountId !== account) return NextResponse.json({ error: "A conta mudou. Entre novamente para sincronizar." }, { status: 412, headers });
      patch = parseStatePatch(changes);
    }
    catch { return NextResponse.json({ error: "Alterações inválidas." }, { status: 400, headers }); }
    const result = await mutateAccountState(account, patch.baseVersion, patch.operations);
    return NextResponse.json({ ...result, accountId: account }, { status: result.conflict ? 409 : 200, headers });
  } catch (error) { return failure(error); }
}

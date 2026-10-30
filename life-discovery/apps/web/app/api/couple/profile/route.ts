import { NextResponse } from "next/server";

import { AccountAccessError, requireAccount } from "@/server/auth";
import { mutateAccountState } from "@/server/account-repository";
import { parseStatePatch } from "@/shared/account-state";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const account = await requireAccount();
    if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
    const text = await request.text();
    if (text.length > 64_000) return NextResponse.json({ error: "Perfil muito grande." }, { status: 413 });
    let patch;
    try {
      const body = JSON.parse(text);
      if (body.expectedAccountId !== account) return NextResponse.json({ error: "A conta mudou." }, { status: 412 });
      if (Object.keys(body).some(k => !["profile", "baseVersion", "operationId", "expectedAccountId"].includes(k))) throw new Error();
      patch = parseStatePatch({ baseVersion: body.baseVersion, operations: [{ id: body.operationId, kind: "profile", value: body.profile }] });
    } catch { return NextResponse.json({ error: "Perfil ou versão inválidos." }, { status: 400 }); }
    const result = await mutateAccountState(account, patch.baseVersion, patch.operations);
    return NextResponse.json({ ...result, accountId: account }, { status: result.conflict ? 409 : 200, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof AccountAccessError ? error.message : "Não foi possível salvar o perfil agora." },
      { status: error instanceof AccountAccessError ? error.status : 503 }
    );
  }
}

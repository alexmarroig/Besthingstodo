import { NextResponse } from "next/server";
import { getAuth } from "@/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
async function handle(request: Request, context: Context, method: "GET" | "POST") {
  if (!process.env.NEON_AUTH_BASE_URL || !process.env.NEON_AUTH_COOKIE_SECRET) {
    return NextResponse.json({ code: "AUTH_NOT_CONFIGURED", message: "O acesso à conta está sendo configurado. O catálogo continua disponível." }, { status: 503 });
  }
  try { return await getAuth().handler()[method](request, context); }
  catch { return NextResponse.json({ message: "O serviço de contas não respondeu. Tente novamente." }, { status: 503 }); }
}
export const GET = (request: Request, context: Context) => handle(request, context, "GET");
export const POST = (request: Request, context: Context) => handle(request, context, "POST");

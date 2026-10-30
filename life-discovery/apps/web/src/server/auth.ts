import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";

let instance: ReturnType<typeof createNeonAuth> | undefined;
export function getAuth() {
  if (instance) return instance;
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!baseUrl || !secret || secret.length < 32) throw new Error("auth_not_configured");
  instance = createNeonAuth({ baseUrl, cookies: { secret, sessionDataTtl: 60 }, logLevel: "silent" });
  return instance;
}

export class AccountAccessError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function requireAccount() {
  if (!process.env.NEON_AUTH_BASE_URL || !process.env.NEON_AUTH_COOKIE_SECRET) throw new AccountAccessError(503, "O acesso à conta está sendo configurado.");
  const { data, error } = await getAuth().getSession();
  if (error) throw new AccountAccessError(503, "Não foi possível verificar sua sessão. Tente novamente.");
  if (!data?.user?.id) throw new AccountAccessError(401, "Entre para salvar os dados do casal.");
  if (!data.user.emailVerified) throw new AccountAccessError(403, "Confirme seu e-mail para sincronizar os dados.");
  return data.user.id;
}

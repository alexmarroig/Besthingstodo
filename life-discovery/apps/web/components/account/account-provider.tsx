"use client";
import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/shared/auth-client";
import { ACCOUNT_REQUIRED_EVENT, activateAccount, getAccountServerSnapshot, getAccountSnapshot, getAccountState, hasLegacyData, importLegacyData, listenForAccountSync, subscribeAccount, synchronizeAccount } from "@/shared/account-sync";
import Link from "next/link";
import { CloudCheck, CloudOff, LogIn, LogOut, RefreshCw } from "lucide-react";
import { usePathname } from "next/navigation";

const AccountContext = createContext({ loading: true, email: "", verified: false });
export function AccountProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const client = useQueryClient();
  const snapshot = useSyncExternalStore(subscribeAccount, getAccountSnapshot, getAccountServerSnapshot);
  const [requestLogin, setRequestLogin] = useState(false);
  const [importDismissed, setImportDismissed] = useState(false);
  useEffect(() => {
    if (isPending) return;
    const id = session?.user.id || null;
    if (getAccountSnapshot().accountId !== id) { activateAccount(id); client.clear(); setImportDismissed(false); }
  }, [session?.user.id, isPending, client]);
  useEffect(() => listenForAccountSync(), []);
  useEffect(() => {
    const require = () => setRequestLogin(true);
    const sync = () => {
      void client.invalidateQueries({ queryKey: ["couple-me"] });
      void client.invalidateQueries({ queryKey: ["recommendation-sources"] });
    };
    window.addEventListener(ACCOUNT_REQUIRED_EVENT, require);
    window.addEventListener("life-ml-updated", sync);
    return () => { window.removeEventListener(ACCOUNT_REQUIRED_EVENT, require); window.removeEventListener("life-ml-updated", sync); };
  }, [client]);
  const importAvailable = snapshot.accountId && snapshot.status === "saved" && !getAccountState().importedLegacy && !importDismissed && hasLegacyData();
  return <AccountContext.Provider value={{ loading: isPending, email: session?.user.email || "", verified: Boolean(session?.user.emailVerified) }}>
    <div key={snapshot.accountId || "guest"}>{children}</div>
    {requestLogin && !snapshot.accountId ? <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" onClick={() => setRequestLogin(false)}>
      <section role="dialog" aria-modal="true" aria-label="Entre para salvar" className="w-full max-w-sm space-y-4 rounded-3xl border border-white/15 bg-[#0a1420] p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-semibold">Guarde os planos de vocês</h2><p className="text-sm text-white/65">Entre ou crie uma conta para salvar e acessar em qualquer aparelho.</p>
        <Link className="food-action food-action-primary w-full" onClick={() => setRequestLogin(false)} href="/auth/sign-in">Entrar ou criar conta</Link>
        <button className="food-action w-full text-white/70" onClick={() => setRequestLogin(false)}>Continuar explorando</button>
      </section>
    </div> : null}
    {importAvailable ? <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
      <section role="dialog" aria-modal="true" aria-label="Importar dados deste aparelho" className="w-full max-w-md space-y-4 rounded-3xl border border-white/15 bg-[#0a1420] p-6">
        <h2 className="text-xl font-semibold">Trazer os dados deste aparelho?</h2>
        <p className="text-sm text-white/65">Há um perfil ou itens salvos antes do login neste navegador. Importe apenas se eles forem de vocês. O destino é a conta {session?.user.email}.</p>
        <button className="food-action food-action-primary w-full" onClick={() => { importLegacyData(); setImportDismissed(true); }}>Importar e sincronizar</button>
        <button className="food-action w-full text-white/70" onClick={() => { sessionStorage.setItem(`r2-import-dismissed:${snapshot.accountId}`, "1"); setImportDismissed(true); }}>Agora não</button>
      </section>
    </div> : null}
  </AccountContext.Provider>;
}

export function AccountBar() {
  const account = useContext(AccountContext);
  const snapshot = useSyncExternalStore(subscribeAccount, getAccountSnapshot, getAccountServerSnapshot);
  const pathname = usePathname();
  if (pathname.startsWith("/auth/")) return null;
  const labels = { guest: "Salve seus planos em qualquer aparelho", syncing: `Sincronizando${snapshot.pending ? ` · ${snapshot.pending} alterações` : "…"}`, saved: "Dados do casal sincronizados", offline: "Sem conexão · alterações guardadas neste aparelho", error: "Sincronização pendente · seus dados continuam neste aparelho", verify: "Confirme seu e-mail para sincronizar" };
  async function signOut() {
    activateAccount(null);
    const result = await authClient.signOut();
    if (result.error) { window.location.reload(); return; }
    window.location.assign("/home");
  }
  return <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 pt-4 text-xs md:px-6">
    <span role="status" className="flex items-center gap-2 text-white/60">{snapshot.status === "saved" ? <CloudCheck className="h-4 w-4 text-emerald-300" /> : snapshot.status === "offline" || snapshot.status === "error" ? <CloudOff className="h-4 w-4 text-[#f4d06f]" /> : null}{account.loading ? "Verificando sua conta…" : labels[snapshot.status]}</span>
    <div className="flex items-center gap-2">
      {snapshot.accountId ? <>
        {snapshot.status === "error" || snapshot.status === "offline" ? <button aria-label="Tentar sincronizar" className="food-action" onClick={() => void synchronizeAccount()}><RefreshCw className="h-4 w-4" />Tentar novamente</button> : null}
        {!account.verified ? <Link className="food-action text-[#f4d06f]" href={`/auth/verify-email?email=${encodeURIComponent(account.email)}`}>Confirmar e-mail</Link> : null}
        <button className="food-action text-white/70" onClick={() => void signOut()}><LogOut className="h-4 w-4" />Sair</button>
      </> : <Link className="food-action text-[#ffb89a]" href="/auth/sign-in"><LogIn className="h-4 w-4" />Entrar</Link>}
    </div>
  </div>;
}

export function AccountGate({ children }: { children: ReactNode }) {
  const account = useContext(AccountContext);
  const snapshot = useSyncExternalStore(subscribeAccount, getAccountSnapshot, getAccountServerSnapshot);
  const pathname = usePathname();
  const privatePage = ["/profile", "/saved", "/agenda", "/onboarding"].some(path => pathname === path || pathname.startsWith(`${path}/`));
  if (!privatePage) return <>{children}</>;
  if (account.loading) return <p role="status" className="p-6 text-sm text-white/60">Carregando sua conta…</p>;
  if (!snapshot.accountId) return <section className="surface-strong mx-auto max-w-lg space-y-4 p-6"><h2 className="text-2xl font-semibold">Um espaço só de vocês</h2><p className="text-sm text-white/65">Entre para acessar o perfil, as coleções e os planos do casal.</p><Link className="food-action food-action-primary" href="/auth/sign-in">Entrar ou criar conta</Link></section>;
  return <>{children}</>;
}

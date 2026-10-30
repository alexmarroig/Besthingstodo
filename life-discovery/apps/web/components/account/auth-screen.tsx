"use client";

import Link from "next/link";
import "@neondatabase/auth-ui/css";
import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthUIProvider, ForgotPasswordForm, ResetPasswordForm } from "@neondatabase/auth-ui";
import { ArrowLeft, Heart, Mail } from "lucide-react";
import { authClient } from "@/shared/auth-client";

const inputClass = "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#ff7a59]";
export default function AuthScreen({ mode }: { mode: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") || "");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(params.get("notice") === "reset-requested"
    ? "Se houver uma conta com este e-mail, você receberá um link para redefinir sua senha."
    : params.get("notice") === "reset-complete" ? "Senha atualizada. Entre com sua nova senha." : "");
  const [error, setError] = useState("");
  const isSignUp = mode === "sign-up";
  const isVerify = mode === "verify-email";
  const recovery = mode === "forgot-password" || mode === "reset-password";
  const title = isSignUp ? "Criar a conta do casal" : isVerify ? "Confirme seu e-mail" : mode === "forgot-password" ? "Recuperar senha" : mode === "reset-password" ? "Escolha uma nova senha" : "Entrar na conta do casal";

  async function sendCode() {
    setError(""); setBusy(true);
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" });
      if (result.error) throw new Error(result.error.message);
      setMessage("Código enviado. Confira também a caixa de spam.");
    } catch { setError("Não foi possível enviar o código. Aguarde um pouco e tente novamente."); }
    finally { setBusy(false); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (isVerify) {
        const result = await authClient.emailOtp.verifyEmail({ email, otp });
        if (result.error) throw new Error(result.error.message);
        window.location.assign("/home"); return;
      }
      if (isSignUp) {
        const result = await authClient.signUp.email({ name: name.trim() || "Nosso casal", email, password });
        if (result.error) throw new Error(result.error.message);
        router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`); return;
      }
      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        if (result.error.code === "EMAIL_NOT_VERIFIED") { router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`); return; }
        throw new Error(result.error.message);
      }
      window.location.assign("/home");
    } catch { setError(isSignUp ? "Não foi possível criar a conta. Confira os dados ou tente entrar com uma conta existente." : "Não foi possível entrar. Confira os dados e tente novamente."); }
    finally { setBusy(false); }
  }
  async function google() {
    setBusy(true); setError("");
    try {
      const result = await authClient.signIn.social({ provider: "google", callbackURL: `${window.location.origin}/home` });
      if (result.error) throw new Error(result.error.message);
    } catch { setError("Não foi possível abrir o Google. Tente novamente."); setBusy(false); }
  }

  return (
    <section className="mx-auto max-w-md space-y-5 rounded-[2rem] border border-white/10 bg-[#0a1420] p-6 sm:p-8">
      <Link href="/home" className="inline-flex min-h-11 items-center gap-2 text-xs text-white/60"><ArrowLeft className="h-4 w-4" />Explorar sem entrar</Link>
      <Heart className="h-8 w-8 text-[#ff7a59]" />
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      <p className="text-sm leading-relaxed text-white/60">Uma conta compartilhada para guardar o perfil, os favoritos e os planos de vocês em qualquer aparelho.</p>
      <p className="rounded-xl bg-[#f4d06f]/10 p-3 text-xs text-[#f4d06f]">Beta gratuito. Os e-mails de teste e a tela do Google podem exibir a marca Neon.</p>
      {recovery ? <AuthUIProvider authClient={authClient} navigate={path => router.push(path.startsWith("/auth/sign-in")
        ? `/auth/sign-in?notice=${mode === "forgot-password" ? "reset-requested" : "reset-complete"}` : path)}
        toast={({ message, variant }) => variant === "error" ? setError(String(message)) : setMessage(String(message))}
        replace={router.replace} basePath="/auth" redirectTo="/home" localization={{
        EMAIL: "E-mail", EMAIL_PLACEHOLDER: "voce@exemplo.com", PASSWORD: "Senha", GO_BACK: "Voltar",
        FORGOT_PASSWORD: "Esqueci minha senha", FORGOT_PASSWORD_ACTION: "Enviar link de recuperação",
        FORGOT_PASSWORD_EMAIL: "Se houver uma conta com este e-mail, você receberá um link para redefinir sua senha.",
        RESET_PASSWORD: "Redefinir senha", RESET_PASSWORD_ACTION: "Salvar nova senha", RESET_PASSWORD_SUCCESS: "Senha atualizada. Entre com sua nova senha.",
        NEW_PASSWORD: "Nova senha", NEW_PASSWORD_PLACEHOLDER: "Digite a nova senha", NEW_PASSWORD_REQUIRED: "Informe a nova senha",
        CONFIRM_PASSWORD: "Confirme a senha", CONFIRM_PASSWORD_PLACEHOLDER: "Digite a senha novamente", CONFIRM_PASSWORD_REQUIRED: "Confirme a nova senha",
        PASSWORDS_DO_NOT_MATCH: "As senhas não coincidem", PASSWORD_TOO_SHORT: "A senha precisa ter pelo menos 8 caracteres", PASSWORD_TOO_LONG: "A senha é muito longa",
        INVALID_PASSWORD: "Senha inválida", INVALID_TOKEN: "O link expirou ou é inválido. Solicite outro link.", IS_INVALID: "inválido", IS_REQUIRED: "obrigatório", REQUEST_FAILED: "Não foi possível concluir. Tente novamente.",
      }}>
        {mode === "forgot-password" ? <ForgotPasswordForm localization={{}} /> : <ResetPasswordForm localization={{}} />}
      </AuthUIProvider> : <form onSubmit={submit} className="space-y-4">
        {isSignUp ? <label className="block space-y-2 text-sm text-white/75"><span>Nome do casal</span><input value={name} onChange={e => setName(e.target.value)} maxLength={100} autoComplete="name" className={inputClass} required /></label> : null}
        <label className="block space-y-2 text-sm text-white/75"><span>E-mail</span><input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" maxLength={254} className={inputClass} required /></label>
        {isVerify ? <label className="block space-y-2 text-sm text-white/75"><span>Código recebido por e-mail</span><input value={otp} onChange={e => setOtp(e.target.value)} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} className={inputClass} required /></label>
          : <label className="block space-y-2 text-sm text-white/75"><span>Senha</span><input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={isSignUp ? "new-password" : "current-password"} minLength={8} maxLength={128} className={inputClass} required /></label>}
        <button disabled={busy} className="food-action food-action-primary w-full disabled:opacity-50">{busy ? "Aguarde…" : isSignUp ? "Criar conta" : isVerify ? "Confirmar e-mail" : "Entrar"}</button>
      </form>}
      {isVerify ? <button type="button" disabled={busy} onClick={() => void sendCode()} className="food-action w-full text-white/75"><Mail className="h-4 w-4" />Reenviar código</button> : !recovery ? <>
        <button type="button" onClick={() => void google()} disabled={busy} className="food-action w-full text-white disabled:opacity-50">Continuar com Google</button>
        <div className="flex flex-wrap justify-between gap-3 text-xs text-white/70"><Link className="py-2 underline" href={isSignUp ? "/auth/sign-in" : "/auth/sign-up"}>{isSignUp ? "Já tenho conta" : "Criar conta do casal"}</Link><Link className="py-2 underline" href="/auth/forgot-password">Esqueci minha senha</Link></div>
      </> : <Link href="/auth/sign-in" className="inline-flex min-h-11 items-center text-sm text-[#ffb89a]">Voltar para entrar</Link>}
      {message ? <p role="status" className="text-sm text-[#f4d06f]">{message}</p> : null}
      {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}
    </section>
  );
}

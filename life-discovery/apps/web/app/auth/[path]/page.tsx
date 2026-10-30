import AuthScreen from "@/components/account/auth-screen";
import { notFound } from "next/navigation";

export default async function AuthPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;
  if (!["sign-in", "sign-up", "verify-email", "forgot-password", "reset-password"].includes(path)) notFound();
  return <AuthScreen mode={path} />;
}

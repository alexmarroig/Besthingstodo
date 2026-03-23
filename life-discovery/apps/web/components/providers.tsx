"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import SplashScreen from "./branding/splash-screen";
import { fetchCoupleMe, login, registerCoupleDefault } from "@/shared/api/client";
import { DEMO_SESSION } from "@/shared/brand";
import { getAccessToken } from "@/shared/storage";

const MIN_SPLASH_MS = 1400;

export default function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false }
        }
      })
  );
  const [bootState, setBootState] = useState({ ready: false, message: "Preparando a curadoria personalizada..." });

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      const startedAt = Date.now();

      try {
        setBootState({ ready: false, message: "Conectando a conta do casal..." });

        let hasSession = Boolean(getAccessToken());
        if (hasSession) {
          const couple = await fetchCoupleMe().catch(() => null);
          hasSession = Boolean(couple);
        }

        if (!hasSession) {
          try {
            await login(DEMO_SESSION.email, DEMO_SESSION.password);
          } catch {
            await registerCoupleDefault(DEMO_SESSION.email, DEMO_SESSION.password);
          }
        }

        setBootState({ ready: false, message: "Carregando restaurantes, filmes e planos da noite..." });
        await client.invalidateQueries();
      } catch {
        setBootState({ ready: false, message: "Entrando mesmo assim. Se algo falhar, a tela avisa." });
      } finally {
        const elapsed = Date.now() - startedAt;
        const remaining = Math.max(0, MIN_SPLASH_MS - elapsed);
        window.setTimeout(() => {
          if (!mounted) return;
          setBootState({ ready: true, message: "" });
        }, remaining);
      }
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, [client]);

  return <QueryClientProvider client={client}>{bootState.ready ? children : <SplashScreen message={bootState.message} />}</QueryClientProvider>;
}

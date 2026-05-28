"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";

import SplashScreen from "./branding/splash-screen";

const MIN_SPLASH_MS = 900;

export default function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false },
        },
      })
  );
  const [bootState, setBootState] = useState({ ready: false, message: "Preparando a curadoria personalizada..." });

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      const startedAt = Date.now();

      try {
        setBootState({ ready: false, message: "Carregando clima, restaurantes e filmes..." });

        // Pre-fetch weather data to warm the cache
        await fetch("/api/weather?city=Sao%20Paulo").catch(() => {});
      } catch {
        // Boot continues even if pre-fetch fails
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

  return (
    <QueryClientProvider client={client}>
      {bootState.ready ? children : <SplashScreen message={bootState.message} />}
    </QueryClientProvider>
  );
}

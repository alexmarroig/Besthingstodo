"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import SplashScreen from "./branding/splash-screen";

const MIN_SPLASH_MS = 1100;
const EXIT_MS = 350;

const BOOT_MESSAGES = [
  "Preparando suas recomendações...",
  "Carregando clima e restaurantes...",
  "Montando a curadoria do casal...",
] as const;

type BootPhase = "loading" | "exiting" | "ready";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, refetchOnWindowFocus: false, retry: 1 },
        },
      })
  );

  const [phase, setPhase] = useState<BootPhase>("loading");
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    let mounted = true;
    const timers: number[] = [];

    async function bootstrap() {
      const startedAt = Date.now();

      setMessageIndex(0);
      setProgress(12);

      timers.push(
        window.setTimeout(() => {
          if (!mounted) return;
          setMessageIndex(1);
          setProgress(48);
        }, 320)
      );

      try {
        await fetch("/api/weather?city=Sao%20Paulo").catch(() => {});
      } catch {
        // Boot continues even if pre-fetch fails
      }

      timers.push(
        window.setTimeout(() => {
          if (!mounted) return;
          setMessageIndex(2);
          setProgress(78);
        }, 680)
      );

      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, MIN_SPLASH_MS - elapsed);

      timers.push(
        window.setTimeout(() => {
          if (!mounted) return;
          setProgress(100);
          setPhase("exiting");
        }, remaining)
      );

      timers.push(
        window.setTimeout(() => {
          if (!mounted) return;
          setPhase("ready");
        }, remaining + EXIT_MS)
      );
    }

    bootstrap();

    return () => {
      mounted = false;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [client]);

  return (
    <QueryClientProvider client={client}>
      {phase === "ready" ? (
        children
      ) : (
        <SplashScreen
          message={BOOT_MESSAGES[messageIndex]}
          progress={progress}
          exiting={phase === "exiting"}
        />
      )}
    </QueryClientProvider>
  );
}

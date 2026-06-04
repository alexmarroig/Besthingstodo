"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import SplashScreen from "./branding/splash-screen";
import { fetchCoupleMe, fetchRecommendationSources, fetchUserContext } from "@/shared/api/client";
import { BOOT_SLIDES } from "@/shared/boot-content";
import { getUserId } from "@/shared/storage";

const MIN_SPLASH_MS = 2200;
const MAX_BOOT_MS = 9000;
const EXIT_MS = 350;

type BootPhase = "loading" | "exiting" | "ready";

function progressForStep(step: number, total: number) {
  return Math.min(96, Math.round(12 + (step / total) * 84));
}

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
  const [slideIndex, setSlideIndex] = useState(0);
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    let mounted = true;
    const timers: number[] = [];

    async function bootstrap() {
      const startedAt = Date.now();
      const slideTotal = BOOT_SLIDES.length;

      const finishBoot = () => {
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
      };

      const bootWork = async () => {
        setSlideIndex(0);
        setProgress(progressForStep(0, slideTotal));

        const couple = await client.fetchQuery({
          queryKey: ["couple-me"],
          queryFn: fetchCoupleMe,
        });

        const city = couple?.city || "Sao Paulo";
        const neighborhood = couple?.neighborhood || "";
        const userId = getUserId();

        setSlideIndex(1);
        setProgress(progressForStep(1, slideTotal));

        await client.prefetchQuery({
          queryKey: ["context", city, neighborhood],
          queryFn: () => fetchUserContext(couple || undefined),
        });

        setSlideIndex(2);
        setProgress(progressForStep(2, slideTotal));

        await client.prefetchQuery({
          queryKey: ["recommendation-sources", userId, city],
          queryFn: () => fetchRecommendationSources(city),
        });

        setSlideIndex(slideTotal - 1);
        setProgress(progressForStep(slideTotal - 1, slideTotal));
      };

      try {
        await Promise.race([
          bootWork(),
          new Promise<void>((resolve) => {
            timers.push(window.setTimeout(resolve, MAX_BOOT_MS));
          }),
        ]);
      } catch {
        // Boot continues even if prefetch fails
      } finally {
        if (mounted) finishBoot();
      }
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
        <SplashScreen slide={BOOT_SLIDES[slideIndex] || BOOT_SLIDES[0]} progress={progress} exiting={phase === "exiting"} />
      )}
    </QueryClientProvider>
  );
}

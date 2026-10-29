"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import SplashScreen from "./branding/splash-screen";
import { fetchCoupleMe, fetchRecommendationSources, fetchUserContext } from "@/shared/api/client";
import { BOOT_SLIDES } from "@/shared/boot-content";
import { prefetchVisibleHomeImages } from "@/shared/home-image-prefetch";
import { getUserId } from "@/shared/storage";
import type { ExperienceContext } from "@life/shared-types";

const BOOT_SESSION_KEY = "life_booted_v2";
const MIN_SPLASH_MS = 450;
const MAX_BOOT_MS = 1600;
const EXIT_MS = 220;

type BootPhase = "loading" | "exiting" | "ready";

function progressForStep(step: number, total: number) {
  return Math.min(96, Math.round(20 + (step / total) * 76));
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60_000,
            gcTime: 15 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  const [phase, setPhase] = useState<BootPhase>("loading");
  const [slideIndex, setSlideIndex] = useState(0);
  const [progress, setProgress] = useState(16);

  useEffect(() => {
    let mounted = true;
    const timers: number[] = [];

    const alreadyBooted =
      typeof window !== "undefined" && window.sessionStorage.getItem(BOOT_SESSION_KEY) === "1";

    if (alreadyBooted) {
      setPhase("ready");
    }

    async function bootstrap() {
      const startedAt = Date.now();
      const slideTotal = BOOT_SLIDES.length;

      const finishBoot = () => {
        if (typeof window !== "undefined") {
          try {
            window.sessionStorage.setItem(BOOT_SESSION_KEY, "1");
          } catch {
            // ignore
          }
        }
        if (alreadyBooted) return;

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
        setProgress(progressForStep(1, slideTotal));

        const couple = await client.fetchQuery({
          queryKey: ["couple-me"],
          queryFn: fetchCoupleMe,
        });

        const city = couple?.city || "Sao Paulo";
        const neighborhood = couple?.neighborhood || "";
        const userId = getUserId();

        setSlideIndex(1);
        setProgress(progressForStep(2, slideTotal));

        await Promise.allSettled([
          client.prefetchQuery({
            queryKey: ["context", city, neighborhood],
            queryFn: () => fetchUserContext(couple || undefined),
          }),
          client.prefetchQuery({
            queryKey: ["recommendation-sources", userId, city],
            queryFn: () => fetchRecommendationSources(city),
          }),
        ]);

        setSlideIndex(slideTotal - 1);
        setProgress(progressForStep(slideTotal - 1, slideTotal));

        const context = client.getQueryData<ExperienceContext>(["context", city, neighborhood]);
        void prefetchVisibleHomeImages(client, {
          userId,
          city,
          couple,
          context,
        });
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
        <SplashScreen
          slide={BOOT_SLIDES[slideIndex] || BOOT_SLIDES[0]}
          progress={progress}
          exiting={phase === "exiting"}
        />
      )}
    </QueryClientProvider>
  );
}

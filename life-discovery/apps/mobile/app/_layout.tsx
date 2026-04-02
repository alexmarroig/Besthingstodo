import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AppProviders } from "../src/providers";
import { AppSplashScreen } from "../src/components/loading-screen";
import { useSession } from "../src/providers";

function RootNavigator() {
  const session = useSession();
  const [splashReady, setSplashReady] = useState(false);

  useEffect(() => {
    if (!session.ready) return;

    const timer = setTimeout(() => setSplashReady(true), 1150);
    return () => clearTimeout(timer);
  }, [session.ready]);

  if (!session.ready || !splashReady) {
    return <AppSplashScreen ready={session.ready} />;
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, animation: "fade" }} />
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}

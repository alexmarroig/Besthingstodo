import { Suspense } from "react";

import OnboardingScreen from "@/features/onboarding/screen";

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-white/60">Carregando onboarding...</div>}>
      <OnboardingScreen />
    </Suspense>
  );
}

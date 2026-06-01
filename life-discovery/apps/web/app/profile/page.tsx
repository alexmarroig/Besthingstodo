import { Suspense } from "react";

import ProfileScreen from "@/features/profile/screen";

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-white/60">Carregando perfil...</div>}>
      <ProfileScreen />
    </Suspense>
  );
}

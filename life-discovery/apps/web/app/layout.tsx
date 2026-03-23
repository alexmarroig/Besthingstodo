import type { Metadata } from "next";

import "./globals.css";

import AppShell from "../components/layout/app-shell";
import Providers from "../components/providers";
import { BRAND } from "@/shared/brand";

export const metadata: Metadata = {
  title: BRAND.name,
  description: BRAND.subtitle
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}

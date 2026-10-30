import type { Metadata } from "next";
import { Poppins } from "next/font/google";

import "./globals.css";

import AppShell from "../components/layout/app-shell";
import Providers from "../components/providers";
import { BRAND } from "@/shared/brand";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: BRAND.name,
  description: BRAND.subtitle
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${poppins.variable} dark`}>
      <body className="font-sans antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}

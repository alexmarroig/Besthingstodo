export const BRAND = {
  name: "Roteiro a Dois",
  eyebrow: "Curadoria em portugues",
  title: "Descobertas pensadas para o casal",
  subtitle: "Sugestoes reais para sair, pedir, assistir e viver melhor a noite em Sao Paulo."
} as const;

export const DEMO_SESSION = {
  email: process.env.NEXT_PUBLIC_DEMO_EMAIL || "alex.c.marroig@gmail.com",
  password: process.env.NEXT_PUBLIC_DEMO_PASSWORD || "alexcamila123"
} as const;

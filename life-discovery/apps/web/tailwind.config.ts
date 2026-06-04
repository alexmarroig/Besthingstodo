import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#060d16",
        surface: "#0c1624",
        primary: "#ff7a59",
        accent: "#ffd166",
        coral: "#f97352",
        gold: "#f4d06f",
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "system-ui", "sans-serif"],
        display: ["var(--font-poppins)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 48px rgba(255, 122, 89, 0.18)",
        "glow-sm": "0 0 24px rgba(255, 122, 89, 0.12)",
        float: "0 20px 50px rgba(0, 0, 0, 0.35)",
        card: "0 8px 32px rgba(0, 0, 0, 0.22)",
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      animation: {
        "fade-up": "fadeUp 0.55s ease-out both",
        "fade-in": "fadeIn 0.4s ease-out both",
        aurora: "aurora 14s ease-in-out infinite alternate",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        aurora: {
          "0%": { opacity: "0.45", transform: "scale(1) translate(0, 0)" },
          "100%": { opacity: "0.7", transform: "scale(1.08) translate(2%, -1%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0B0B0F",
        primary: "#6C5CE7",
        accent: "#FDCB6E"
      },
      boxShadow: {
        glow: "0 0 40px rgba(108,92,231,0.24)"
      }
    }
  },
  plugins: []
};

export default config;


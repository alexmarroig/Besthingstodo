import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#08111d",
        primary: "#ff7a59",
        accent: "#ffd166"
      },
      boxShadow: {
        glow: "0 0 40px rgba(255, 122, 89, 0.22)"
      }
    }
  },
  plugins: []
};

export default config;

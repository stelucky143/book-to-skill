import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: {
          400: "#8b5cf6",
          500: "#7c3aed",
          600: "#6d28d9",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(129, 140, 248, 0.2), 0 20px 50px rgba(79, 70, 229, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;

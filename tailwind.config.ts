import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(100%) scale(0)", opacity: "0" },
          "50%": { transform: "translateY(-100%) scale(1)", opacity: "1" },
        },
        "pulse-ring": {
          "0%, 100%": { transform: "scale(0.95)", opacity: "0.5" },
          "50%": { transform: "scale(1.05)", opacity: "1" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "360%": { transform: "rotate(360deg)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        shimmer: "shimmer 2s infinite",
        float: "float 1.5s ease-in-out infinite",
        "pulse-ring": "pulse-ring 2s ease-in-out infinite",
        "spin-slow": "spin-slow 3s linear infinite",
        "fade-in-up": "fade-in-up 0.6s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;

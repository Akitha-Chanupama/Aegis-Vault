import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./apps/web/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./apps/web/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./apps/web/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      xs: "320px",
      sm: "390px",
      md: "768px",
      lg: "1024px",
      xl: "1440px",
    },
    extend: {
      colors: {
        aegis: {
          bg: "#0B1020",
          surface1: "#121A2A",
          surface2: "#192338",
          surface3: "#222E48",
          borderSubtle: "#242F46",
          borderStrong: "#374669",
          textPrimary: "#F8FAFC",
          textSecondary: "#CBD5E1",
          textMuted: "#94A3B8",
          accent: "#8B7CF6",
          accentHover: "#A79AFB",
          accentMuted: "rgba(139, 124, 246, 0.15)",
          success: "#34D399",
          warning: "#FBBF24",
          danger: "#F87171",
        },
      },
      borderRadius: {
        card: "16px",
      },
      fontFamily: {
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "ui-monospace",
          "SFMono-Regular",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};

export default config;


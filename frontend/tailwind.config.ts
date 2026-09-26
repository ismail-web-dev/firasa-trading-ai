import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: "#090d16",
          panel: "#0f172a",
          border: "#1e293b",
          hover: "#1e293b80",
          text: "#e2e8f0",
          muted: "#94a3b8",
          accent: "#38bdf8",
          up: "#10b981",
          down: "#f43f5e",
        },
      },
    },
  },
  plugins: [],
};
export default config;

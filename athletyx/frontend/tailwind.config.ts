import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        glow: "0 0 40px rgba(52, 211, 153, 0.15)",
        "glow-focus": "0 0 0 1px rgba(148, 163, 184, 0.2), 0 0 32px rgba(52, 211, 153, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;

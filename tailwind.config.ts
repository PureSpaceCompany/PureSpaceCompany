import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:   ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        serif:  ["var(--font-playfair)", "Georgia", "serif"],
      },
      colors: {
        brand: {
          navy:  "#1A3D2B",
          gold:  "#4CAF82",
          cream: "#F3FAF6",
        },
        warm: {
          50:  "#faf9f7",
          100: "#f3f0ea",
          200: "#e8e2d8",
          300: "#d4c9b8",
          400: "#b8a48e",
          500: "#9c8269",
          600: "#7d6451",
          700: "#5e4b3c",
          800: "#3d3028",
          900: "#201a15",
        },
      },
    },
  },
  plugins: [],
};

export default config;

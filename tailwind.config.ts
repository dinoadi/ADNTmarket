import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Playfair Display", "Georgia", "serif"],
        sans: ["Sora", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      colors: {
        brand: {
          50: "#f0f4ff",
          100: "#d9e5ff",
          200: "#b3caff",
          300: "#8caaff",
          400: "#6690ff",
          500: "#2b5de6",
          600: "#1a45cc",
          700: "#0f33a3",
          800: "#0a247a",
          900: "#071952",
          950: "#040e2e",
        },
        surface: {
          50: "#f9f8f5",
          100: "#f0ede8",
          200: "#e2ddd4",
          300: "#ccc4b7",
          400: "#a69b8a",
          500: "#8a7e6d",
          600: "#6e6455",
          700: "#5a5144",
          800: "#4a4238",
          900: "#3d362e",
          950: "#221e18",
        },
        warm: {
          50: "#fefbf5",
          100: "#fcf3e0",
          200: "#f8e5bc",
          300: "#f2d08a",
          400: "#e8b34d",
          500: "#d4942b",
          600: "#b87822",
          700: "#965d1d",
          800: "#7a4b1d",
          900: "#663f1d",
          950: "#3a210c",
        },
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "scale-in": "scaleIn 0.4s ease-out",
        "reveal": "reveal 0.8s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        reveal: {
          "0%": { opacity: "0", transform: "translateY(32px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

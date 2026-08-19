import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B0C0C",        // near-black base
        graphite: "#17191A",   // panel/surface
        steel: "#2A2D2E",      // borders/dividers
        fog: "#9AA0A3",        // secondary text
        chalk: "#F4F5F5",      // primary text on dark
        polish: "#2FBF71",     // Globowax brand green (signature/accent)
        "polish-dim": "#1F8F52",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      borderRadius: {
        card: "18px",
      },
    },
  },
  plugins: [],
};
export default config;

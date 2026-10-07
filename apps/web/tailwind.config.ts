import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Identité de marque (accueil marketing + app) — additif, ne remplace pas les tokens
      // Tailwind par défaut utilisés par admin/login/try.
      colors: {
        brand: {
          ink: "#0E0D0B",
          panel: "#16140F",
          panelAlt: "#121110",
          paper: "#EFECE6",
          paperInk: "#141210",
          cream: "#F2EDE3",
          muted: "#A39D90",
          mutedLight: "#CFC9BC",
          gold: "#E2B65A",
          goldHover: "#EEC877",
          good: "#7FCB94",
          bad: "#E06B57",
        },
      },
      fontFamily: {
        brandSans: ["var(--font-brand-sans)"],
        brandMono: ["var(--font-brand-mono)"],
        brandSerif: ["var(--font-brand-serif)"],
      },
    },
  },
  plugins: [],
};

export default config;

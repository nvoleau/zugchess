import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Identité de marque (accueil marketing + app) — additif, ne remplace pas les tokens
      // Tailwind par défaut utilisés par admin/login/try.
      // Direction "Zugzwang" (chantier 3, refonte) : la tension du coup forcé, esthétique pendule
      // d'échecs — fond graphite froid, accent vermillon (pas l'or de la V1), accent2 ice-teal pour
      // les états secondaires. `paper`/`paperInk` restent inchangés : section claire isolée de
      // l'accueil marketing (`programme-section.tsx`), indépendante de la palette sombre.
      colors: {
        brand: {
          ink: "#0A0E12",
          panel: "#11161C",
          panelAlt: "#161D25",
          paper: "#EFECE6",
          paperInk: "#141210",
          cream: "#DCE4EA",
          muted: "#6B7682",
          mutedLight: "#97A3AE",
          accent: "#FF5F3C",
          accentHover: "#FF7A54",
          accent2: "#2FD9C4",
          good: "#4FD8A8",
          bad: "#E5584A",
        },
      },
      fontFamily: {
        brandSans: ["var(--font-brand-sans)"],
        brandMono: ["var(--font-brand-mono)"],
        // Pas de police serif distincte dans cette direction : le titrage réutilise IBM Plex Mono.
        brandDisplay: ["var(--font-brand-mono)"],
      },
      keyframes: {
        "pop-in": {
          "0%": { transform: "scale(0.85)", opacity: "0" },
          "60%": { transform: "scale(1.04)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "pop-in": "pop-in 0.25s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;

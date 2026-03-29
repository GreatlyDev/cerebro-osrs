import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        osrs: {
          bg: "#14110e",
          bgSoft: "#1d1712",
          panel: "#211a14",
          panel2: "#2a211a",
          stone: "#3a2f26",
          border: "#6b5733",
          borderLight: "#8a7244",
          gold: "#c8a45a",
          goldSoft: "#d9bf86",
          text: "#e7dcc5",
          textSoft: "#cdbfa4",
          success: "#6fa16d",
          danger: "#8b2e2e",
        },
      },
      fontFamily: {
        display: ['"Cinzel"', "Georgia", "serif"],
        sans: ['"Inter"', '"Segoe UI"', "sans-serif"],
      },
      boxShadow: {
        osrs: "0 24px 60px rgba(0, 0, 0, 0.35)",
        insetPanel: "inset 0 1px 0 rgba(255, 241, 214, 0.08), inset 0 0 0 1px rgba(255, 241, 214, 0.03)",
        glowGold: "0 0 0 1px rgba(217, 191, 134, 0.35), 0 0 24px rgba(200, 164, 90, 0.18)",
      },
      backgroundImage: {
        "osrs-shell":
          "radial-gradient(circle at top left, rgba(200, 164, 90, 0.14), transparent 22%), radial-gradient(circle at top right, rgba(111, 161, 109, 0.08), transparent 24%), linear-gradient(180deg, #14110e 0%, #100d0b 34%, #0c0a09 100%)",
        "osrs-panel":
          "linear-gradient(180deg, rgba(42, 33, 26, 0.96), rgba(26, 21, 17, 0.98))",
        "osrs-panel-soft":
          "linear-gradient(180deg, rgba(52, 40, 31, 0.82), rgba(24, 19, 15, 0.95))",
        "osrs-button":
          "linear-gradient(135deg, rgba(217, 191, 134, 0.95), rgba(200, 164, 90, 0.92) 55%, rgba(122, 88, 39, 0.94))",
        "osrs-progress":
          "linear-gradient(90deg, rgba(200, 164, 90, 0.92), rgba(217, 191, 134, 0.95))",
      },
      borderRadius: {
        panel: "1.25rem",
        tile: "1rem",
      },
      keyframes: {
        drift: {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -8px, 0)" },
        },
      },
      animation: {
        drift: "drift 8s ease-in-out infinite",
      },
    },
  },
} satisfies Config;

/** Design tokens from `.cursor/design.json` — Neon Sports / World Cup 2026 */

export const wcColors = {
  deepPurple: "#18004F",
  royalPurple: "#2B0A88",
  electricBlue: "#11398C",
  violetGlow: "#5917FF",
  base: "#12003B",
  cta: "#10B69B",
  ctaHover: "#13C5A7",
  ctaPressed: "#0D9D87",
  orangeStar: "#FF7044",
  yellowHighlight: "#E4FF3B",
  scoreGreen: "#4FB84C",
  scoreBlue: "#394BFF",
  scoreRed: "#FF254D",
  textPrimary: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.92)",
  textMuted: "rgba(255,255,255,0.55)",
  borderSubtle: "rgba(255,255,255,0.12)",
} as const;

export type PageBackgroundVariant = "welcome" | "prediction" | "standings" | "default";

export const pageBackgrounds: Record<
  Exclude<PageBackgroundVariant, "default">,
  {
    assetPath: string;
    imageOpacity: number;
    objectPosition: string;
    accentPalette: string[];
  }
> = {
  welcome: {
    assetPath: "/design/world-cup-2026/welcome.png",
    imageOpacity: 0.32,
    objectPosition: "center center",
    accentPalette: ["#FF7044", "#11398C", "#E4FF3B"],
  },
  prediction: {
    assetPath: "/design/world-cup-2026/prediction.png",
    imageOpacity: 0.22,
    objectPosition: "center 55%",
    accentPalette: ["#C8102E", "#6CACE4", "#2D5016"],
  },
  standings: {
    assetPath: "/design/world-cup-2026/standings.png",
    imageOpacity: 0.25,
    objectPosition: "center center",
    accentPalette: ["#0A1628", "#00B4D8", "#E6399B"],
  },
};

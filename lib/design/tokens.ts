/** Design tokens — Neon Sports / World Cup 2026 */

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

/** Rotating hero backgrounds — one per screen group */
export type PageBackgroundVariant = "heroA" | "heroB" | "heroC" | "default";

export const pageBackgrounds: Record<
  Exclude<PageBackgroundVariant, "default">,
  {
    assetPath: string;
    imageOpacity: number;
    objectPosition: string;
    mobileObjectPosition: string;
  }
> = {
  heroA: {
    assetPath: "/design/backgrounds/hero-painted.png",
    imageOpacity: 0.16,
    objectPosition: "center center",
    mobileObjectPosition: "center 30%",
  },
  heroB: {
    assetPath: "/design/backgrounds/hero-stadium.png",
    imageOpacity: 0.18,
    objectPosition: "center top",
    mobileObjectPosition: "center top",
  },
  heroC: {
    assetPath: "/design/backgrounds/hero-popart.png",
    imageOpacity: 0.15,
    objectPosition: "center center",
    mobileObjectPosition: "center 20%",
  },
};

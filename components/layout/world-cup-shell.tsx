"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { PageBackgroundVariant } from "@/lib/design/tokens";
import { pageBackgrounds } from "@/lib/design/tokens";

type Props = {
  variant: PageBackgroundVariant;
  children: ReactNode;
  className?: string;
};

const accentGlow: Record<Exclude<PageBackgroundVariant, "default">, string> = {
  welcome:
    "bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(255,112,68,0.22),transparent),radial-gradient(ellipse_60%_40%_at_80%_20%,rgba(89,23,255,0.18),transparent)]",
  prediction:
    "bg-[radial-gradient(ellipse_70%_50%_at_50%_100%,rgba(79,184,76,0.14),transparent),radial-gradient(ellipse_50%_40%_at_10%_30%,rgba(57,75,255,0.16),transparent)]",
  standings:
    "bg-[radial-gradient(ellipse_60%_45%_at_20%_20%,rgba(0,180,216,0.18),transparent),radial-gradient(ellipse_55%_40%_at_90%_60%,rgba(230,57,155,0.14),transparent)]",
};

export function WorldCupShell({ variant, children, className }: Props) {
  const hero =
    variant !== "default" ? pageBackgrounds[variant] : null;

  return (
    <div className={cn("relative min-h-screen wc-gradient-bg text-foreground", className)}>
      <div className="wc-pattern-overlay pointer-events-none fixed inset-0 z-0" aria-hidden />
      <div className="wc-vignette pointer-events-none fixed inset-0 z-0" aria-hidden />
      {hero ? (
        <>
          <div
            className={cn(
              "pointer-events-none fixed inset-0 z-0",
              accentGlow[variant],
            )}
            aria-hidden
          />
          <div
            className="pointer-events-none fixed inset-0 z-0 hidden bg-contain bg-center bg-no-repeat sm:block"
            style={{
              backgroundImage: `url(${hero.assetPath})`,
              backgroundPosition: hero.objectPosition,
              opacity: hero.imageOpacity,
            }}
            aria-hidden
          />
        </>
      ) : (
        <div
          className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_0%,rgba(89,23,255,0.15),transparent)]"
          aria-hidden
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { resolvePageVariant } from "@/lib/design/page-variant";
import { WorldCupShell } from "@/components/layout/world-cup-shell";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const variant = resolvePageVariant(pathname);

  return <WorldCupShell variant={variant}>{children}</WorldCupShell>;
}

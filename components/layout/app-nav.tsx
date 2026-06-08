"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { WORLD_CUP_DISPLAY_NAME } from "@/lib/brand";

const links = [
  { href: "/matches", label: "Matches" },
  { href: "/prediction-stat", label: "Prediction Stat" },
  { href: "/tournament", label: "Mega Bonus" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/history", label: "History" },
  { href: "/admin", label: "Admin" },
];

export function AppNav() {
  const pathname = usePathname();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#18004F]/80 shadow-glow backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="bg-gradient-to-r from-white via-wc-yellow to-wc-cta bg-clip-text text-sm font-bold tracking-tight text-transparent">
          {WORLD_CUP_DISPLAY_NAME}
        </p>
        <nav className="flex flex-wrap gap-1 sm:gap-2" aria-label="Main">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-all",
                pathname === href || pathname.startsWith(`${href}/`)
                  ? "wc-nav-active"
                  : "text-white/65 hover:bg-white/10 hover:text-white",
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-white/70 hover:bg-white/10 hover:text-white"
          onClick={signOut}
        >
          Sign out
        </Button>
      </div>
    </header>
  );
}

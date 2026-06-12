import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/auth/login-form";
import { WORLD_CUP_DISPLAY_NAME } from "@/lib/brand";
import { WorldCupShell } from "@/components/layout/world-cup-shell";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect("/matches");
  }

  const params = await searchParams;
  return (
    <WorldCupShell variant="heroA">
      <div className="flex min-h-screen flex-col items-center justify-center px-7 py-10">
        <div className="w-full max-w-[340px] space-y-10 text-center">
          <div className="space-y-4">
            <div className="wc-scoreboard-strip mx-auto max-w-[200px]" aria-hidden />
            <h1 className="wc-hero-headline">{WORLD_CUP_DISPLAY_NAME}</h1>
            <p className="text-lg leading-relaxed text-white/90">
              Pick winners, climb the leaderboard, and compete through every stage of the
              tournament.
            </p>
          </div>

          <div className="wc-glass-card space-y-5 p-6 text-left">
            {params.error === "auth" ? (
              <p className="rounded-lg bg-wc-red/15 px-3 py-2 text-center text-sm text-wc-red">
                Sign-in failed. Try again.
              </p>
            ) : null}
            <LoginForm />
          </div>

          <p className="text-sm text-white/40">
            <Link href="/" className="underline-offset-4 hover:text-wc-yellow hover:underline">
              Home
            </Link>
          </p>
        </div>
      </div>
    </WorldCupShell>
  );
}


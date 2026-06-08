"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

function friendlyAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("rate limit")) {
    return "Too many magic-link emails sent recently. Wait about an hour, or use Continue with Google instead.";
  }
  if (lower.includes("database error saving new user")) {
    return "Sign-up is temporarily unavailable. Please try again shortly or use Continue with Google.";
  }
  return message;
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const supabase = createClient();
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";

  async function signInWithGoogle() {
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=/matches`,
      },
    });
    setLoading(false);
    if (error) setMessage(friendlyAuthError(error.message));
  }

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=/matches`,
      },
    });
    setLoading(false);
    if (error) {
      setMessage(friendlyAuthError(error.message));
      return;
    }
    setMessage("Check your email for the magic link.");
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <Button
        type="button"
        className="wc-cta-button"
        disabled={loading}
        onClick={signInWithGoogle}
      >
        Continue with Google
      </Button>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-white/15" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wider">
          <span className="bg-transparent px-2 text-white/40">Or</span>
        </div>
      </div>
      <form onSubmit={signInWithEmail} className="flex flex-col gap-3">
        <label className="text-sm font-medium text-white/80" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white placeholder:text-white/35 focus:border-wc-cta focus:outline-none focus:ring-2 focus:ring-wc-cta/30"
          placeholder="you@example.com"
        />
        <Button type="submit" variant="secondary" disabled={loading}>
          Email me a magic link
        </Button>
      </form>
      {message ? (
        <p className="text-center text-sm text-white/70">{message}</p>
      ) : null}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    // This email/password might belong to a staff account, not a
    // customer — check before assuming /club is the right destination.
    const res = await fetch("/api/auth/account-type");
    const data = await res.json();
    setLoading(false);

    if (data.type === "customer") {
      router.push("/club");
    } else if (data.type === "staff") {
      router.push("/admin");
    } else {
      await supabase.auth.signOut();
      setError("This account isn't linked to a Globowax Club customer profile yet. New here? Create an account below.");
      return;
    }
    router.refresh();
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <p className="text-polish text-xs uppercase tracking-[0.2em] text-center">Globowax Club</p>
        <h1 className="text-2xl font-semibold text-center mt-1 mb-8">Welcome back</h1>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            required
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-graphite border border-steel rounded-lg px-4 py-3 text-sm placeholder:text-fog"
          />
          <input
            required
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-graphite border border-steel rounded-lg px-4 py-3 text-sm placeholder:text-fog"
          />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full bg-polish text-ink font-semibold disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-fog text-sm text-center mt-6">
          New here?{" "}
          <Link href="/signup" className="text-polish hover:underline">
            Create an account
          </Link>
        </p>
        <p className="text-center mt-4">
          <Link href="/" className="text-fog text-xs hover:text-chalk">← Home</Link>
        </p>
      </div>
    </main>
  );
}

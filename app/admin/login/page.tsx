"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function AdminLoginPage() {
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

    const res = await fetch("/api/auth/account-type");
    const data = await res.json();
    setLoading(false);

    if (data.type === "staff") {
      router.push("/admin");
    } else if (data.type === "customer") {
      router.push("/club");
    } else {
      await supabase.auth.signOut();
      setError("This account isn't linked to a staff profile.");
      return;
    }
    router.refresh();
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <p className="text-polish text-xs uppercase tracking-[0.2em] text-center">Globowax Club</p>
        <h1 className="text-2xl font-semibold text-center mt-1 mb-8">Staff sign in</h1>

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

        <p className="text-fog text-xs text-center mt-6">
          Staff accounts are created by the business owner — see supabase/migrations/0002_auth.sql.
        </p>
        <p className="text-center mt-4">
          <Link href="/" className="text-fog text-xs hover:text-chalk">← Home</Link>
        </p>
      </div>
    </main>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";

export default function CheckPointsPage() {
  const [mobile, setMobile] = useState("+");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | { found: boolean; name?: string; tier_name?: string; points_balance?: number }>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/public/check-points?mobile=${encodeURIComponent(mobile)}`);
      const data = await res.json();
      setResult(data);
    } catch {
      setError("Something went wrong — please try again.");
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <p className="text-polish text-xs uppercase tracking-[0.2em] text-center">Globowax Club</p>
        <h1 className="text-2xl font-semibold text-center mt-1 mb-2">Check your points</h1>
        <p className="text-fog text-sm text-center mb-8">
          No account needed — every visit earns points automatically, linked to your phone number.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            required
            type="tel"
            placeholder="+356 9900 0000"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            className="w-full bg-graphite border border-steel rounded-lg px-4 py-3 text-sm placeholder:text-fog"
          />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full bg-polish text-ink font-semibold disabled:opacity-60"
          >
            {loading ? "Checking…" : "Check balance"}
          </button>
        </form>

        {result && result.found && (
          <div className="mt-6 bg-graphite border border-steel rounded-card p-6 text-center">
            <p className="text-fog text-sm">Hi {result.name} 👋</p>
            <p className="text-4xl font-bold text-polish mt-2">{result.points_balance}</p>
            <p className="text-fog text-xs uppercase tracking-wide">points</p>
            {result.tier_name && <p className="text-sm mt-3">{result.tier_name} tier</p>}
          </div>
        )}
        {result && !result.found && (
          <p className="text-fog text-sm text-center mt-6">
            No points yet for this number — your first visit will start your balance automatically.
          </p>
        )}

        <p className="text-fog text-sm text-center mt-6">
          Want to redeem rewards or manage your account?{" "}
          <Link href="/login" className="text-polish hover:underline">
            Sign in
          </Link>{" "}
          or{" "}
          <Link href="/signup" className="text-polish hover:underline">
            create an account
          </Link>
          .
        </p>
        <p className="text-center mt-6">
          <Link href="/" className="text-fog text-xs hover:text-chalk">
            ← Home
          </Link>
        </p>
      </div>
    </main>
  );
}

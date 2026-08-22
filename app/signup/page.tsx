"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = supabaseBrowser();
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError || !data.user) {
      setLoading(false);
      setError(signUpError?.message ?? "Could not create account");
      return;
    }

    const res = await fetch("/api/auth/complete-customer-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authUserId: data.user.id,
        name,
        surname,
        mobile,
        email,
        referralCode: referralCode || null,
      }),
    });
    const body = await res.json();
    setLoading(false);

    if (!res.ok) {
      // The auth account was created but linking it to a customer row
      // failed (duplicate email, bad referral code, etc.) — sign back out
      // so the browser isn't left holding a session with no customer
      // record behind it (that combination causes a redirect loop on /club).
      await supabase.auth.signOut();
      setError(body.error ?? "Something went wrong finishing signup");
      return;
    }

    router.push("/club");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <p className="text-polish text-xs uppercase tracking-[0.2em] text-center">Globowax Club</p>
        <h1 className="text-2xl font-semibold text-center mt-1 mb-8">Join the club</h1>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              required
              placeholder="First name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-graphite border border-steel rounded-lg px-4 py-3 text-sm placeholder:text-fog"
            />
            <input
              required
              placeholder="Surname"
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              className="bg-graphite border border-steel rounded-lg px-4 py-3 text-sm placeholder:text-fog"
            />
          </div>
          <input
            required
            placeholder="Mobile number"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            className="w-full bg-graphite border border-steel rounded-lg px-4 py-3 text-sm placeholder:text-fog"
          />
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
            placeholder="Password (min. 6 characters)"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-graphite border border-steel rounded-lg px-4 py-3 text-sm placeholder:text-fog"
          />
          <input
            placeholder="Referral code (optional)"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value)}
            className="w-full bg-graphite border border-steel rounded-lg px-4 py-3 text-sm placeholder:text-fog"
          />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full bg-polish text-ink font-semibold disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-fog text-sm text-center mt-6">
          Already a member?{" "}
          <Link href="/login" className="text-polish hover:underline">
            Sign in
          </Link>
        </p>
        <p className="text-center mt-4">
          <Link href="/" className="text-fog text-xs hover:text-chalk">← Home</Link>
        </p>
      </div>
    </main>
  );
}

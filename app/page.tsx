import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="space-y-2">
        <p className="text-polish text-sm tracking-[0.2em] uppercase">Phase 1 · MVP</p>
        <h1 className="text-4xl font-bold">Globowax Club</h1>
        <p className="text-fog max-w-sm">
          Loyalty, rewards and customer intelligence — built first for Globowax, engineered to run other detailing businesses too.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/club" className="px-5 py-3 rounded-full bg-polish text-ink font-semibold hover:bg-polish-dim transition">
          Customer view
        </Link>
        <Link href="/admin" className="px-5 py-3 rounded-full border border-steel text-chalk hover:border-polish transition">
          Admin dashboard
        </Link>
      </div>
    </main>
  );
}

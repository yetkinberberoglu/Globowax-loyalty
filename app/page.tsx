import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="space-y-2">
        <p className="text-polish text-sm tracking-[0.2em] uppercase">Globowax Club</p>
        <h1 className="text-4xl font-bold">Globowax Club</h1>
        <p className="text-fog max-w-sm">
          Loyalty, rewards and customer intelligence — built first for Globowax, engineered to run other detailing businesses too.
        </p>
      </div>
      <div className="flex gap-3 flex-wrap justify-center">
        <Link href="/login" className="px-5 py-3 rounded-full bg-polish text-ink font-semibold hover:bg-polish-dim transition">
          Customer sign in
        </Link>
        <Link href="/signup" className="px-5 py-3 rounded-full border border-steel text-chalk hover:border-polish transition">
          Join the club
        </Link>
      </div>
      <Link href="/admin/login" className="text-fog text-xs hover:text-chalk mt-2">
        Staff sign in →
      </Link>
    </main>
  );
}

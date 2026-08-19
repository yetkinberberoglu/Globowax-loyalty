import Link from "next/link";
import { listCustomers, listServices, listRewards, getTenant } from "@/lib/db";
import { POSClient } from "./POSClient";

export default async function POSPage() {
  const [customers, services, rewards, tenant] = await Promise.all([
    listCustomers(),
    listServices(),
    listRewards(),
    getTenant(),
  ]);

  return (
    <main className="min-h-screen px-6 py-8 max-w-3xl mx-auto">
      <header className="mb-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xs text-fog hover:text-chalk">← Home</Link>
          <Link href="/admin" className="text-xs text-fog hover:text-chalk">← Dashboard</Link>
        </div>
        <p className="text-fog text-xs uppercase tracking-[0.2em] mt-4">{tenant.name}</p>
        <h1 className="text-2xl font-semibold mt-1">Counter · New wash</h1>
      </header>

      <POSClient customers={customers} services={services} rewards={rewards} />
    </main>
  );
}

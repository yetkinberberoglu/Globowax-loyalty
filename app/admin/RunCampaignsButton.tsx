"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function RunCampaignsButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  async function handleRun() {
    setResult(null);
    const res = await fetch("/api/campaigns/run", { method: "POST" });
    const data = await res.json();
    setResult(
      data.fired === 0
        ? "No new triggers matched right now."
        : `Fired ${data.fired} campaign${data.fired === 1 ? "" : "s"} — vouchers and notifications sent.`
    );
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleRun}
        disabled={isPending}
        className="text-xs px-3 py-1.5 rounded-full bg-polish text-ink font-medium disabled:opacity-60"
      >
        {isPending ? "Running…" : "Run automation engine"}
      </button>
      {result && <span className="text-fog text-xs">{result}</span>}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function CreateCampaignButton({ suggestionId }: { suggestionId: string }) {
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleClick() {
    const res = await fetch("/api/suggestions/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggestionId }),
    });
    if (res.ok) {
      setDone(true);
      startTransition(() => router.refresh());
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={done || isPending}
      className="text-xs px-3 py-1.5 rounded-full bg-polish text-ink font-medium disabled:opacity-60 whitespace-nowrap"
    >
      {done ? "Campaign created ✓" : "Create Campaign"}
    </button>
  );
}

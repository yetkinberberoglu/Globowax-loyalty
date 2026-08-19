"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function AddVehicleForm({ customerId }: { customerId: string }) {
  const [open, setOpen] = useState(false);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, make, model, regNumber }),
    });
    const data = await res.json();
    if (res.ok) {
      setMake("");
      setModel("");
      setRegNumber("");
      setOpen(false);
      startTransition(() => router.refresh());
    } else {
      setError(data.error ?? "Something went wrong");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-2.5 rounded-full border border-dashed border-steel text-fog text-sm hover:border-polish hover:text-polish transition"
      >
        + Add vehicle
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-card border border-steel bg-graphite p-4 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <input
          required
          placeholder="Make (e.g. BMW)"
          value={make}
          onChange={(e) => setMake(e.target.value)}
          className="bg-ink border border-steel rounded-lg px-3 py-2 text-sm placeholder:text-fog"
        />
        <input
          required
          placeholder="Model (e.g. X5)"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="bg-ink border border-steel rounded-lg px-3 py-2 text-sm placeholder:text-fog"
        />
      </div>
      <input
        required
        placeholder="Registration number"
        value={regNumber}
        onChange={(e) => setRegNumber(e.target.value)}
        className="w-full bg-ink border border-steel rounded-lg px-3 py-2 text-sm placeholder:text-fog"
      />
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 py-2 rounded-full bg-polish text-ink font-medium text-sm disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save vehicle"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 rounded-full border border-steel text-fog text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

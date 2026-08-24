"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-5 py-2.5 rounded-full bg-polish text-ink font-semibold text-sm hover:bg-polish-dim transition"
    >
      🖨️ Print gift card
    </button>
  );
}

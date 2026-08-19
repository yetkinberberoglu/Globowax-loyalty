// ---------------------------------------------------------------------------
// AI provider contract for natural-language campaign copy.
//
// The actual intelligence — churn risk, lifetime value, next-visit
// prediction, segmentation — is real, deterministic logic computed in
// engine.ts from the mock data (soon: real customer/transaction rows).
// This file is only the swap point for turning a segment's *numbers*
// into readable *copy*, e.g. "42 customers haven't visited in 30 days" →
// "Send them a €10 comeback offer, framed around missing their car."
//
// Today that's a template. Swap in a real call to generate genuinely
// varied, on-brand copy:
//
// export const anthropicProvider: TextGenProvider = {
//   name: "anthropic",
//   async generate({ prompt }) {
//     const res = await fetch("https://api.anthropic.com/v1/messages", {
//       method: "POST",
//       headers: { "x-api-key": ANTHROPIC_API_KEY, "content-type": "application/json" },
//       body: JSON.stringify({
//         model: "claude-sonnet-4-6",
//         max_tokens: 200,
//         messages: [{ role: "user", content: prompt }],
//       }),
//     });
//     const data = await res.json();
//     return { text: data.content?.[0]?.text ?? "" };
//   },
// };
// ---------------------------------------------------------------------------

export interface TextGenProvider {
  name: string;
  generate(input: { prompt: string }): Promise<{ text: string }>;
}

export const mockTextGenProvider: TextGenProvider = {
  name: "mock",
  async generate({ prompt }) {
    await new Promise((r) => setTimeout(r, 10));
    return { text: prompt };
  },
};

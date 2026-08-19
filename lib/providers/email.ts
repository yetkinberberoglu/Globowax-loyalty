import { MessageProvider, mockProvider } from "./types";

// When ready: replace this with a real email adapter — Resend is the
// simplest to wire into a Next.js app. Needs: a Resend account, a
// verified sending domain, and an API key as an env var.
//
// export const emailProvider: MessageProvider = {
//   name: "resend",
//   async send({ to, body, subject }) {
//     const resend = new Resend(RESEND_API_KEY);
//     const { data, error } = await resend.emails.send({
//       from: "Globowax Club <club@globowaxmalta.com>",
//       to, subject: subject ?? "Globowax Club", html: body,
//     });
//     return error ? { ok: false, error: error.message } : { ok: true, providerMessageId: data?.id };
//   },
// };

export const emailProvider: MessageProvider = mockProvider;

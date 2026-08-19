import { MessageProvider, mockProvider } from "./types";

// When ready: replace this with a real WhatsApp Cloud API adapter.
// Needs: a Meta Business account, a verified WhatsApp Business phone
// number, and pre-approved message templates (Meta requires template
// approval for outbound messages outside a 24h customer-service window).
//
// export const whatsappProvider: MessageProvider = {
//   name: "whatsapp_cloud_api",
//   async send({ to, body }) {
//     const res = await fetch(`https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`, {
//       method: "POST",
//       headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
//       body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body } }),
//     });
//     const data = await res.json();
//     return res.ok ? { ok: true, providerMessageId: data.messages?.[0]?.id } : { ok: false, error: data.error?.message };
//   },
// };

export const whatsappProvider: MessageProvider = mockProvider;

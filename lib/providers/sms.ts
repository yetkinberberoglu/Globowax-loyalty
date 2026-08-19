import { MessageProvider, mockProvider } from "./types";

// When ready: replace this with a real SMS adapter (Twilio is the common
// choice). Needs: a Twilio account, a purchased/verified sender number,
// and account SID + auth token as env vars.
//
// export const smsProvider: MessageProvider = {
//   name: "twilio",
//   async send({ to, body }) {
//     const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
//     const msg = await client.messages.create({ to, from: TWILIO_FROM_NUMBER, body });
//     return { ok: true, providerMessageId: msg.sid };
//   },
// };

export const smsProvider: MessageProvider = mockProvider;

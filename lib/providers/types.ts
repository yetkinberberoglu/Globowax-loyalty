// ---------------------------------------------------------------------------
// Messaging provider contract.
//
// Every channel (WhatsApp, SMS, Email) implements this same shape. Today
// each one resolves to the mock sender below, which just logs the send —
// no real message goes anywhere. Swapping in a real provider means writing
// one adapter file (see whatsapp.ts / sms.ts / email.ts) that implements
// this interface and calling the real API from there; nothing upstream
// (campaigns, message templates, the message log) changes.
// ---------------------------------------------------------------------------

export interface SendResult {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
}

export interface MessageProvider {
  name: string; // shows up in the message log's `provider` column
  send(input: { to: string; body: string; subject?: string }): Promise<SendResult>;
}

export const mockProvider: MessageProvider = {
  name: "mock",
  async send(input) {
    // Simulate network latency + a near-always-success outcome so the
    // admin log has something realistic to look at.
    await new Promise((r) => setTimeout(r, 10));
    return { ok: true, providerMessageId: `mock_${Date.now()}` };
  },
};

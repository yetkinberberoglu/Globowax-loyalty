import QRCode from "qrcode";

/**
 * Generates a QR code as a data URL (PNG) for the given text — a
 * customer's referral code, a voucher code, a gift card code, etc.
 * Called server-side (Server Components can await this directly);
 * the result is just an <img src="..."> string, no client JS needed.
 */
export async function generateQRDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    margin: 1,
    width: 240,
    color: { dark: "#0B0C0C", light: "#F4F5F5" },
  });
}

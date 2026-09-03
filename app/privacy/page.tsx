import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen max-w-2xl mx-auto px-6 py-12">
      <Link href="/" className="text-fog text-xs hover:text-chalk">← Home</Link>

      <h1 className="text-2xl font-semibold mt-6 mb-2">Terms of Use & Privacy Notice</h1>
      <p className="text-fog text-sm mb-8">Last updated: September 2026</p>

      <p className="text-fog text-sm leading-relaxed mb-8">
        This notice explains how Globowax Malta ("we", "us", "our") collects and uses personal
        data when you use our vehicle check-in service and the Globowax Club loyalty program,
        in line with the EU General Data Protection Regulation (GDPR) and Malta's Data
        Protection Act (Chapter 586 of the Laws of Malta).
      </p>

      <div className="space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-base font-semibold mb-2">1. Who we are</h2>
          <p className="text-fog">
            Globowax Malta — Mercury Tower Carpark, Level B2, St. Julian's, Malta.<br />
            info@globowaxmalta.com
          </p>
          <p className="text-fog mt-2">
            We are the "data controller" for the personal data described below.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-2">2. What data we collect</h2>
          <ul className="text-fog list-disc pl-5 space-y-1">
            <li>Your name, mobile number, and email address (if provided)</li>
            <li>Vehicle details you choose to add (make, model, registration number)</li>
            <li>Your visits, purchases, points balance, tier, and rewards activity</li>
            <li>Gift card codes and redemption history</li>
            <li>Marketing preferences and messages sent to you (WhatsApp, SMS, email)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-2">3. Why we collect it</h2>
          <p className="text-fog">
            We use this data only for our own internal records, specifically to operate your
            loyalty account (points, tiers, rewards, gift cards), track your vehicle check-ins,
            contact you about your visit or your balance, and keep basic business records as
            required by law.
          </p>
          <p className="text-chalk font-medium mt-2">
            We do not sell your data, and we do not share it with third parties for their own
            marketing purposes.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-2">4. Legal basis</h2>
          <p className="text-fog">
            We process this data on the basis of our legitimate interest in running our business
            and providing the service you've asked for (loyalty rewards and check-in tracking),
            and, where applicable, your consent — for example, to send WhatsApp, SMS, or email
            marketing messages, which you can opt out of at any time.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-2">5. How long we keep it</h2>
          <p className="text-fog">
            We keep your data for as long as you remain an active customer of Globowax Malta.
            If you'd like your data deleted sooner, you can request this at any time — see
            Section 7.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-2">6. Who can see it</h2>
          <p className="text-fog">
            Only Globowax Malta staff, for the purposes above. We use trusted service providers
            (such as our hosting, database, and messaging providers) to run the app; they only
            access your data as needed to provide their service to us, never for their own use.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-2">7. Your rights</h2>
          <p className="text-fog">
            Under GDPR, you have the right to ask what data we hold about you, ask us to correct
            inaccurate data, ask us to delete your data, object to or restrict certain uses of
            your data, and request a copy of your data in a portable format. You can also update
            your marketing preferences (WhatsApp, SMS, email) at any time from your account.
          </p>
          <p className="text-fog mt-2">
            To exercise any of these, contact us at info@globowaxmalta.com. You also have the
            right to complain to Malta's Information and Data Protection Commissioner
            (idpc.org.mt) if you believe your data has been mishandled.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-2">8. Changes</h2>
          <p className="text-fog">
            We may update this notice from time to time. The current version will always be
            available on this page.
          </p>
        </section>
      </div>
    </main>
  );
}


import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen max-w-2xl mx-auto px-6 py-12">
      <Link href="/" className="text-fog text-xs hover:text-chalk">← Home</Link>

      <h1 className="text-2xl font-semibold mt-6 mb-2">Privacy Policy</h1>
      <p className="text-fog text-sm mb-8">Last updated: August 2026</p>

      <div className="space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-base font-semibold mb-2">Who we are</h2>
          <p className="text-fog">
            Globowax Club is the loyalty and rewards program for Globowax Malta, a car wash and
            detailing business. This policy explains what information we collect through the
            Globowax Club app and website, and how we use it.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-2">Information we collect</h2>
          <ul className="text-fog list-disc pl-5 space-y-1">
            <li>Name, mobile number, and email address you provide when signing up</li>
            <li>Vehicle details you choose to add (make, model, registration number)</li>
            <li>Your visits, purchases, points balance, and rewards activity at Globowax</li>
            <li>Marketing preferences (WhatsApp, SMS, and email consent)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-2">How we use it</h2>
          <ul className="text-fog list-disc pl-5 space-y-1">
            <li>To operate your loyalty account: track points, tiers, rewards, and vehicles</li>
            <li>To send you service and marketing messages, only if you've opted in</li>
            <li>To improve our service and understand how the loyalty program is used</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-2">Sharing</h2>
          <p className="text-fog">
            We don't sell your personal information. We use trusted service providers (such as
            our hosting and database providers) to run the app; they only access your data as
            needed to provide their service to us.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-2">Your choices</h2>
          <p className="text-fog">
            You can update your marketing preferences (WhatsApp, SMS, email) at any time from
            your account. To request a copy of your data or ask us to delete your account,
            contact us using the details below.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-2">Contact</h2>
          <p className="text-fog">
            Globowax Malta — Mercury Tower Carpark, Level B2, St. Julian's, Malta.
          </p>
        </section>
      </div>
    </main>
  );
}

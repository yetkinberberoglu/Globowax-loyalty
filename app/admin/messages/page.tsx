export const dynamic = "force-dynamic";

import Link from "next/link";
import { listMessageTemplates, listMessageLog, getTenant } from "@/lib/db";

const statusStyles: Record<string, string> = {
  sent: "bg-polish/15 text-polish",
  failed: "bg-red-500/15 text-red-400",
  skipped_no_consent: "bg-steel text-fog",
};

export default async function MessagesPage() {
  const [templates, log, tenant] = await Promise.all([
    listMessageTemplates(),
    listMessageLog(),
    getTenant(),
  ]);

  return (
    <main className="min-h-screen px-8 py-10 max-w-6xl mx-auto">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-fog text-xs uppercase tracking-[0.2em]">{tenant.name}</p>
          <h1 className="text-2xl font-semibold mt-1">Messages</h1>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xs text-fog hover:text-chalk">← Home</Link>
          <Link href="/admin" className="text-xs text-fog hover:text-chalk">← Dashboard</Link>
        </div>
      </header>

      <section>
        <h2 className="text-sm uppercase tracking-wide text-fog mb-3">Templates</h2>
        <div className="space-y-2">
          {templates.map((t) => (
            <div key={t.id} className="rounded-card border border-steel bg-graphite p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{t.name}</p>
                <span className="text-xs px-2 py-1 rounded-full border border-steel text-fog uppercase">{t.channel}</span>
              </div>
              {t.subject && <p className="text-fog text-xs mt-1">Subject: {t.subject}</p>}
              <p className="text-fog text-sm mt-2">{t.body}</p>
            </div>
          ))}
        </div>
        <p className="text-fog text-xs mt-3">
          Channels currently run through mock providers — see <code className="text-chalk">lib/providers/</code> to connect real WhatsApp, SMS, or Email accounts.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-sm uppercase tracking-wide text-fog mb-3">Send log</h2>
        {log.length === 0 ? (
          <p className="text-fog text-sm">No messages sent yet — trigger a campaign from the dashboard to generate one.</p>
        ) : (
          <div className="rounded-card border border-steel overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-graphite text-fog text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Channel</th>
                  <th className="px-4 py-3 font-medium">Message</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Provider</th>
                  <th className="px-4 py-3 font-medium">Sent</th>
                </tr>
              </thead>
              <tbody>
                {log.map((m) => (
                  <tr key={m.id} className="border-t border-steel/60">
                    <td className="px-4 py-3 uppercase text-fog text-xs">{m.channel}</td>
                    <td className="px-4 py-3 max-w-sm truncate">{m.body}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${statusStyles[m.status]}`}>
                        {m.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-fog">{m.provider}</td>
                    <td className="px-4 py-3 text-fog">{new Date(m.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

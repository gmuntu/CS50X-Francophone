import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { prisma } from '@/lib/prisma';
import { WA_EXPIRY_H, WA_REMIND_H } from '@/lib/messaging/wa-reminder';
import RunButton from './run-button';

export const dynamic = 'force-dynamic';

const fmt = (d: Date) => d.toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default async function AdminWhatsAppPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth/login');
  if ((session.user as any)?.role !== 'ADMIN') redirect('/admin');

  const users = await prisma.user.findMany({
    where: { waJoinedAt: { not: null } },
    orderBy: { waJoinedAt: 'desc' },
    select: { id: true, name: true, firstName: true, lastName: true, email: true, phone: true, waJoinedAt: true, waRemindedAt: true },
  });
  const now = Date.now();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-10 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold">Socrate sur WhatsApp</h1>
            <p className="text-sm text-muted-foreground">Bac à sable Twilio : la connexion expire {WA_EXPIRY_H} h après le « join ». Socrate envoie un rappel à {WA_REMIND_H} h (tâche quotidienne à 14 h UTC).</p>
          </div>
          <RunButton />
        </div>
        {users.length === 0 && <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">Personne n'a encore écrit à Socrate sur WhatsApp.</p>}
        {users.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground"><tr><th className="p-3">Étudiant</th><th className="p-3">Connecté depuis</th><th className="p-3">Expire</th><th className="p-3">Rappel</th></tr></thead>
              <tbody>
                {users.map((u) => {
                  const j = u.waJoinedAt!.getTime();
                  const exp = j + WA_EXPIRY_H * 3600_000;
                  const left = Math.round((exp - now) / 3600_000);
                  const expired = left <= 0;
                  const reminded = u.waRemindedAt && u.waRemindedAt.getTime() >= j;
                  return (
                    <tr key={u.id} className="border-t border-border">
                      <td className="p-3"><b>{[u.firstName, u.lastName].filter(Boolean).join(' ') || u.name || u.email}</b><br /><span className="text-xs text-muted-foreground">{u.phone}</span></td>
                      <td className="p-3">{fmt(u.waJoinedAt!)}</td>
                      <td className={`p-3 font-bold ${expired ? 'text-red-600' : left <= 24 ? 'text-amber-600' : 'text-blue-700 dark:text-blue-300'}`}>{expired ? 'Expirée' : `dans ${left} h`}</td>
                      <td className="p-3">{reminded ? `✓ envoyé le ${fmt(u.waRemindedAt!)}` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

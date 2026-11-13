import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { formationOuverte, statutInscriptionFr } from '@/lib/formations';
import { lienOnglet, ONGLETS, ongletAContenu, ongletConnu } from '@/lib/menu-formation';
import { accesFormation } from '@/lib/acces-formation';
import { reglagesFormations } from '@/lib/reglages-formations';
import { prisma } from '@/lib/prisma';

function Cadre({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-12">
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-10 text-center space-y-4">{children}</div>
      </main>
      <Footer />
    </div>
  );
}

/**
 * Page d'un onglet du menu d'une formation, quand elle n'a pas (ou pas encore) sa propre page :
 * « Bientôt disponible », « Prof WhatsApp », ou « accès » (formation pas encore ouverte pour l'élève).
 * Partagée par toutes les formations : une nouvelle formation l'a automatiquement.
 */
export default async function PageOnglet({ formation: id, onglet }: { formation: string; onglet: string }) {
  const formation = formationOuverte(id);
  if (!formation) notFound();
  const session = await auth();
  if (!session?.user) redirect('/auth/login');

  if (onglet === 'acces') {
    const acces = await accesFormation((session.user as any).id, formation.id);
    if (acces === 'ok') redirect(lienOnglet(formation.id, 'programme'));
    const inscription = await prisma.inscriptionFormation.findUnique({
      where: { userId_formation: { userId: (session.user as any).id, formation: formation.id } },
      select: { statut: true },
    }).catch(() => null);
    return (
      <Cadre>
        <p className="text-4xl" aria-hidden>🔒</p>
        <h1 className="text-2xl font-extrabold text-foreground">« {formation.titre} » n&apos;est pas encore ouverte pour vous</h1>
        <p className="text-muted-foreground">
          {inscription
            ? `Votre inscription est « ${statutInscriptionFr(inscription.statut)} ». ${inscription.statut === 'EN_ATTENTE' ? 'La formation s’ouvrira dès sa validation par l’administration.' : 'Contactez l’administration pour en savoir plus.'}`
            : 'Vous n’êtes pas inscrit à cette formation. Vous pouvez la demander depuis votre espace : elle s’ouvrira après validation par l’administration.'}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href="/dashboard" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700">Mon espace</Link>
          <Link href={formation.href} className="rounded-xl border border-border px-5 py-2.5 text-sm font-bold text-foreground hover:bg-muted">Le programme</Link>
        </div>
      </Cadre>
    );
  }

  if (!ongletConnu(onglet)) notFound();
  if (ongletAContenu(formation.id, onglet)) redirect(lienOnglet(formation.id, onglet));
  const libelle = ONGLETS.find((o) => o.id === onglet)!.libelle;

  if (onglet === 'prof-whatsapp') {
    const actif = (await reglagesFormations()).find((r) => r.formation === formation.id)?.profWhatsApp === true;
    const inscrit = actif && (await accesFormation((session.user as any).id, formation.id)) === 'ok';
    return (
      <Cadre>
        <h1 className="text-2xl font-extrabold text-foreground">Prof WhatsApp · {formation.titre}</h1>
        {actif && inscrit ? (
          <>
            <p className="text-muted-foreground">Posez vos questions au prof par message, depuis votre téléphone. Il connaît votre formation et la leçon en cours.</p>
            <p className="text-sm text-muted-foreground">Vérifiez d&apos;abord que votre numéro de téléphone est bien enregistré dans votre profil.</p>
            <Link href="/profile" className="inline-block rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700">Vérifier mon numéro</Link>
          </>
        ) : (
          <>
            <span className="inline-block rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">Bientôt</span>
            <p className="text-lg font-semibold text-foreground">En attente d&apos;approbation par Meta</p>
            <p className="text-sm text-muted-foreground">Ce service ouvrira dès que Meta l&apos;aura approuvé. Vous serez prévenu dans votre espace.</p>
          </>
        )}
      </Cadre>
    );
  }

  return (
    <Cadre>
      <span className="inline-block rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">Bientôt disponible</span>
      <h1 className="text-2xl font-extrabold text-foreground">{libelle} · {formation.titre}</h1>
      <p className="text-muted-foreground">Cette partie de la formation est en préparation. Elle apparaîtra ici dès qu&apos;elle sera prête.</p>
      <Link href={lienOnglet(formation.id, 'programme')} className="inline-block rounded-xl border border-border px-5 py-2.5 text-sm font-bold text-foreground hover:bg-muted">Retour au programme</Link>
    </Cadre>
  );
}

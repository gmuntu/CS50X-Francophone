'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { formationDuChemin, menuFormation, ongletDuChemin } from '@/lib/menu-formation';

// Formations dont le « Prof WhatsApp » est ouvert (réglage de l'admin), lues une fois par chargement de page.
let whatsappOuverts: Promise<string[]> | null = null;
function lireWhatsapp(): Promise<string[]> {
  whatsappOuverts ??= fetch('/api/formations/reglages')
    .then((r) => (r.ok ? r.json() : { profWhatsApp: [] }))
    .then((d) => (Array.isArray(d?.profWhatsApp) ? d.profWhatsApp : []))
    .catch(() => []);
  return whatsappOuverts;
}

/** Sous-menu de la formation ouverte : le même pour toutes les formations, dans le même ordre. */
export default function MenuFormation() {
  const chemin = usePathname() ?? '';
  const formation = formationDuChemin(chemin);
  const [whatsapp, setWhatsapp] = useState<string[]>([]);
  useEffect(() => {
    if (!formation) return;
    let actif = true;
    lireWhatsapp().then((l) => { if (actif) setWhatsapp(l); });
    return () => { actif = false; };
  }, [formation]);

  const menu = formation ? menuFormation(formation, whatsapp.includes(formation)) : null;
  if (!menu) return null;
  const actif = ongletDuChemin(menu.formation, chemin);

  return (
    <div className="border-t border-border/60 bg-blue-50/70 dark:bg-blue-950/20">
      <nav aria-label={`Menu de la formation ${menu.titre}`} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 overflow-x-auto py-1.5 text-xs font-bold">
        <span className="mr-2 shrink-0 text-blue-800 dark:text-blue-200">{menu.titre}</span>
        {menu.onglets.map((o) => (
          <Link key={o.id} href={o.href} aria-current={actif === o.id ? 'page' : undefined}
            className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 ${actif === o.id ? 'bg-card text-blue-700 dark:text-blue-300 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {o.libelle}
            {o.bientot && <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">Bientôt</span>}
          </Link>
        ))}
      </nav>
    </div>
  );
}

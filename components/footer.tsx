import { BookOpen } from 'lucide-react';
import Link from 'next/link';
import { BrandMark, BrandName } from '@/components/brand-logo';

export default function Footer() {
  return (
    <footer className="border-t border-border/80 bg-card/60 backdrop-blur-sm py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2.5">
            <BrandMark className="w-9 h-9" />
            <BrandName className="text-sm font-bold text-foreground tracking-tight" />
          </div>
          <div className="flex items-center gap-6 text-xs font-semibold text-muted-foreground">
            <Link href="/courses" className="hover:text-foreground transition-colors">Cours</Link>
            <Link href="/tuteur" className="hover:text-foreground transition-colors">Tuteur Socrate</Link>
            <a href="mailto:contact@savoiria.online" className="hover:text-foreground transition-colors">Contact</a>
          </div>
          <p className="text-xs text-muted-foreground font-medium">
            © 2026 SavoirIA
          </p>
          <p className="text-[11px] text-muted-foreground max-w-xl">
            SavoirIA n&apos;est pas affilié à l&apos;Université Harvard ni à CS50, et n&apos;est pas approuvé par eux.
            CS50 est une marque de Harvard. Le certificat CS50x est délivré gratuitement par CS50.
          </p>
        </div>
      </div>
    </footer>
  );
}

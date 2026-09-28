'use client';

import { useState } from 'react';
import { Menu, X, BookOpen, LogOut, User, LayoutDashboard, GraduationCap, Shield } from 'lucide-react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = (session?.user as any)?.role;

  const navItems = session ? [
    { label: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Cours', href: '/courses', icon: GraduationCap },
    { label: 'Tuteur Socrate', href: '/tuteur', icon: BookOpen },
    ...(role === 'ADMIN' || role === 'INSTRUCTOR' ? [{ label: 'Admin', href: '/admin', icon: Shield }] : []),
  ] : [
    { label: 'Accueil', href: '/', icon: BookOpen },
    { label: 'Cours', href: '/#courses', icon: GraduationCap },
  ];

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href={session ? '/dashboard' : '/'} className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-extrabold text-foreground tracking-tight">
              CS50X <span className="text-primary">Francophone</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1.5 bg-muted/50 p-1 rounded-2xl border border-border/60">
            {navItems?.map?.((item: any) => {
              const Icon = item.icon;
              const isActive = pathname === item?.href;
              return (
                <Link
                  key={item?.href}
                  href={item?.href}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-card text-foreground shadow-sm shadow-black/5 border border-border/60'
                      : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary' : ''}`} />
                  {item?.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-2.5">
            {session ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/profile"
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-foreground bg-card hover:bg-muted/80 border border-border flex items-center gap-2 transition shadow-sm"
                >
                  <div className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-extrabold flex items-center justify-center">
                    {(session?.user?.name?.[0] ?? 'U').toUpperCase()}
                  </div>
                  <span>{session?.user?.name?.split?.(' ')?.[0] ?? 'Profil'}</span>
                  {role && role !== 'STUDENT' && (
                    <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                      {role === 'ADMIN' ? 'Admin' : 'Instructeur'}
                    </span>
                  )}
                </Link>
                <button
                  onClick={() => signOut({ redirectTo: '/' })}
                  className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition border border-transparent hover:border-destructive/20"
                  title="Déconnexion"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/login"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition"
                >
                  Connexion
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition shadow-sm shadow-primary/25 hover:shadow-md hover:shadow-primary/30"
                >
                  Inscription
                </Link>
              </div>
            )}
          </div>

          <button
            className="md:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition border border-border/60"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileOpen && (
          <nav className="md:hidden py-4 space-y-1.5 border-t border-border/80">
            {navItems?.map?.((item: any) => {
              const Icon = item.icon;
              const isActive = pathname === item?.href;
              return (
                <Link
                  key={item?.href}
                  href={item?.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                    isActive ? 'bg-primary text-primary-foreground font-bold shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item?.label}
                </Link>
              );
            })}
            {session ? (
              <div className="pt-2 border-t border-border/60 space-y-1">
                <Link
                  href="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-foreground hover:bg-muted"
                >
                  <User className="w-4 h-4 text-primary" /> Mon Profil
                </Link>
                <button
                  onClick={() => { signOut({ redirectTo: '/' }); setMobileOpen(false); }}
                  className="w-full flex items-center gap-2 text-left px-4 py-2.5 rounded-xl text-sm font-semibold text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="w-4 h-4" /> Déconnexion
                </button>
              </div>
            ) : (
              <div className="pt-3 border-t border-border/60 grid grid-cols-2 gap-2">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileOpen(false)}
                  className="text-center px-4 py-2.5 rounded-xl border border-border text-sm font-bold text-foreground hover:bg-muted"
                >
                  Connexion
                </Link>
                <Link
                  href="/auth/signup"
                  onClick={() => setMobileOpen(false)}
                  className="text-center px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-sm"
                >
                  Inscription
                </Link>
              </div>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}

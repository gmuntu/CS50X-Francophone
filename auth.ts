import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Sur Vercel ou en production, supprimer toute valeur localhost de NEXTAUTH_URL
// afin que Auth.js / NextAuth utilise dynamiquement l'en-tête Host réel
if (typeof process !== 'undefined' && process.env) {
  if (process.env.VERCEL || process.env.NODE_ENV === 'production' || process.env.VERCEL_URL) {
    if (process.env.NEXTAUTH_URL?.includes('localhost')) {
      delete process.env.NEXTAUTH_URL;
    }
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Aucune clé par défaut : AUTH_SECRET doit être défini dans Vercel.
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/auth/login',
  },
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        const normalizedEmail = (credentials.email as string).trim().toLowerCase();

        // Connexion standard Email + Mot de passe
        if (!credentials?.password) return null;
        const candidatePassword = String(credentials.password);

        const queryEmails = [normalizedEmail];

        // Requête avec retry pour pallier les cold starts Neon PostgreSQL
        let user: any = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            user = await prisma.user.findFirst({
              where: {
                email: { in: queryEmails },
              },
            });
            break;
          } catch (dbErr) {
            console.error(`[auth] Tentative ${attempt + 1} recherche utilisateur échouée:`, dbErr);
            if (attempt < 2) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          }
        }

        if (!user || !user.password) return null;

        // Comparaison robuste (avec et sans trim)
        let isValid = await bcrypt.compare(candidatePassword, user.password);
        if (!isValid && candidatePassword !== candidatePassword.trim()) {
          isValid = await bcrypt.compare(candidatePassword.trim(), user.password);
        }

        if (!isValid) return null;
        if (user.status === 'SUSPENDED') return null;
        // Candidat libre : accès seulement après validation du paiement par l'administration
        if (user.status === 'PENDING' && user.role !== 'ADMIN') return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Utilisateur',
          image: user.image || user.photoUrl,
          role: user.role,
        };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    ...(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
      ? [
          GitHub({
            clientId: process.env.AUTH_GITHUB_ID,
            clientSecret: process.env.AUTH_GITHUB_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role ?? 'STUDENT';
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      try {
        if (new URL(url).origin === new URL(baseUrl).origin) return url;
      } catch {}
      return baseUrl;
    },
  },
});


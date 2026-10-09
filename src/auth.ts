import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { verifyToken } from '@/server/utils/auth';

/**
 * Auth.js session for the web app (JWT strategy, httpOnly cookie).
 * Password, two-factor and company checks happen in /api/auth/login, which answers with a short signed proof.
 * The credentials provider below only accepts that proof, so every way in goes through the same checks.
 * Switching company issues a new proof and signs in again, which is how the active company gets into the session.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  basePath: '/api/session',
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.JWT_SECRET || 'dev-only-change-me',
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: { token: {} },
      authorize: async (c) => { try { const p = verifyToken(String(c?.token || '')); return { id: p.userId, orgId: p.orgId } as any; } catch { return null; } },
    }),
  ],
  callbacks: {
    jwt({ token, user }) { if (user) { token.userId = user.id; token.orgId = (user as any).orgId; } return token; },
    session({ session, token }) { (session as any).userId = token.userId; (session as any).orgId = token.orgId; return session; },
  },
});

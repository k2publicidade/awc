import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email e senha são obrigatórios');
        }

        const email = credentials.email.trim().toLowerCase();
        const user = await prisma.user.findUnique({
          where: { email },
          include: { tenant: true },
        });

        if (!user || !user.passwordHash) {
          throw new Error('Email ou senha inválidos');
        }

        if (!user.isActive || !user.tenant.isActive) {
          throw new Error('Conta desativada. Contate o administrador.');
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!isValid) {
          throw new Error('Email ou senha inválidos');
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          avatarUrl: user.avatarUrl,
        };
      },
    }),
    ...(googleConfigured
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    // Acesso restrito: login social só para contas já cadastradas e ativas
    async signIn({ user, account }) {
      if (account?.provider === 'credentials') return true;
      if (!user?.email) return false;
      const existing = await prisma.user.findUnique({
        where: { email: user.email.trim().toLowerCase() },
        include: { tenant: true },
      });
      if (!existing?.isActive || !existing.tenant.isActive) return false;
      user.id = existing.id;
      user.name = existing.name;
      (user as DynamicValue).role = existing.role;
      (user as DynamicValue).tenantId = existing.tenantId;
      (user as DynamicValue).avatarUrl = existing.avatarUrl;
      await prisma.user.update({ where: { id: existing.id }, data: { lastLoginAt: new Date() } });
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as DynamicValue).role;
        token.tenantId = (user as DynamicValue).tenantId;
        token.avatarUrl = (user as DynamicValue).avatarUrl;
      }

      // Refresh user data on update
      if (trigger === 'update' && session) {
        token.name = session.name;
        token.avatarUrl = session.avatarUrl;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as DynamicValue).id = token.id;
        (session.user as DynamicValue).role = token.role;
        (session.user as DynamicValue).tenantId = token.tenantId;
        (session.user as DynamicValue).avatarUrl = token.avatarUrl;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

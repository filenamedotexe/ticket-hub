import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@ticket-hub/db';

// Custom adapter to handle multi-tenant User creation
const customPrismaAdapter = PrismaAdapter(prisma) as any;

// Override the createUser method to include tenantId
customPrismaAdapter.createUser = async (user: any) => {
  // For Phase 1, we'll auto-assign users to the demo tenant
  // In later phases, this should be extracted from email domain or other logic
  const demoTenant = await prisma.tenant.findUnique({
    where: { slug: 'demo-company' },
  });

  if (!demoTenant) {
    throw new Error('Demo tenant not found. Please run the database seed.');
  }

  return await prisma.user.create({
    data: {
      id: user.id,
      name: user.name,
      email: user.email!,
      emailVerified: user.emailVerified,
      image: user.image,
      tenantId: demoTenant.id,
      // Default role is CLIENT, but can be overridden
      role: user.email?.includes('@demo.com')
        ? user.email.includes('admin@')
          ? 'ADMIN'
          : user.email.includes('staff@')
            ? 'STAFF'
            : 'CLIENT'
        : 'CLIENT',
    },
  });
};

export const authOptions: NextAuthOptions = {
  adapter: customPrismaAdapter,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Find user in database
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { tenant: true },
        });

        if (!user) {
          return null;
        }

        // For demo users, check against simple passwords
        const demoPasswords: Record<string, string> = {
          'client@demo.com': 'client123',
          'staff@demo.com': 'staff123',
          'admin@demo.com': 'admin123',
        };

        const expectedPassword = demoPasswords[credentials.email];
        if (expectedPassword && credentials.password === expectedPassword) {
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role as any,
            tenantId: user.tenantId,
            tenant: {
              id: user.tenant.id,
              name: user.tenant.name,
              slug: user.tenant.slug,
            },
          };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.tenant = (user as any).tenant;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as any;
        session.user.tenant = token.tenant as any;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
  },
};

// Using string for roles instead of enum for SQLite compatibility
type UserRole = 'CLIENT' | 'STAFF' | 'ADMIN';
import 'next-auth';

declare module 'next-auth' {
  // eslint-disable-next-line no-unused-vars
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
      tenant: {
        id: string;
        name: string;
        slug: string;
      };
    };
  }

  // eslint-disable-next-line no-unused-vars
  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: UserRole;
    tenantId: string;
  }
}

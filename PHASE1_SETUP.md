# Phase 1 Setup Guide: Auth.js + Tenant Skeleton

This guide will help you set up and test Phase 1 of the Ticket Hub application.

## Prerequisites

- Node.js 20+
- Bun package manager
- PostgreSQL database (local or Neon)
- SMTP server for email (optional for development)

## Setup Steps

### 1. Install Dependencies

```bash
bun install
```

### 2. Database Setup

#### Option A: Local PostgreSQL

```bash
# Create database
createdb ticket-hub

# Set DATABASE_URL
export DATABASE_URL="postgresql://username:password@localhost:5432/ticket-hub"
```

#### Option B: Neon (Recommended)

1. Create account at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string

### 3. Environment Variables

Create `.env.local` in `apps/web/`:

```bash
# Database
DATABASE_URL="your-postgresql-connection-string"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-random-secret-key-32-characters-long"

# Email (Optional - for magic links)
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="your-email@gmail.com"
EMAIL_SERVER_PASSWORD="your-app-password"
EMAIL_FROM="noreply@ticket-hub.com"
```

> **Note**: For Gmail, use an App Password instead of your regular password.

### 4. Database Migration & Seeding

```bash
# Navigate to db package
cd packages/db

# Generate Prisma client
bun run db:generate

# Run migrations
bun run db:migrate

# Seed with demo data
bun run db:seed
```

### 5. Start Development Server

```bash
# From root directory
bun run dev
```

The application will be available at `http://localhost:3000`

## Testing Phase 1

### Success Gates

#### 1.1 - PostgreSQL & Prisma Setup

```bash
cd packages/db
bun run db:migrate
```

✅ Should run blank migration successfully

#### 1.2 - Auth.js Email Magic Link

1. Go to `http://localhost:3000`
2. Click "Sign In to Continue"
3. Enter any of the demo emails:
   - `client@demo.com`
   - `staff@demo.com`
   - `admin@demo.com`
4. Check console logs for magic link (development mode)

✅ Login form works, magic link generated

#### 1.3 - Role-based Authentication

Run the e2e tests:

```bash
bun run e2e
```

✅ Cypress tests pass for all three roles

### Manual Testing

1. **Home Page**: Should show sign-in button
2. **Sign In**: Email form with demo account info
3. **Magic Link**: Console log shows magic link URL
4. **Dashboard**: Role-specific permissions display
5. **Sign Out**: Returns to home page

### Demo Accounts

The seeded database includes:

| Email           | Role   | Password        |
| --------------- | ------ | --------------- |
| client@demo.com | CLIENT | Magic link only |
| staff@demo.com  | STAFF  | Magic link only |
| admin@demo.com  | ADMIN  | Magic link only |

All accounts belong to "Demo Company" tenant.

## Development Commands

```bash
# Database
cd packages/db
bun run db:generate    # Generate Prisma client
bun run db:push        # Push schema changes
bun run db:migrate     # Run migrations
bun run db:seed        # Seed demo data
bun run db:studio      # Open Prisma Studio

# Testing
bun run test           # Unit tests
bun run e2e           # End-to-end tests
bun run lint          # Linting
bun run build         # Build for production
```

## Architecture Notes

### Multi-tenant Setup

- Each user belongs to a tenant
- Phase 1 auto-assigns users to "Demo Company"
- Future phases will have sophisticated tenant routing

### Role System

- **CLIENT**: Can create and view own tickets
- **STAFF**: Can view/manage all tickets
- **ADMIN**: Full system access

### Authentication Flow

1. User enters email
2. Magic link sent via email/console
3. User clicks link → authenticated
4. Session includes user role + tenant info
5. Dashboard shows role-specific permissions

## Troubleshooting

### Database Issues

- Ensure PostgreSQL is running
- Check DATABASE_URL format
- Try `bun run db:reset` to reset database

### Email Issues

- Magic links logged to console in development
- Check EMAIL\_\* environment variables
- Use App Passwords for Gmail

### Build Issues

- Run `bun install` in root and packages
- Clear `.next` folder: `rm -rf apps/web/.next`
- Restart development server

## Next Steps

Once Phase 1 is working:

1. ✅ Authentication system functional
2. ✅ Multi-tenant database structure
3. ✅ Role-based permissions
4. Ready for Phase 2: Prisma Tenant Middleware

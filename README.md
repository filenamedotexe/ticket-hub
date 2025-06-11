# Ticket Hub

Modern ticket management platform built with Next.js 15, React 19, and TypeScript.

## Project Structure

```
ticket-hub/
├── apps/
│   └── web/          # Next.js web application
└── packages/
    └── db/           # Database package with Prisma
```

## Development

This project uses Bun as the package manager and is set up as a monorepo.

### Prerequisites

- Node.js 20+
- Bun

### Getting Started

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Run linting
bun run lint

# Run tests
bun run test

# Build for production
bun run build
```

## Phase 0 Status: ✅ Repo & Toolchain Bootstrap

- [x] 0.1 Initialize Bun-powered mono-repo
- [x] 0.2 Add Next.js 15 with App Router, React 19, TypeScript, Tailwind 4, next-pwa
- [x] 0.3 Configure ESLint, Prettier, Husky pre-commit
- [x] 0.4 GitHub Actions CI pipeline

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **UI**: React 19, Tailwind CSS 4
- **Language**: TypeScript
- **Package Manager**: Bun
- **Database**: Prisma (planned)
- **Testing**: Bun Test
- **CI/CD**: GitHub Actions
- **PWA**: next-pwa

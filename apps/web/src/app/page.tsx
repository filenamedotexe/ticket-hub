'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push('/dashboard');
    }
  }, [session, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Welcome to Ticket Hub
        </h1>
        <p className="text-center text-lg mb-8">
          Modern ticket management platform
        </p>

        <div className="text-center mb-12">
          <Link
            href="/auth/signin"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg text-lg transition-colors"
          >
            Sign In to Continue
          </Link>
        </div>

        <div className="grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-2 lg:text-left gap-4">
          <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100">
            <h2 className="mb-3 text-2xl font-semibold">✅ Phase 0</h2>
            <p className="m-0 max-w-[30ch] text-sm opacity-75">
              Repository & Toolchain Bootstrap - Complete
            </p>
          </div>
          <div className="group rounded-lg border border-green-200 bg-green-50 px-5 py-4 transition-colors">
            <h2 className="mb-3 text-2xl font-semibold text-green-800">
              🚀 Phase 1
            </h2>
            <p className="m-0 max-w-[30ch] text-sm text-green-700">
              Auth.js + Tenant Skeleton - In Progress
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

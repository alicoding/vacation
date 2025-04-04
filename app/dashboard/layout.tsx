import DashboardShell from '@/components/dashboard/DashboardShell';
import { ReactNode } from 'react';
import { requireAuth } from '@/lib/auth-helpers.server';

// Force dashboard to be a server component that checks auth
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Check authentication server-side, redirect to login if not authenticated
  await requireAuth();

  return <DashboardShell>{children}</DashboardShell>;
}
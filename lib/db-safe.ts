/**
 * This file provides a safe way to access Prisma client in both Pages and App router
 * It dynamically imports the Prisma client only on the server side
 */

export type { PrismaClient } from '@prisma/client'

// This approach prevents client-side imports from failing
export async function getPrismaClient() {
  // Check if we're on the server
  if (typeof window !== 'undefined') {
    throw new Error('Cannot use Prisma client on the browser')
  }
  
  // Dynamic import only happens on the server
  const { prisma } = await import('./prisma')
  return prisma
}

// Helper for server components/actions to safely get the Prisma client
export async function withPrisma<T>(fn: (prisma: any) => Promise<T>): Promise<T> {
  const prisma = await getPrismaClient()
  return fn(prisma)
}

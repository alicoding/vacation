/**
 * This file should only be imported from server components, API routes,
 * or server actions. Never import this directly in client components.
 */
import { PrismaClient } from '@prisma/client'

// In development, use a global variable to preserve Prisma Client
// between hot reloads. In production, create a new instance.
const globalForPrisma = global as unknown as { prisma: PrismaClient }

// Standard Prisma client initialization with compatible options
export const prisma = globalForPrisma.prisma || 
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
    // Remove the connectionLimit option as it's not supported
  })

// Only save in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

/**
 * Helper function for safer database access that verifies
 * we're in a server environment before executing
 */
export async function fetchFromDB<T>(asyncFn: () => Promise<T>): Promise<T> {
  if (typeof window !== 'undefined') {
    throw new Error(
      'Database queries must be run on the server. ' +
      'Use server components, server actions, or API routes.'
    )
  }
  
  return asyncFn()
}
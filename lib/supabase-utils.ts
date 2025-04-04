/**
 * Utility functions to help migrate from Prisma to Supabase
 */
import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import camelcaseKeys from 'camelcase-keys';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers'; // Add back cookies import
// No longer importing cookies here, it will be passed in

type SupabaseClientType = SupabaseClient<Database>;
// Define valid table names type from the Database type
type TableNames = keyof Database['public']['Tables'];
// Remove incorrect RequestCookies import
/**
 * Helper to handle Prisma-like findFirst operations with Supabase
 */
export async function findFirst<T = unknown>(
  supabase: SupabaseClientType,
  table: TableNames,
  where: Record<string, unknown> = {},
): Promise<T | null> {
  // Convert nested where conditions to flat conditions
  let query = supabase.from(table).select('*');
  
  // Apply filters
  Object.entries(where).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null) {
      // Handle nested conditions (e.g., user: { email: ... })
      Object.entries(value).forEach(([nestedKey, nestedValue]) => {
        const columnName = `${key}_${nestedKey}`;
        query = query.eq(columnName, nestedValue as any); // Type assertion needed for Supabase parameter compatibility
      });
    } else {
      query = query.eq(key, value as any); // Type assertion needed for Supabase parameter compatibility
    }
  });
  
  const { data, error } = await query.limit(1).single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows returned"
    throw error;
  }
  
  return data ? (camelcaseKeys(data, { deep: true }) as T) : null;
}

/**
 * Helper to handle Prisma-like findMany operations with Supabase
 */
export async function findMany<T extends Record<string, unknown> = any>(
  supabase: SupabaseClientType,
  table: TableNames,
  options: {
    where?: Record<string, unknown>;
    select?: string[];
    orderBy?: Record<string, 'asc' | 'desc'>;
    limit?: number;
  } = {},
): Promise<T[]> {
  const { where = {}, select, orderBy, limit } = options;
  
  // Start building the query with select first
  let query = supabase.from(table).select(select && select.length > 0 ? select.join(',') : '*');
  
  // Add where conditions
  Object.entries(where).forEach(([key, value]) => {
    if (value === null) {
      query = query.is(key, null);
    } else if (typeof value === 'object' && value !== null) {
      // Handle nested conditions (e.g., user: { email: ... })
      Object.entries(value).forEach(([nestedKey, nestedValue]) => {
        const columnName = `${key}_${nestedKey}`;
        if (nestedValue === null) {
          query = query.is(columnName, null);
        } else {
          query = query.eq(columnName, nestedValue as any); // Type assertion needed for Supabase parameter compatibility
        }
      });
    } else {
      query = query.eq(key, value as any); // Type assertion needed for Supabase parameter compatibility
    }
  });
  
  // Add orderBy
  if (orderBy) {
    Object.entries(orderBy).forEach(([column, direction]) => {
      query = query.order(column, { ascending: direction === 'asc' });
    });
  }
  
  // Add limit
  if (limit) {
    query = query.limit(limit);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw error;
  }
  
  return camelcaseKeys((data ?? []) as unknown as Record<string, unknown>[], { deep: true }) as T[];
}

/**
 * Helper to handle Prisma-like create operations with Supabase
 */
export async function create<T = unknown>(
  supabase: SupabaseClientType,
  table: TableNames,
  data: Record<string, unknown>,
): Promise<T> {
  const { data: result, error } = await supabase
    .from(table)
    .insert(data as any) // Type assertion needed for Supabase parameter compatibility
    .select()
    .single();
    
  if (error) {
    throw error;
  }
  
  return camelcaseKeys(result, { deep: true }) as T;
}

/**
 * Helper to handle Prisma-like update operations with Supabase
 */
export async function update<T = unknown>(
  supabase: SupabaseClientType,
  table: TableNames,
  options: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  },
): Promise<T> {
  const { where, data } = options;
  
  let query = supabase.from(table).update(data);
  
  // Apply where conditions
  Object.entries(where).forEach(([key, value]) => {
    query = query.eq(key, value as any); // Type assertion needed for Supabase parameter compatibility
  });
  
  const { data: result, error } = await query.select().single();
  
  if (error) {
    throw error;
  }
  
  return camelcaseKeys(result, { deep: true }) as T;
}

/**
 * Helper to handle Prisma-like delete operations with Supabase
 */
export async function remove<T = unknown>(
  supabase: SupabaseClientType,
  table: TableNames,
  where: Record<string, unknown>,
): Promise<T> {
  let query = supabase.from(table).delete();
  
  // Apply where conditions
  Object.entries(where).forEach(([key, value]) => {
    query = query.eq(key, value as any); // Type assertion needed for Supabase parameter compatibility
  });
  
  const { data: result, error } = await query.select().single();
  
  if (error) {
    throw error;
  }
  
  return camelcaseKeys(result, { deep: true }) as T;
}

/**
 * Creates a Supabase client for Server Components (Pages Router, Route Handlers).
 * Ensures cookies are handled correctly with `getAll`/`setAll` and `path: '/'`.
 * NOTE: This function must be called within an async context.
 */
export async function createSupabaseServerClient() { // Make async, remove parameter
  const cookieStore = await cookies(); // Await the call

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Use the awaited cookieStore
          return cookieStore.getAll();
        },
        // Define the type for cookiesToSet based on Supabase/Next.js types
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Ensure path is always set
              const cookieOptions = { ...options, path: '/' };
              // Handle sameSite boolean conversion if necessary
              if (cookieOptions.sameSite === true) cookieOptions.sameSite = 'strict';
              if (cookieOptions.sameSite === false) cookieOptions.sameSite = 'lax';
              // Use the awaited cookieStore's set method
              cookieStore.set(name, value, cookieOptions);
            });
          } catch (error) {
            // The `setAll` method may fail in Server Components.
            // This can be ignored if you have middleware refreshing sessions.
            console.warn('Error setting cookies via Supabase server client:', error);
          }
        },
      },
    }
  );
}

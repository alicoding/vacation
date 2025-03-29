export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createDirectClient } from '@/utils/supabase';
import { createServiceClient } from '@/utils/supabase-server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * Debug endpoint to help identify issues with vacation bookings retrieval
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Get auth session using different methods
    const directClient = createDirectClient();
    const { data: { session } } = await directClient.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // 2. Create a service client that bypasses RLS
    const serviceClient = createServiceClient();
    
    // 3. Create a server client (like in dashboard page)
    const cookieStore = await cookies();
    const serverClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set(name, value, options) {
            cookieStore.set(name, value, options);
          },
          remove(name, options) {
            cookieStore.set(name, '', { ...options, maxAge: 0 });
          },
        },
      },
    );
    
    // 4. Debug responses with different query approaches
    const results = {
      user: {
        id: userId,
        email: session.user.email,
      },
      
      // Standard query with direct client (vacations page approach)
      directClientQuery: {},
      
      // Server client query (dashboard page approach)
      serverClientQuery: {},
      
      // Service role query bypassing RLS
      serviceQuery: {},
      
      // Check if table exists and RLS policies
      tableInfo: {},
    };
    
    // 5. Run direct client query (as in vacations page)
    const { data: directData, error: directError } = await directClient
      .from('vacation_bookings')
      .select('*')
      .eq('user_id', userId);
    
    results.directClientQuery = {
      count: directData?.length || 0,
      error: directError ? directError.message : null,
    };
    
    // 6. Run server client query (as in dashboard page)
    const { data: serverData, error: serverError } = await serverClient
      .from('vacation_bookings')
      .select('*')
      .eq('user_id', userId);
    
    results.serverClientQuery = {
      count: serverData?.length || 0,
      error: serverError ? serverError.message : null,
    };
    
    // 7. Run service role query (bypassing RLS)
    const { data: serviceData, error: serviceError } = await serviceClient
      .from('vacation_bookings')
      .select('*')
      .eq('user_id', userId);
    
    results.serviceQuery = {
      count: serviceData?.length || 0,
      error: serviceError ? serviceError.message : null,
      firstRecord: serviceData && serviceData.length > 0 ? serviceData[0] : null,
    };
    
    // 8. Check table information and RLS policies
    try {
      // Get table count
      const { count, error: countError } = await serviceClient
        .from('vacation_bookings')
        .select('*', { count: 'exact', head: true });
      
      results.tableInfo = {
        totalRecords: count,
        countError: countError ? countError.message : null,
      };
    } catch (tableError) {
      results.tableInfo = {
        error: tableError instanceof Error ? tableError.message : String(tableError),
      };
    }
    
    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { error: error.message || 'Debug endpoint error' },
      { status: 500 },
    );
  }
}
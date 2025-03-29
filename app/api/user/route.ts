export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function GET(request: NextRequest) {
  try {
    // Use createServerClient with cookies for proper auth in Edge runtime
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set(name, value, options) {
            try {
              // Ensure sameSite is a string value required by cookie API
              if (options?.sameSite === true) options.sameSite = 'strict';
              if (options?.sameSite === false) options.sameSite = 'lax';
              
              cookieStore.set(name, value, options);
            } catch (e) {
              console.warn('Error setting cookie:', e);
            }
          },
          remove(name, options) {
            try {
              cookieStore.set(name, '', { ...options, maxAge: 0 });
            } catch (e) {
              console.warn('Error removing cookie:', e);
            }
          },
        },
      },
    );
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication error in /api/user:', authError);
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    console.log('User authenticated in API route:', user.id);
    
    // First, check if we need to sync values from auth metadata to users table
    // This creates an "eventually consistent" approach where auth metadata is the source of truth
    if (user.user_metadata) {
      // Create admin client to perform updates with service role
      const adminClient = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { 
          auth: { 
            persistSession: false, 
          }, 
        },
      );
      
      // Get current user record
      const { data: currentUserData } = await adminClient
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
        
      // Only update if the user exists and values are different
      if (currentUserData) {
        const updates: any = {};
        let needsUpdate = false;
        
        // Check each field to see if it needs updating
        if (user.user_metadata.total_vacation_days !== undefined && 
            currentUserData.total_vacation_days !== user.user_metadata.total_vacation_days) {
          updates.total_vacation_days = user.user_metadata.total_vacation_days;
          needsUpdate = true;
        }
        
        if (user.user_metadata.province !== undefined && 
            currentUserData.province !== user.user_metadata.province) {
          updates.province = user.user_metadata.province;
          needsUpdate = true;
        }
        
        if (user.user_metadata.employment_type !== undefined && 
            currentUserData.employment_type !== user.user_metadata.employment_type) {
          updates.employment_type = user.user_metadata.employment_type;
          needsUpdate = true;
        }
        
        if (user.user_metadata.week_starts_on !== undefined && 
            currentUserData.week_starts_on !== user.user_metadata.week_starts_on) {
          updates.week_starts_on = user.user_metadata.week_starts_on;
          needsUpdate = true;
        }
        
        if (user.user_metadata.calendar_sync_enabled !== undefined && 
            currentUserData.calendar_sync_enabled !== user.user_metadata.calendar_sync_enabled) {
          updates.calendar_sync_enabled = user.user_metadata.calendar_sync_enabled;
          needsUpdate = true;
        }
        
        // Perform update if needed
        if (needsUpdate) {
          console.log('Syncing user data from auth metadata to users table:', updates);
          await adminClient
            .from('users')
            .update(updates)
            .eq('id', user.id);
        }
      }
    }
    
    // Query the users table to get user settings including calendar sync preferences
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (userError) {
      console.log(`User data error for ${user.id}:`, userError);
      
      // If the user doesn't exist in the users table yet, create a default record
      if (userError.code === 'PGRST116') {
        console.log('Creating new user record with defaults');
        
        // Create a supabase admin client with service role to bypass RLS
        // This is necessary because the user may not have permission to insert into the users table
        const adminClient = createClient<Database>(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { 
            auth: { 
              persistSession: false, 
            }, 
          },
        );
        
        // Get the user's metadata from auth to use for defaults
        const { data: { user: authUser } } = await adminClient.auth.admin.getUserById(user.id);
        
        // Use values from auth metadata if available, otherwise use defaults
        const total_vacation_days = authUser?.user_metadata?.total_vacation_days || 2;
        const province = authUser?.user_metadata?.province || 'ON';
        const employment_type = authUser?.user_metadata?.employment_type || 'standard';
        const week_starts_on = authUser?.user_metadata?.week_starts_on || 'sunday';
        const calendar_sync_enabled = authUser?.user_metadata?.calendar_sync_enabled || false;
        
        const { data: newUser, error: createError } = await adminClient
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            calendar_sync_enabled,
            total_vacation_days,
            province,
            employment_type,
            week_starts_on,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();
          
        if (createError) {
          console.error('Error creating user record:', createError);
          throw createError;
        }
        
        return NextResponse.json(newUser);
      }
      
      throw userError;
    }
    
    console.log('Fetched user data successfully:', userData);
    
    // Return user data with any missing fields set to defaults
    return NextResponse.json({
      ...userData,
      calendar_sync_enabled: userData.calendar_sync_enabled || false,
      total_vacation_days: userData.total_vacation_days || 2,
      province: userData.province || 'ON',
      employment_type: userData.employment_type || 'standard',
      week_starts_on: userData.week_starts_on || 'sunday',
    });
  } catch (error) {
    console.error('Error in user API route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 },
    );
  }
}
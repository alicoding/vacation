export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createDirectClient } from '@/utils/supabase';

export async function GET(request: NextRequest) {
  // Get the session directly from Supabase
  const supabase = createDirectClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    // Get user settings from database
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return NextResponse.json({ error: 'Failed to fetch user settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  // Get the session directly from Supabase
  const supabase = createDirectClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    
    // Update Supabase user metadata
    const { error: updateError } = await supabase.auth.updateUser({
      data: body
    });
    
    if (updateError) {
      throw updateError;
    }
    
    // Also update in our application database
    const { error } = await supabase
      .from('users')
      .update(body)
      .eq('id', session.user.id);
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating user settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
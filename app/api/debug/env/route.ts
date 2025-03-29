export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint to verify environment variable configuration
 * This helps diagnose issues when deploying to Edge runtime environments
 */
export async function GET(request: NextRequest) {
  const searchParams = new URL(request.url).searchParams;
  const authToken = searchParams.get('token');
  
  // Simple protection against unauthorized access
  if (authToken !== process.env.DEBUG_TOKEN && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Get all environment variables with prefixes we want to check
  const prefixes = ['GOOGLE_', 'NEXT', 'SUPABASE_'];
  const envVars: Record<string, string> = {};
  
  for (const key of Object.keys(process.env)) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) {
      const value = process.env[key] || '';
      
      // Mask secrets in production
      envVars[key] = process.env.NODE_ENV === 'production' 
        ? (value ? `${value.substring(0, 3)}...${value.substring(value.length - 3)}` : '(empty)')
        : (value || '(empty)');
    }
  }
  
  return NextResponse.json({
    environment: process.env.NODE_ENV,
    runtime: 'edge',
    variables: envVars,
    timestamp: new Date().toISOString(),
  });
}
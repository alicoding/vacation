import { createDirectClient } from './supabase'

// Edge-compatible Google Calendar functions
export async function getGoogleToken(userId: string) {
  const supabase = createDirectClient()
  
  const { data: tokenData, error } = await supabase
    .from('google_tokens')
    .select('*')
    .eq('user_id', userId)
    .single()
    
  if (error || !tokenData) {
    console.error('Error fetching Google token:', error)
    return null
  }
  
  // Check if token is expired and needs refresh
  if (Date.now() / 1000 > tokenData.expires_at) {
    // Implement edge-compatible token refresh logic
    try {
      const response = await fetch('/api/auth/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: tokenData.refresh_token,
          user_id: userId,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }
      
      const newTokenData = await response.json();
      return newTokenData.access_token;
    } catch (error) {
      console.error('Error refreshing Google token:', error);
      return null;
    }
  }
  
  return tokenData.access_token
}

export async function createCalendarEvent(userId: string, vacation: any) {
  const token = await getGoogleToken(userId)
  
  if (!token) {
    throw new Error('No valid Google token found')
  }
  
  const event = {
    summary: `Vacation: ${vacation.title}`,
    description: vacation.description || 'Time off from work',
    start: {
      dateTime: new Date(vacation.start_date).toISOString(),
      timeZone: 'UTC',
    },
    end: {
      dateTime: new Date(vacation.end_date).toISOString(),
      timeZone: 'UTC',
    },
    colorId: '5', // A nice vacation color
  }
  
  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  )
  
  if (!response.ok) {
    throw new Error('Failed to create calendar event')
  }
  
  return response.json()
}

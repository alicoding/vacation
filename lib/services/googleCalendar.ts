/**
 * Google Calendar API service using fetch API (Edge compatible)
 */

interface CalendarEvent {
  summary: string;
  description?: string;
  start: {
    date: string;
    timeZone: string;
  };
  end: {
    date: string;
    timeZone: string;
  };
}

export class GoogleCalendarService {
  private accessToken: string;
  
  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }
  
  /**
   * Insert a new event into Google Calendar
   */
  async insertEvent(calendarId: string, event: CalendarEvent): Promise<{ id: string }> {
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Google Calendar API error: ${errorData.error?.message || response.statusText}`);
    }
    
    return response.json();
  }
  
  /**
   * Refresh an access token using a refresh token
   * Note: This would typically be handled by a token management service
   */
  static async refreshAccessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Token refresh error: ${errorData.error_description || response.statusText}`);
    }
    
    const data = await response.json();
    return data.access_token;
  }
}

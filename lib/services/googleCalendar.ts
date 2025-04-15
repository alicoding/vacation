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
  async insertEvent(
    calendarId: string,
    event: CalendarEvent,
  ): Promise<{ id: string }> {
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId,
    )}/events`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    const result: unknown = await response.json().catch(() => null);

    if (
      !response.ok ||
      typeof result !== 'object' ||
      result === null ||
      !('id' in result) ||
      typeof (result as { id: unknown }).id !== 'string'
    ) {
      const errorMessage =
        typeof result === 'object' &&
        result !== null &&
        'error' in result &&
        typeof (result as { error?: { message?: string } }).error?.message ===
          'string'
          ? (result as { error: { message: string } }).error.message
          : response.statusText;

      throw new Error(`Google Calendar API error: ${errorMessage}`);
    }

    return { id: (result as { id: string }).id };
  }

  /**
   * Refresh an access token using a refresh token
   */
  static async refreshAccessToken(
    clientId: string,
    clientSecret: string,
    refreshToken: string,
  ): Promise<string> {
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

    const result: unknown = await response.json().catch(() => null);

    if (
      !response.ok ||
      typeof result !== 'object' ||
      result === null ||
      !('access_token' in result) ||
      typeof (result as { access_token: unknown }).access_token !== 'string'
    ) {
      const errorMessage =
        typeof result === 'object' &&
        result !== null &&
        'error_description' in result &&
        typeof (result as { error_description?: string }).error_description ===
          'string'
          ? (result as { error_description: string }).error_description
          : response.statusText;

      throw new Error(`Token refresh error: ${errorMessage}`);
    }

    return (result as { access_token: string }).access_token;
  }
}

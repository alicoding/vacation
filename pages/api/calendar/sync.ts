import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { PrismaClient } from '@prisma/client';
import { google } from 'googleapis';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const { enabled } = req.body;

    // Get the user's Google OAuth2 tokens
    const account = await prisma.account.findFirst({
      where: {
        user: { email: session.user.email },
        provider: 'google',
      },
    });

    if (!account) {
      return res.status(400).json({ message: 'Google account not connected' });
    }

    // Update user's sync preferences
    await prisma.user.update({
      where: { email: session.user.email },
      data: { calendar_sync_enabled: enabled },
    });

    if (enabled) {
      // Initialize Google Calendar API
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({
        access_token: account.access_token,
        refresh_token: account.refresh_token,
      });

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // Get user's vacation bookings that don't have a Google Calendar event yet
      const vacations = await prisma.vacationBooking.findMany({
        where: { 
          user: { email: session.user.email },
          googleEventId: null
        },
      });

      // Sync each vacation booking to Google Calendar
      for (const vacation of vacations) {
        const event = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: {
            summary: 'Vacation',
            description: vacation.note || 'Vacation day',
            start: {
              date: vacation.start_date.toISOString().split('T')[0],
              timeZone: 'UTC',
            },
            end: {
              date: vacation.end_date.toISOString().split('T')[0],
              timeZone: 'UTC',
            },
          },
        });

        // Store the Google Calendar event ID
        if (event.data.id) {
          await prisma.vacationBooking.update({
            where: { id: vacation.id },
            data: { googleEventId: event.data.id },
          });
        }
      }
    }

    return res.status(200).json({ message: 'Calendar sync settings updated' });
  } catch (error) {
    console.error('Calendar sync error:', error);
    return res.status(500).json({ message: 'Failed to sync calendar' });
  }
} 
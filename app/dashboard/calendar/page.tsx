'use client';

export const runtime = 'edge';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/components/auth/AuthProvider'; // Use AuthProvider context
import {
  Container,
  Box,
  Typography,
  Paper,
  Divider,
  CircularProgress,
} from '@mui/material';
import { DateTime } from 'luxon';
import { VacationBooking, Holiday } from '@/types';
import FullCalendar from '@/components/calendar/FullCalendar';
import CalendarLegend from '@/components/calendar/CalendarLegend';
import GoogleCalendarSync from '@/features/calendar/GoogleCalendarSync';

// Separated component for the GoogleCalendarSync with Suspense
function GoogleCalendarSyncWrapper({
  calendarSyncEnabled,
  onToggle,
}: {
  calendarSyncEnabled: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <Suspense
      fallback={
        <Paper
          elevation={1}
          sx={{
            p: 3,
            minHeight: '120px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <CircularProgress size={24} />
        </Paper>
      }
    >
      <Paper elevation={1}>
        <GoogleCalendarSync enabled={calendarSyncEnabled} onToggle={onToggle} />
      </Paper>
    </Suspense>
  );
}

export default function CalendarPage() {
  const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth(); // Use values from useAuth
  const [currentDate, setCurrentDate] = useState(DateTime.local());
  const [vacations, setVacations] = useState<VacationBooking[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calendarSyncEnabled, setCalendarSyncEnabled] = useState(false);

  // Fetch vacations and holidays
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // --- Fetch Vacations ---
        const vacationsRes = await fetch('/api/vacations');
        if (!vacationsRes.ok) {
          throw new Error('Failed to fetch vacations');
        }

        const rawVacationData: unknown = await vacationsRes.json();

        if (!Array.isArray(rawVacationData)) {
          throw new Error('Invalid vacations data format');
        }

        const vacationsData: VacationBooking[] = rawVacationData.map(
          (v: any) => {
            if (
              typeof v.id !== 'string' ||
              typeof v.user_id !== 'string' ||
              typeof v.start_date !== 'string' ||
              typeof v.end_date !== 'string' ||
              typeof v.created_at !== 'string'
            ) {
              throw new Error('Invalid vacation record structure');
            }

            return v as VacationBooking;
          },
        );

        setVacations(vacationsData);

        // --- Fetch Holidays ---
        const holidaysRes = await fetch(
          `/api/holidays?year=${currentDate.year}`,
        );
        if (!holidaysRes.ok) {
          throw new Error('Failed to fetch holidays');
        }

        const rawHolidayData: unknown = await holidaysRes.json();

        if (!Array.isArray(rawHolidayData)) {
          throw new Error('Invalid holidays data format');
        }

        const holidaysData: Holiday[] = rawHolidayData.map((h: any) => {
          if (
            typeof h.id !== 'string' ||
            typeof h.date !== 'string' ||
            typeof h.name !== 'string' ||
            !Array.isArray(h.type)
          ) {
            throw new Error('Invalid holiday record structure');
          }

          return h as Holiday;
        });

        setHolidays(holidaysData);
      } catch (err) {
        console.error('Error fetching calendar data:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load calendar data',
        );
      } finally {
        setLoading(false);
      }
    }

    void fetchData();
  }, [currentDate.year]);

  // Fetch user calendar sync preferences
  useEffect(() => {
    async function fetchUserSettings() {
      // Check authentication status before fetching settings
      if (!isAuthenticated || !user?.id) return;

      try {
        const response = await fetch('/api/user');
        if (!response.ok) {
          throw new Error('Failed to fetch user settings');
        }

        const rawUserData: unknown = await response.json();

        // Runtime validation
        if (
          typeof rawUserData !== 'object' ||
          rawUserData === null ||
          typeof (rawUserData as any).calendar_sync_enabled !== 'boolean'
        ) {
          throw new Error('Invalid user settings format');
        }

        const userData = rawUserData as { calendar_sync_enabled: boolean };
        setCalendarSyncEnabled(userData.calendar_sync_enabled);
      } catch (error) {
        console.error('Error fetching user settings:', error);
      }
    }

    void fetchUserSettings();
  }, [isAuthenticated, user?.id]); // Update dependencies

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate((prev) => prev.minus({ months: 1 }));
  };

  const goToNextMonth = () => {
    setCurrentDate((prev) => prev.plus({ months: 1 }));
  };

  const goToCurrentMonth = () => {
    setCurrentDate(DateTime.local());
  };

  const handleToggleCalendarSync = (enabled: boolean) => {
    setCalendarSyncEnabled(enabled);
  };

  return (
    <Container maxWidth="xl">
      <Box my={4}>
        <FullCalendar
          currentDate={currentDate}
          vacations={vacations}
          holidays={holidays}
          loading={loading}
          error={error}
          onPrevMonth={goToPreviousMonth}
          onNextMonth={goToNextMonth}
          onCurrentMonth={goToCurrentMonth}
        />

        <Box display="flex" justifyContent="space-between" mt={4} gap={2}>
          <Box sx={{ flex: 1 }}>
            <CalendarLegend />
          </Box>
          <Box sx={{ flex: 1, maxWidth: '400px' }}>
            <GoogleCalendarSyncWrapper
              calendarSyncEnabled={calendarSyncEnabled}
              onToggle={handleToggleCalendarSync}
            />
          </Box>
        </Box>
      </Box>
    </Container>
  );
}

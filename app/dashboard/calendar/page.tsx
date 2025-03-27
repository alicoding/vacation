'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/lib/auth-helpers'; // Updated import
import { Container, Box } from '@mui/material';
import { DateTime } from 'luxon';
import { VacationBooking, Holiday } from '@/types';
import FullCalendar from '@/components/calendar/FullCalendar';
import CalendarLegend from '@/components/calendar/CalendarLegend';

export default function CalendarPage() {
  const { data: session } = useSession(); // Using our Supabase compatible hook
  const [currentDate, setCurrentDate] = useState(DateTime.local());
  const [vacations, setVacations] = useState<VacationBooking[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch vacations and holidays
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch vacations
        const vacationsRes = await fetch('/api/vacations');
        if (!vacationsRes.ok) {
          throw new Error('Failed to fetch vacations');
        }
        const vacationsData = await vacationsRes.json();
        
        // Fetch holidays for the current year
        const holidaysRes = await fetch(`/api/holidays?year=${currentDate.year}`);
        if (!holidaysRes.ok) {
          throw new Error('Failed to fetch holidays');
        }
        const holidaysData = await holidaysRes.json();
        
        setVacations(vacationsData);
        setHolidays(holidaysData);
      } catch (err) {
        console.error('Error fetching calendar data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load calendar data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [currentDate.year]);

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(prev => prev.minus({ months: 1 }));
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => prev.plus({ months: 1 }));
  };

  const goToCurrentMonth = () => {
    setCurrentDate(DateTime.local());
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
        <CalendarLegend />
      </Box>
    </Container>
  );
}

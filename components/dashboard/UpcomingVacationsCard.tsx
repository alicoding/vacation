'use client';

import { useState, useEffect } from 'react';
import { 
  Card, CardContent, CardHeader, Typography, Box, 
  List, ListItem, ListItemText, Divider, Chip, IconButton,
  Alert, Button
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { DateTime, Interval } from 'luxon';
import Link from 'next/link';
import { VacationBooking, Holiday } from '@/types';

interface EnhancedVacation extends VacationBooking {
  isLongWeekend: boolean;
  adjacentHolidays: Holiday[];
  totalDaysOff: number;
  workingDaysOff: number;
}

interface UpcomingVacationsCardProps {
  vacations?: VacationBooking[];
  holidaysError?: string;
}

// Extracted function for fetching vacations
const fetchVacations = async (): Promise<VacationBooking[]> => {
  const response = await fetch('/api/vacations');
  if (!response.ok) throw new Error('Failed to fetch vacations');
  return await response.json();
};

// Extracted function for fetching holidays
const fetchHolidays = async (): Promise<Holiday[]> => {
  const response = await fetch('/api/holidays');
  if (!response.ok) throw new Error('Failed to fetch holidays');
  return await response.json();
};
export default function UpcomingVacationsCard({ vacations: initialVacations, holidaysError }: UpcomingVacationsCardProps) {
  const [vacations, setVacations] = useState<VacationBooking[]>([]);
  const [enhancedVacations, setEnhancedVacations] = useState<EnhancedVacation[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(!initialVacations);
  const [error, setError] = useState<string | null>(null);

  // Fetch vacations if not provided
  useEffect(() => {
    if (initialVacations) {
      setVacations(initialVacations);
      setLoading(false);
    } else {
      const getVacations = async () => {
        try {
          setLoading(true);
          setError(null);
          const data = await fetchVacations();
          setVacations(data);
        } catch (error) {
          console.error('Error fetching vacations:', error);
          setError(error instanceof Error ? error.message : 'Failed to load vacations');
        } finally {
          setLoading(false);
        }
      };

      getVacations();
    }
  }, [initialVacations]);

  // Fetch holidays
  useEffect(() => {
    const getHolidays = async () => {
      try {
        const data = await fetchHolidays();
        setHolidays(data);
      } catch (error) {
        console.error('Error fetching holidays:', error);
      }
    };

    getHolidays();
  }, []);

  // Enhance vacations with additional information when vacations or holidays change
  useEffect(() => {
    if (vacations.length === 0 || holidays.length === 0) return;

    const enhanced = vacations.map(vacation => {
      const startDate = new Date(vacation.start_date);
      const endDate = new Date(vacation.end_date);
      
      // Calculate total days off (including weekends)
      const totalDaysOff = Interval.fromDateTimes(
        DateTime.fromJSDate(startDate), 
        DateTime.fromJSDate(endDate).plus({ days: 1 })
      ).length('days');
      
      // Check if this is a long weekend
      // Long weekend is defined as:
      // - Taking 1-2 days off
      // - That connect with a weekend (either before or after)
      let isLongWeekend = false;
      if (totalDaysOff <= 2) {
        const dayBeforeStart = DateTime.fromJSDate(startDate).minus({ days: 1 }).toJSDate();
        const dayAfterEnd = DateTime.fromJSDate(endDate).plus({ days: 1 }).toJSDate();
        
        const isWeekendDay = (date: Date) => [6, 7].includes(DateTime.fromJSDate(date).weekday);
        
        if (isWeekendDay(dayBeforeStart) || isWeekendDay(dayAfterEnd)) {
          isLongWeekend = true;
        }
      }
      
      // Find adjacent holidays
      const adjacentHolidays = holidays.filter(holiday => {
        const holidayDate = new Date(holiday.date);
        
        // Check if holiday is 1 day before start or 1 day after end
        const dayBeforeStart = DateTime.fromJSDate(startDate).minus({ days: 1 }).toJSDate();
        const dayAfterEnd = DateTime.fromJSDate(endDate).plus({ days: 1 }).toJSDate();
        
        return DateTime.fromJSDate(holidayDate).hasSame(DateTime.fromJSDate(dayBeforeStart), 'day') || 
               DateTime.fromJSDate(holidayDate).hasSame(DateTime.fromJSDate(dayAfterEnd), 'day');
      });
      
      // Calculate working days (excluding weekends and holidays)
      let workingDaysOff = 0;
      let current = DateTime.fromJSDate(startDate);
      const lastDay = DateTime.fromJSDate(endDate);
      
      while (current <= lastDay) {
        if (![6, 7].includes(current.weekday)) { // Not a weekend
          const isHoliday = holidays.some(holiday => 
            DateTime.fromISO(holiday.date).hasSame(current, 'day')
          );
          
          if (!isHoliday) {
            workingDaysOff++;
          }
        }
        current = current.plus({ days: 1 });
      }
      
      return {
        ...vacation,
        isLongWeekend,
        adjacentHolidays,
        totalDaysOff,
        workingDaysOff
      };
    });
    
    // Sort by start date (upcoming first)
    const sortedVacations = enhanced
      .filter(vacation => new Date(vacation.end_date) >= new Date()) // Only show future or current vacations
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    
    setEnhancedVacations(sortedVacations);
  }, [vacations, holidays]);

  // Function to format a date range
  const formatDateRange = (startDate: string, endDate: string) => {
    try {
      const start = DateTime.fromISO(startDate);
      const end = DateTime.fromISO(endDate);
      
      // Check if dates are valid before formatting
      if (!start.isValid || !end.isValid) {
        return 'Date range unavailable';
      }
      
      // If same day, return single date
      if (startDate === endDate) {
        return start.toFormat('MMMM d, yyyy');
      }
      
      // If same month and year, return range with single month/year
      if (
        start.month === end.month &&
        start.year === end.year
      ) {
        return `${start.toFormat('MMMM d')} - ${end.toFormat('d, yyyy')}`;
      }
      
      // Otherwise, return full date range
      return `${start.toFormat('MMM d, yyyy')} - ${end.toFormat('MMM d, yyyy')}`;
    } catch (error) {
      console.error('Error formatting date range:', error);
      return 'Date range unavailable';
    }
  };

  // Render error state
  if (error) {
    return (
      <Card elevation={0} variant="outlined">
        <CardHeader title="Upcoming Vacations" />
        <Divider />
        <CardContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Button 
            onClick={() => window.location.reload()}
            variant="contained"
            color="error"
          >
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevation={0} variant="outlined">
      <CardHeader title="Upcoming Vacations" />
      <Divider />
      <CardContent>
        {holidaysError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {holidaysError}
          </Alert>
        )}
        
        <List disablePadding>
          {enhancedVacations.length > 0 ? (
            enhancedVacations.map((vacation) => (
              <ListItem 
                key={vacation.id}
                alignItems="flex-start"
                sx={{
                  mb: 2,
                  borderRadius: 1,
                  flexDirection: 'column'
                }}
              >
                <Box 
                  sx={{ 
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1" fontWeight="medium">
                      {formatDateRange(
                        typeof vacation.start_date === 'string' ? vacation.start_date : vacation.start_date.toISOString(),
                        typeof vacation.end_date === 'string' ? vacation.end_date : vacation.end_date.toISOString()
                      )}
                    </Typography>
                    
                    <Chip 
                      size="small"
                      label={`${vacation.workingDaysOff} working day${vacation.workingDaysOff !== 1 ? 's' : ''}`}
                      color="primary"
                    />
                  </Box>
                  
                  <Box display="flex" gap={2}>
                      <Typography variant="body2" color="text.secondary">
                      Start: {typeof vacation.start_date === 'string' 
                        ? DateTime.fromISO(vacation.start_date).toLocaleString() 
                        : DateTime.fromJSDate(vacation.start_date).toLocaleString()}
                      </Typography>
                    <Typography variant="body2" color="text.secondary">
                       End: {typeof vacation.end_date === 'string' 
                        ? DateTime.fromISO(vacation.end_date).toLocaleString() 
                        : DateTime.fromJSDate(vacation.end_date).toLocaleString()}
                    </Typography>
                  </Box>
                  
                  {vacation.note && (
                    <Typography variant="body2" color="text.secondary">
                      Notes: {vacation.note}
                    </Typography>
                  )}
                  
                  <Box 
                    sx={{ 
                      mt: 1,
                      p: 1.5, 
                      bgcolor: 'background.default', 
                      borderRadius: 1
                    }}
                  >
                    <Typography variant="body2" fontWeight="medium" gutterBottom>
                      Summary:
                    </Typography>
                    
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Total days off:
                      </Typography>
                      <Typography variant="body2">
                        {vacation.totalDaysOff} days
                      </Typography>
                    </Box>
                    
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Working days used:
                      </Typography>
                      <Typography variant="body2" fontWeight="medium" color="primary.main">
                        {vacation.workingDaysOff} days
                      </Typography>
                    </Box>
                    
                    {(() => {
                      const weekendDays = vacation.totalDaysOff - vacation.workingDaysOff;
                      
                      if (weekendDays > 0) {
                        return (
                          <Box display="flex" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">
                              Including weekends/holidays:
                            </Typography>
                            <Typography variant="body2">
                              {weekendDays} days
                            </Typography>
                          </Box>
                        );
                      }
                      return null;
                    })()}
                    
                    {vacation.adjacentHolidays.length > 0 && (
                      <Box mt={1}>
                        <Typography variant="body2" color="text.secondary">
                          Adjacent holidays: {vacation.adjacentHolidays.map(h => h.name).join(', ')}
                        </Typography>
                      </Box>
                    )}
                    
                    {vacation.isLongWeekend && (
                      <Alert severity="info" sx={{ mt: 1 }} icon={false}>
                        <Typography variant="caption">
                          This is a long weekend. Enjoy your extended break!
                        </Typography>
                      </Alert>
                    )}
                  </Box>
                  
                  <Box display="flex" justifyContent="flex-end">
                    <IconButton size="small" color="primary">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                    </IconButton>
                  </Box>
                </Box>
              </ListItem>
            ))
          ) : (
            <Box p={3} textAlign="center">
              <Typography variant="body1" color="text.secondary" gutterBottom>
                You have no upcoming vacations scheduled.
              </Typography>
            </Box>
          )}
        </List>
      </CardContent>
    </Card>
  );
}
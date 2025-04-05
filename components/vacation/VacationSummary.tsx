/**
 * VacationSummary Component
 *
 * Displays a summary of vacation days calculation with proper formatting
 * and a detailed breakdown of days (working days, weekends, holidays).
 * This component fixes the decimal display issues in day calculations.
 *
 * @param {VacationSummaryProps} props - The props passed to the component
 * @returns {JSX.Element} A component displaying vacation day calculations
 */
'use client';

import { useMemo, useState, useEffect } from 'react'; // Add useState, useEffect
import { format, isWeekend, eachDayOfInterval } from 'date-fns'; // Remove differenceInBusinessDays
import { DateTime } from 'luxon'; // Import Luxon
import useHolidays from '@/lib/hooks/useHolidays'; // Import useHolidays hook
import { calculateBusinessDays } from '@/services/vacation/vacationCalculationUtils'; // Import from utils
import {
  Box,
  Typography,
  Paper,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Chip,
  Alert,
} from '@mui/material';

interface VacationSummaryProps {
  startDate: Date | null; // Allow null initially
  endDate: Date | null; // Allow null initially
  province: string; // Add province prop
  isHalfDay?: boolean; // Keep for potential simple cases if needed
  halfDayPortion?: string | null; // Keep for potential simple cases if needed
  halfDayDate?: Date | null; // Keep for potential simple cases if needed
  halfDayDates?: {
    // Keep for accurate half-day calculation
    date: Date;
    portion: string;
  }[];
  // Remove workingDays and holidays props, as they will be calculated/fetched internally
}

// Helper to convert fetched Holiday type to the structure needed for display/filtering
interface DisplayHoliday {
  date: Date;
  name: string;
  province?: string | null;
  type: string[]; // Assuming type might be an array based on original prop
}

export default function VacationSummary({
  startDate, // Can be null
  endDate, // Can be null
  province,
  // isHalfDay, // Not directly used in calculation anymore
  // halfDayPortion, // Not directly used in calculation anymore
  // halfDayDate, // Not directly used in calculation anymore
  halfDayDates,
}: VacationSummaryProps) {
  const [calculatedBusinessDays, setCalculatedBusinessDays] = useState<
    number | null
  >(null);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch holidays using the hook for the relevant year range
  const startYear = startDate
    ? startDate.getFullYear()
    : new Date().getFullYear();
  const endYear = endDate ? endDate.getFullYear() : startYear;
  // Fetch for both years if the range spans across years
  const yearsToFetch =
    startYear === endYear ? [startYear] : [startYear, endYear];

  // Use separate hook calls if needed, or adjust useHolidays if it supports multiple years/range
  // For simplicity, let's assume useHolidays fetches for a single year based on current logic
  // We might need a more robust holiday fetching strategy for multi-year ranges
  const { holidays: fetchedHolidays, loading: holidaysLoading } = useHolidays(
    startYear, // Fetch based on start year for now
    province,
  );

  // Format fetched holidays for internal use
  const holidaysForDisplay: DisplayHoliday[] = useMemo(() => {
    return (fetchedHolidays || []).map((h) => ({
      date: DateTime.fromISO(h.date).toJSDate(), // Convert ISO string to Date
      name: h.name,
      province: h.province,
      type: h.type || [], // Ensure type is an array
    }));
  }, [fetchedHolidays]);

  // Effect to calculate business days when dates or holidays change
  useEffect(() => {
    // Restore this effect
    // Define the async function inside the effect
    const performCalculation = () => {
      // Remove async
      // Ensure dates are selected and holidays are loaded before proceeding
      if (startDate && endDate && !holidaysLoading) {
        setIsLoading(true);
        setCalculationError(null);
        try {
          // Prepare holidays in the format expected by calculateBusinessDays
          // holidaysForDisplay is already in the correct format { date: Date, type: string[] }
          const holidaysForCalc: { date: Date; type: string[] }[] =
            holidaysForDisplay;

          // Call the synchronous function
          const days = calculateBusinessDays(
            // Remove await
            startDate,
            endDate,
            holidaysForCalc, // Pass the formatted holidays
            false, // isHalfDay flag (adjustments happen later)
          );
          setCalculatedBusinessDays(days);
        } catch (error) {
          console.error('Error calculating business days in summary:', error);
          setCalculationError(
            error instanceof Error ? error.message : 'Calculation failed',
          );
          setCalculatedBusinessDays(null); // Reset on error
        } finally {
          setIsLoading(false);
        }
      } else {
        // Reset calculation state if inputs are not ready
        setCalculatedBusinessDays(null);
        setCalculationError(null);
        // Ensure loading is false if we are not calculating
        if (!holidaysLoading) {
          setIsLoading(false);
        }
      }
    };

    // Call the async function
    performCalculation(); // Remove void

    // Dependencies: Recalculate if dates or fetched holidays change, or loading state finishes
  }, [startDate, endDate, holidaysForDisplay, holidaysLoading]); // Restore dependencies

  const summary = useMemo(() => {
    // Return default/empty state if dates are missing or calculation is pending/failed
    if (!startDate || !endDate || calculatedBusinessDays === null) {
      return {
        totalDays: 0,
        weekendDays: 0,
        holidayDays: 0,
        workingDays: 0, // Base working days before half-day adjustments
        actualVacationDays: 0,
        holidaysInRange: [],
      };
    }

    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    const totalDays = allDays.length;

    const weekendDays = allDays.filter((day) => isWeekend(day)).length;

    // Use holidaysForDisplay for filtering holidays in range
    const holidaysInRange = holidaysForDisplay.filter((holiday) => {
      const holidayDateStr = format(holiday.date, 'yyyy-MM-dd');
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');
      return holidayDateStr >= startDateStr && holidayDateStr <= endDateStr;
    });

    const holidayDaysCount = holidaysInRange.filter((holiday) => {
      // Ensure we only count holidays that fall on what would otherwise be a business day
      return !isWeekend(holiday.date);
    }).length;

    // Use the result from calculateBusinessDays as the base working days
    const workingDaysCalculated = calculatedBusinessDays; // Already excludes weekends/holidays

    // Calculate half-day adjustments based on the halfDayDates array
    const halfDayAdjustments =
      (halfDayDates || []).filter((hd) => {
        // Ensure the half day falls within the calculated business days (excluding holidays/weekends)
        const day = hd.date;
        const dayStr = format(day, 'yyyy-MM-dd');
        const isWeekendDay = isWeekend(day);
        // Check against the fetched holidaysInRange
        const isHolidayDay = holidaysInRange.some(
          (h) => format(h.date, 'yyyy-MM-dd') === dayStr,
        );
        // Check if the date is within the selected range
        const isInRange = day >= startDate && day <= endDate;

        return !isWeekendDay && !isHolidayDay && isInRange;
      }).length * 0.5;

    const actualVacationDays = workingDaysCalculated - halfDayAdjustments;

    return {
      totalDays,
      weekendDays,
      holidayDays: holidayDaysCount, // Use the counted holidays on business days
      workingDays: workingDaysCalculated, // Base working days from service
      actualVacationDays: Number(actualVacationDays.toFixed(1)), // Apply half-day adjustments
      holidaysInRange, // Pass holidays in range for display
    };
    // Dependencies include fetched/calculated values and inputs
  }, [
    startDate,
    endDate,
    halfDayDates,
    holidaysForDisplay,
    calculatedBusinessDays,
  ]);

  // holidaysInRange is now calculated within the main summary useMemo

  // Handle loading and error states
  if (!startDate || !endDate) {
    return (
      <Paper elevation={0} variant="outlined" sx={{ p: 3, mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Select a start and end date to see the summary.
        </Typography>
      </Paper>
    );
  }

  if (isLoading || holidaysLoading) {
    return (
      <Paper elevation={0} variant="outlined" sx={{ p: 3, mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Calculating summary...
        </Typography>
      </Paper>
    );
  }

  if (calculationError) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Could not calculate vacation summary: {calculationError}
      </Alert>
    );
  }

  return (
    <Paper elevation={0} variant="outlined" sx={{ p: 3, mt: 2 }}>
      {' '}
      {/* Add margin top */}
      <Typography variant="h6" gutterBottom>
        Vacation Summary
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Date Range
        </Typography>
        <Typography>
          {startDate ? format(startDate, 'MMM d, yyyy') : '...'} -{' '}
          {endDate ? format(endDate, 'MMM d, yyyy') : '...'}
        </Typography>
      </Box>
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
        <Table size="small">
          <TableBody>
            <TableRow>
              <TableCell>
                <Typography variant="body2">Total Days</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2">
                  {summary.totalDays} days
                </Typography>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <Typography variant="body2">Weekend Days</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" color="text.secondary">
                  {summary.weekendDays} days
                </Typography>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <Typography variant="body2">Holiday Days</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" color="text.secondary">
                  {summary.holidayDays} days
                </Typography>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ borderBottom: 'none' }}>
                <Typography variant="body2" fontWeight="medium">
                  Vacation Days Used
                </Typography>
              </TableCell>
              <TableCell align="right" sx={{ borderBottom: 'none' }}>
                <Typography variant="body1" color="primary" fontWeight="medium">
                  {summary.actualVacationDays} days
                </Typography>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      {/* Use summary.holidaysInRange */}
      {summary.holidaysInRange.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Holidays During Vacation
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {summary.holidaysInRange.map((holiday, index) => (
              <Chip
                key={index}
                label={`${holiday.name} (${format(holiday.date, 'MMM d')})`}
                // Determine chip color based on holiday type if available
                color={
                  holiday.type?.includes('bank') // Example: Check if it's a bank holiday
                    ? 'error'
                    : holiday.type?.includes('federal') // Example: Check federal
                      ? 'info'
                      : 'warning' // Default
                }
                variant="outlined"
                size="small"
              />
            ))}
          </Box>
        </Box>
      )}
      {summary.weekendDays > 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Your vacation includes {summary.weekendDays} weekend{' '}
          {summary.weekendDays === 1 ? 'day' : 'days'}
          and {summary.holidayDays} holiday{' '}
          {summary.holidayDays === 1 ? 'day' : 'days'}, giving you a total of{' '}
          {summary.totalDays} consecutive days off.
        </Alert>
      )}
    </Paper>
  );
}

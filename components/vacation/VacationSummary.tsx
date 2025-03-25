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

import { useMemo } from 'react';
import { format, differenceInBusinessDays, isWeekend, eachDayOfInterval } from 'date-fns';
import { 
  Box, Typography, Paper, Divider, 
  Table, TableBody, TableCell, TableContainer, 
  TableRow, Chip, Alert
} from '@mui/material';

interface VacationSummaryProps {
  startDate: Date;
  endDate: Date;
  isHalfDay?: boolean;
  halfDayPortion?: string | null;
  halfDayDate?: Date | null;
  halfDayDates?: Array<{
    date: Date;
    portion: string;
  }>;
  workingDays?: number;
  holidays: Array<{
    date: Date;
    name: string;
    province: string | null;
    type: 'bank' | 'provincial';
  }>;
}

export default function VacationSummary({ startDate, endDate, isHalfDay, halfDayPortion, halfDayDate, halfDayDates, workingDays, holidays }: VacationSummaryProps) {
  const summary = useMemo(() => {
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    const totalDays = allDays.length;
    
    const weekendDays = allDays.filter(day => isWeekend(day)).length;
    const holidayDays = allDays.filter(day => 
      holidays.some(holiday => 
        format(holiday.date, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
      )
    ).length;

    const businessDays = differenceInBusinessDays(endDate, startDate) + 1;
    const workingDaysCalculated = businessDays - holidayDays;
    const actualVacationDays = isHalfDay ? workingDaysCalculated - 0.5 : workingDaysCalculated;

    return {
      totalDays,
      weekendDays,
      holidayDays,
      workingDays: workingDaysCalculated,
      actualVacationDays: Number(actualVacationDays.toFixed(1)) // Fix decimal display
    };
  }, [startDate, endDate, isHalfDay, holidays]);

  const holidaysInRange = useMemo(() => {
    return holidays.filter(holiday => {
      const holidayDate = format(holiday.date, 'yyyy-MM-dd');
      return holidayDate >= format(startDate, 'yyyy-MM-dd') && 
             holidayDate <= format(endDate, 'yyyy-MM-dd');
    });
  }, [startDate, endDate, holidays]);

  return (
    <Paper elevation={0} variant="outlined" sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Vacation Summary
      </Typography>
      
      <Divider sx={{ mb: 2 }} />
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Date Range
        </Typography>
        <Typography>
          {format(startDate, 'MMM d, yyyy')} - {format(endDate, 'MMM d, yyyy')}
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
                <Typography variant="body2">{summary.totalDays} days</Typography>
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

      {holidaysInRange.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Holidays During Vacation
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {holidaysInRange.map((holiday, index) => (
              <Chip
                key={index}
                label={`${holiday.name} (${format(holiday.date, 'MMM d')})`}
                color="warning"
                variant="outlined"
                size="small"
              />
            ))}
          </Box>
        </Box>
      )}

      {summary.weekendDays > 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Your vacation includes {summary.weekendDays} weekend {summary.weekendDays === 1 ? 'day' : 'days'} 
          and {summary.holidayDays} holiday {summary.holidayDays === 1 ? 'day' : 'days'}, 
          giving you a total of {summary.totalDays} consecutive days off.
        </Alert>
      )}
    </Paper>
  );
} 
/**
 * HolidayDisplay component for showing holiday information in forms
 */
'use client';

import React from 'react';
import { Box, Typography, Chip, CircularProgress, Badge } from '@mui/material';
import { DateTime } from 'luxon';
import { Holiday } from '@/types';

interface HolidayDisplayProps {
  holidays: any[];
  loading?: boolean;
  error?: string | null;
}

export const HolidayDisplay: React.FC<HolidayDisplayProps> = ({
  holidays,
  loading = false,
  error = null,
}) => {
  // Improve logging to debug holiday data
  if (holidays.length > 0) {
    console.log('[HolidayDisplay] Displaying holidays:', holidays.length);
    console.log('[HolidayDisplay] First holiday sample:', holidays[0]);
  } else {
    console.log('[HolidayDisplay] No holidays to display');
  }

  // Group holidays by type for display
  const bankHolidays = holidays.filter((h) => h.type === 'bank');
  const provincialHolidays = holidays.filter((h) => h.type === 'provincial');

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Holiday Status:
        {loading ? (
          <Box
            component="span"
            sx={{ display: 'inline-flex', alignItems: 'center', ml: 1 }}
          >
            <CircularProgress size={16} sx={{ mr: 0.5 }} />
            Loading...
          </Box>
        ) : (
          <Chip
            size="small"
            color={holidays.length > 0 ? 'success' : 'warning'}
            label={holidays.length > 0 ? 'Ready' : 'No holidays found'}
            sx={{ ml: 1 }}
          />
        )}
        {error && (
          <Chip color="error" size="small" label="Error" sx={{ ml: 1 }} />
        )}
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Available Holidays: {holidays.length}
      </Typography>

      {holidays.length > 0 && (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
          <Box
            sx={{
              width: '100%',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.5,
              mb: 1,
            }}
          >
            <Typography
              variant="caption"
              sx={{ width: '100%', fontWeight: 'bold' }}
            >
              Bank Holiday
            </Typography>
            {bankHolidays.length > 0 ? (
              bankHolidays.slice(0, 3).map((holiday, idx) => {
                const date =
                  typeof holiday.date === 'string'
                    ? DateTime.fromISO(holiday.date)
                    : DateTime.fromJSDate(holiday.date as Date);

                return (
                  <Chip
                    key={idx}
                    label={`${date.toFormat('MMM d')}: ${holiday.name}`}
                    size="small"
                    color="error"
                  />
                );
              })
            ) : (
              <Typography variant="body2" color="text.secondary">
                None
              </Typography>
            )}
            {bankHolidays.length > 3 && (
              <Chip
                label={`+${bankHolidays.length - 3} more`}
                size="small"
                variant="outlined"
                color="error"
              />
            )}
          </Box>

          <Box
            sx={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: 0.5 }}
          >
            <Typography
              variant="caption"
              sx={{ width: '100%', fontWeight: 'bold' }}
            >
              Provincial
            </Typography>
            {provincialHolidays.length > 0 ? (
              provincialHolidays.slice(0, 3).map((holiday, idx) => {
                const date =
                  typeof holiday.date === 'string'
                    ? DateTime.fromISO(holiday.date)
                    : DateTime.fromJSDate(holiday.date as Date);

                return (
                  <Chip
                    key={idx}
                    label={`${date.toFormat('MMM d')}: ${holiday.name}`}
                    size="small"
                    color="info"
                  />
                );
              })
            ) : (
              <Typography variant="body2" color="text.secondary">
                None
              </Typography>
            )}
            {provincialHolidays.length > 3 && (
              <Chip
                label={`+${provincialHolidays.length - 3} more`}
                size="small"
                variant="outlined"
                color="info"
              />
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default HolidayDisplay;

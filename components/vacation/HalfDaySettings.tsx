/**
 * Half-day vacation selection component
 * Enables users to select specific days as half days and choose AM/PM portions
 */
'use client';

import React, { useEffect } from 'react';
import {
  Box,
  FormControlLabel,
  Checkbox,
  FormHelperText,
  Typography,
  Radio,
  RadioGroup,
  Paper,
  Stack,
  Divider,
  Chip,
} from '@mui/material';
import { DateTime } from 'luxon';

export interface HalfDayOption {
  isHalfDay: boolean;
  portion: string;
}

export interface HalfDayData {
  isHalfDay: boolean;
  halfDayPortion: string;
  halfDayDate: DateTime | null;
  halfDayDates: Record<string, HalfDayOption>;
}

interface HalfDaySettingsProps {
  startDate: DateTime | null;
  endDate: DateTime | null;
  halfDayData: HalfDayData;
  onToggleHalfDay: (enabled: boolean) => void;
  onHalfDayPortionChange: (portion: string) => void;
  onToggleDateHalfDay: (dateKey: string) => void;
  onDatePortionChange: (dateKey: string, portion: string) => void;
  shouldDisableDate?: (date: DateTime) => boolean;
  simplified?: boolean; // Add simplified prop to support simpler UI in edit dialog
}

export function HalfDaySettings({
  startDate,
  endDate,
  halfDayData,
  onToggleHalfDay,
  onHalfDayPortionChange,
  onToggleDateHalfDay,
  onDatePortionChange,
  shouldDisableDate = () => false,
}: HalfDaySettingsProps) {
  const { isHalfDay, halfDayPortion, halfDayDate, halfDayDates } = halfDayData;
  
  // Generate the list of working days for half-day selection
  const getWorkingDays = (): DateTime[] => {
    if (!startDate || !endDate) {
      return [];
    }
    
    const workingDays = [];
    
    // Iterate through each day in the interval
    let currentDate = startDate.startOf('day');
    while (currentDate <= endDate) {
      if (!shouldDisableDate(currentDate)) {
        workingDays.push(currentDate);
      }
      currentDate = currentDate.plus({ days: 1 });
    }
    
    return workingDays;
  };
  
  // Use this to determine if multiple working days are selected
  const workingDays = getWorkingDays();
  const hasMultipleWorkingDays = workingDays.length > 1;
  const isSingleDay = startDate && endDate && startDate.hasSame(endDate, 'day');
  
  return (
    <Box sx={{ mt: 2 }}>
      <FormControlLabel
        control={
          <Checkbox
            checked={isHalfDay}
            onChange={(e) => onToggleHalfDay(e.target.checked)}
          />
        }
        label="Enable half-day vacation(s)"
      />
      
      {isHalfDay && (
        <Box sx={{ mt: 1, ml: 4 }}>
          {isSingleDay ? (
            <RadioGroup
              row
              value={halfDayPortion}
              onChange={(e) => onHalfDayPortionChange(e.target.value)}
            >
              <FormControlLabel value="AM" control={<Radio />} label="Morning (AM)" />
              <FormControlLabel value="PM" control={<Radio />} label="Afternoon (PM)" />
            </RadioGroup>
          ) : hasMultipleWorkingDays ? (
            <Stack spacing={2}>
              <Typography variant="subtitle2">
                Select which days will be half days:
              </Typography>
              
              <Paper variant="outlined" sx={{ p: 2 }}>
                {workingDays.map((day, index) => {
                  const dateKey = day.toISODate() || '';
                  const settings = halfDayDates[dateKey] || { isHalfDay: false, portion: 'AM' };
                  
                  return (
                    <Box key={dateKey} sx={{ mb: index < workingDays.length - 1 ? 2 : 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={settings.isHalfDay}
                              onChange={() => onToggleDateHalfDay(dateKey)}
                            />
                          }
                          label={day.toFormat('EEEE, MMM d, yyyy')}
                        />
                        
                        {settings.isHalfDay && (
                          <Chip 
                            label={settings.portion === 'AM' ? 'Morning' : 'Afternoon'} 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                          />
                        )}
                      </Box>
                      
                      {settings.isHalfDay && (
                        <RadioGroup
                          row
                          value={settings.portion}
                          onChange={(e) => onDatePortionChange(dateKey, e.target.value)}
                          sx={{ ml: 4, mb: 1 }}
                        >
                          <FormControlLabel value="AM" control={<Radio size="small" />} label="Morning (AM)" />
                          <FormControlLabel value="PM" control={<Radio size="small" />} label="Afternoon (PM)" />
                        </RadioGroup>
                      )}
                      
                      {index < workingDays.length - 1 && <Divider sx={{ my: 1 }} />}
                    </Box>
                  );
                })}
              </Paper>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No working days available for half-day selection.
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}

export default HalfDaySettings;
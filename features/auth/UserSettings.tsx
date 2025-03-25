'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  FormControl, 
  InputLabel, 
  Select,
  MenuItem,
  FormHelperText,
  CircularProgress
} from '@mui/material';

const CANADIAN_PROVINCES = [
  { value: 'AB', label: 'Alberta' },
  { value: 'BC', label: 'British Columbia' },
  { value: 'MB', label: 'Manitoba' },
  { value: 'NB', label: 'New Brunswick' },
  { value: 'NL', label: 'Newfoundland and Labrador' },
  { value: 'NS', label: 'Nova Scotia' },
  { value: 'NT', label: 'Northwest Territories' },
  { value: 'NU', label: 'Nunavut' },
  { value: 'ON', label: 'Ontario' },
  { value: 'PE', label: 'Prince Edward Island' },
  { value: 'QC', label: 'Quebec' },
  { value: 'SK', label: 'Saskatchewan' },
  { value: 'YT', label: 'Yukon' },
];

const EMPLOYMENT_TYPES = [
  { value: 'standard', label: 'Standard Employee' },
  { value: 'bank', label: 'Bank Staff' },
  { value: 'federal', label: 'Federal Employee' },
];

const WEEK_START_OPTIONS = [
  { value: 'sunday', label: 'Sunday' },
  { value: 'monday', label: 'Monday' },
];

export default function UserSettings() {
  const { data: session, update } = useSession();
  const router = useRouter();
  
  const [isSaving, setIsSaving] = useState(false);
  const [vacationDays, setVacationDays] = useState<number>(
    session?.user?.total_vacation_days || 14
  );
  const [province, setProvince] = useState<string>(
    session?.user?.province || 'ON'
  );
  const [employmentType, setEmploymentType] = useState<string>(
    session?.user?.employment_type || 'standard'
  );
  const [weekStartsOn, setWeekStartsOn] = useState<string>(
    session?.user?.week_starts_on || 'sunday'
  );

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          total_vacation_days: vacationDays,
          province,
          employment_type: employmentType,
          week_starts_on: weekStartsOn,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update settings');
      }
      
      // Update the session
      await update({
        ...session,
        user: {
          ...session?.user,
          total_vacation_days: vacationDays,
          province,
          employment_type: employmentType,
          week_starts_on: weekStartsOn,
        },
      });
      
      router.refresh();
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Your Settings
      </Typography>
      
      <form onSubmit={handleSaveSettings}>
        <Box sx={{ mb: 3 }}>
          <TextField
            id="vacationDays"
            label="Annual Vacation Days"
            type="number"
            fullWidth
            inputProps={{ min: 0, max: 365 }}
            value={vacationDays}
            onChange={(e) => setVacationDays(parseInt(e.target.value, 10))}
            margin="normal"
            size="small"
          />
        </Box>
        
        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth margin="normal" size="small">
            <InputLabel id="province-label">Province</InputLabel>
            <Select
              labelId="province-label"
              id="province"
              value={province}
              label="Province"
              onChange={(e) => setProvince(e.target.value)}
            >
              {CANADIAN_PROVINCES.map((prov) => (
                <MenuItem key={prov.value} value={prov.value}>
                  {prov.label}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              This determines which provincial holidays are displayed in your calendar.
            </FormHelperText>
          </FormControl>
        </Box>
        
        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth margin="normal" size="small">
            <InputLabel id="employment-type-label">Employment Type</InputLabel>
            <Select
              labelId="employment-type-label"
              id="employment-type"
              value={employmentType}
              label="Employment Type"
              onChange={(e) => setEmploymentType(e.target.value)}
            >
              {EMPLOYMENT_TYPES.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              Your employment type affects which holidays are applicable to you.
            </FormHelperText>
          </FormControl>
        </Box>
        
        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth margin="normal" size="small">
            <InputLabel id="week-start-label">Week Starts On</InputLabel>
            <Select
              labelId="week-start-label"
              id="week-start"
              value={weekStartsOn}
              label="Week Starts On"
              onChange={(e) => setWeekStartsOn(e.target.value)}
            >
              {WEEK_START_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              Set which day your calendar week should start with.
            </FormHelperText>
          </FormControl>
        </Box>
        
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          disabled={isSaving}
          sx={{ mt: 2 }}
        >
          {isSaving ? (
            <>
              <CircularProgress size={24} sx={{ mr: 1 }} /> 
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </Button>
      </form>
    </Box>
  );
} 
'use client';

import { useState, useEffect } from 'react';
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
  CircularProgress,
  Snackbar,
  Alert,
  Divider,
  Paper,
} from '@mui/material';
import { useSession } from '@/lib/auth-helpers';
import type { Session, User } from '@/types/auth';
import { createBrowserSupabaseClient } from '@/utils/supabase';
import GoogleCalendarSync from '@/features/calendar/GoogleCalendarSync';

// Define the extended user interface to match our custom fields
interface ExtendedUser extends User {
  // Make id required to match the Session.user.id requirement
  id: string;
  total_vacation_days?: number;
  province?: string;
  employment_type?: string;
  week_starts_on?: string;
  calendar_sync_enabled?: boolean;
}

// Define the extended session interface that includes our custom user fields
interface ExtendedSession extends Session {
  user: ExtendedUser & {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

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
  const { data: sessionData, status: sessionStatus } = useSession();
  // Cast the session to our extended type to access custom fields
  const session = sessionData as ExtendedSession | null;
  const router = useRouter();
  
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);  // New state to track if data has been loaded
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [vacationDays, setVacationDays] = useState<number | null>(null);
  const [province, setProvince] = useState<string>('ON');
  const [employmentType, setEmploymentType] = useState<string>('standard');
  const [weekStartsOn, setWeekStartsOn] = useState<string>('sunday');
  const [calendarSyncEnabled, setCalendarSyncEnabled] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  
  // Fetch user data including calendar sync settings
  useEffect(() => {
    async function fetchUserData() {
      if (sessionStatus !== 'authenticated' || !session?.user?.id) {
        setIsLoading(false);
        return;
      }
      
      // Only show loading state if data hasn't been loaded yet
      if (!dataLoaded) {
        setIsLoading(true);
      }
      
      try {
        const response = await fetch('/api/user');
        
        if (response.ok) {
          const userData = await response.json();
          console.log('Fetched user data:', userData);
          
          // Update state with fetched user data - don't use OR fallback to ensure 0 is respected
          setVacationDays(userData.total_vacation_days !== undefined ? userData.total_vacation_days : 2);
          setProvince(userData.province || 'ON');
          setEmploymentType(userData.employment_type || 'standard');
          setWeekStartsOn(userData.week_starts_on || 'sunday');
          setCalendarSyncEnabled(!!userData.calendar_sync_enabled);
          setDataLoaded(true);  // Mark data as loaded
        } else {
          console.error('Error fetching user data:', response.status, response.statusText);
          // Fall back to session data if API fails
          if (session?.user) {
            // Don't use OR fallback to ensure 0 is respected
            setVacationDays(session.user.total_vacation_days !== undefined ? session.user.total_vacation_days : 2);
            setProvince(session.user.province || 'ON');
            setEmploymentType(session.user.employment_type || 'standard');
            setWeekStartsOn(session.user.week_starts_on || 'sunday');
            setCalendarSyncEnabled(!!session.user.calendar_sync_enabled);
            setDataLoaded(true);  // Mark data as loaded
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchUserData();
  }, [session?.user?.id, sessionStatus, refreshKey]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    
    try {
      // Create Supabase client for updating user metadata
      const supabase = createBrowserSupabaseClient();
      
      // Update user metadata in Supabase
      const { error } = await supabase.auth.updateUser({
        data: {
          total_vacation_days: vacationDays,
          province,
          employment_type: employmentType,
          week_starts_on: weekStartsOn,
          calendar_sync_enabled: calendarSyncEnabled,
        },
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      // Also update in our app's database if needed
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
          calendar_sync_enabled: calendarSyncEnabled,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update settings in the database');
      }
      
      setSuccessMessage('Settings updated successfully');
      // Force a refresh of the component data by updating refreshKey instead of using router.refresh()
      setRefreshKey((prevKey) => prevKey + 1);
    } catch (error) {
      console.error('Error saving settings:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleCalendarSync = (enabled: boolean) => {
    setCalendarSyncEnabled(enabled);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Your Settings
      </Typography>
      
      {(isLoading || vacationDays === null) ? (
        <Box display="flex" justifyContent="center" alignItems="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <form onSubmit={handleSaveSettings}>
            <Box sx={{ mb: 3 }}>
              <TextField
                id="vacationDays"
                label="Annual Vacation Days"
                type="number"
                fullWidth
                inputProps={{ min: 0, max: 365 }}
                value={vacationDays === null ? '' : vacationDays} 
                onChange={(e) => setVacationDays(parseInt(e.target.value, 10) || 0)}
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
              sx={{ mt: 2, mb: 4 }}
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
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h6" gutterBottom>
            Calendar Integration
          </Typography>
          
          <Box mb={3}>
            <Paper elevation={1}>
              <GoogleCalendarSync 
                enabled={calendarSyncEnabled} 
                onToggle={handleToggleCalendarSync} 
              />
            </Paper>
          </Box>
        </>
      )}
      
      <Snackbar 
        open={!!successMessage} 
        autoHideDuration={6000} 
        onClose={() => setSuccessMessage(null)}
      >
        <Alert severity="success" onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      </Snackbar>
      
      <Snackbar 
        open={!!errorMessage} 
        autoHideDuration={6000} 
        onClose={() => setErrorMessage(null)}
      >
        <Alert severity="error" onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
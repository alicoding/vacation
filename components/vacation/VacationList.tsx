

/**
 * VacationList Component
 *
 * This component renders a list of vacation bookings, allowing users to view details such as date ranges,
 * notes, total days, and business days. It also provides functionality to delete vacation bookings.
 *
 * @param {VacationListProps} props - The props object containing vacation data, holiday information, and province.
 * @returns {React.ReactNode} A React component displaying the list of vacations.
 */
'use client';

import React, { useState } from 'react';
import { 
  Paper, 
  Typography, 
  List, 
  ListItem, 
  Divider, 
  Chip, 
  IconButton, 
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { DateTime, Interval } from 'luxon';
import { VacationBooking } from '@/services/vacation/vacationTypes';
import { useRouter } from 'next/navigation';

// Enhanced vacation type that includes both camelCase and snake_case properties
// as well as our calculated fields
interface EnhancedVacation extends Partial<VacationBooking> {
  id?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  start_date?: Date | string;
  end_date?: Date | string;
  note?: string | null;
  createdAt?: Date;
  created_at?: Date | string;
  totalDays?: number;
  businessDays?: number;
  formattedStartDate?: string;
  formattedEndDate?: string;
}

interface VacationListProps {
  vacations: (VacationBooking | any)[];
  holidays: Array<{
    date: Date;
    name: string;
    province: string | null;
    type: 'bank' | 'provincial';
  }>;
  province: string;
}

export default function VacationList({ vacations, holidays, province }: VacationListProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vacationToDelete, setVacationToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Function to calculate business days (excluding weekends and holidays)
  const calculateBusinessDays = (startDate: Date | string, endDate: Date | string) => {
    if (!startDate || !endDate) return 0;
    
    try {
      // Convert to DateTime objects safely
      const start = startDate instanceof Date ? 
        DateTime.fromJSDate(startDate) : 
        DateTime.fromISO(startDate.toString());
        
      const end = endDate instanceof Date ? 
        DateTime.fromJSDate(endDate) : 
        DateTime.fromISO(endDate.toString());
      
      if (!start.isValid || !end.isValid) {
        console.error('Invalid date in calculateBusinessDays', { startDate, endDate });
        return 0;
      }
      
      let count = 0;
      let current = start.startOf('day');
      const lastDay = end.startOf('day');
      
      // Get holiday dates for comparison
      const holidayDates = holidays.map(h => 
        DateTime.fromJSDate(h.date).toISODate()
      );
      
      while (current <= lastDay) {
        if (![6, 7].includes(current.weekday)) { // Not a weekend
          // Check if it's a holiday
          if (!holidayDates.includes(current.toISODate())) {
            count++;
          }
        }
        current = current.plus({ days: 1 });
      }
      
      return count;
    } catch (error) {
      console.error('Error calculating business days:', error, { startDate, endDate });
      return 0;
    }
  };
  
  const formatDateRange = (startDate: Date | string, endDate: Date | string) => {
    // Check if dates are valid before proceeding
    if (!startDate || !endDate) {
      return 'Invalid date range';
    }
    
    try {
      // Convert to DateTime objects safely
      const start = startDate instanceof Date ? 
        DateTime.fromJSDate(startDate) : 
        DateTime.fromISO(startDate.toString());
        
      const end = endDate instanceof Date ? 
        DateTime.fromJSDate(endDate) : 
        DateTime.fromISO(endDate.toString());
      
      // Validate that the dates are properly parsed
      if (!start.isValid || !end.isValid) {
        console.error('Invalid date in formatDateRange', { startDate, endDate });
        return 'Invalid date range';
      }
      
      // If same day, return single date
      if (start.hasSame(end, 'day')) {
        return start.toFormat('MMMM d, yyyy');
      }
      
      // If same month and year, return range with single month/year
      if (start.hasSame(end, 'month') && start.hasSame(end, 'year')) {
        return `${start.toFormat('MMMM d')} - ${end.toFormat('d, yyyy')}`;
      }
      
      // Otherwise, return full date range
      return `${start.toFormat('MMM d, yyyy')} - ${end.toFormat('MMM d, yyyy')}`;
    } catch (error) {
      console.error('Error formatting date range:', error, { startDate, endDate });
      return 'Invalid date range';
    }
  };

  // Open confirmation dialog before deleting
  const confirmDelete = (id: string) => {
    setVacationToDelete(id);
    setDeleteDialogOpen(true);
  };
  
  // Function to delete a vacation
  const handleDelete = async () => {
    if (!vacationToDelete) return;
    
    setIsDeleting(true);
    setErrorMessage(null);
    
    try {
      const response = await fetch(`/api/vacations/${vacationToDelete}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setSuccessMessage('Vacation deleted successfully');
        
        // Close the dialog and reset state
        setDeleteDialogOpen(false);
        setVacationToDelete(null);
        
        // Refresh the page to update the list
        router.refresh();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete vacation');
      }
    } catch (error) {
      console.error('Error deleting vacation:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete vacation');
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Close the dialog without deleting
  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setVacationToDelete(null);
  };
  
  // Handle closing the snackbar
  const handleCloseSnackbar = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };
  
  // Calculate total and business days for each vacation
  const vacationsWithDetails: EnhancedVacation[] = vacations.map(vacation => {
    try {
      // Safely parse dates by checking the type
      const startDateValue = vacation.startDate || vacation.start_date;
      const endDateValue = vacation.endDate || vacation.end_date;
      
      // Safely convert to DateTime objects
      const start = typeof startDateValue === 'string' ? 
        DateTime.fromISO(startDateValue) : 
        DateTime.fromJSDate(startDateValue as Date);
        
      const end = typeof endDateValue === 'string' ? 
        DateTime.fromISO(endDateValue) : 
        DateTime.fromJSDate(endDateValue as Date);
      
      // Validate that the dates are properly parsed
      if (!start.isValid || !end.isValid) {
        console.error('Invalid date in vacationsWithDetails', { startDateValue, endDateValue });
        return {
          ...vacation,
          totalDays: 0,
          businessDays: 0
        };
      }
      
      // Calculate total days (including weekends and holidays)
      const totalDays = Interval.fromDateTimes(
        start,
        end.plus({ days: 1 })
      ).length('days');
      
      // Calculate business days (excluding weekends and holidays)
      const businessDays = calculateBusinessDays(startDateValue, endDateValue);
      
      return {
        ...vacation,
        totalDays,
        businessDays,
        // Add formatted dates for display
        formattedStartDate: start.toFormat('LLL d, yyyy'),
        formattedEndDate: end.toFormat('LLL d, yyyy')
      };
    } catch (error) {
      console.error('Error calculating vacation details:', error, vacation);
      return {
        ...vacation,
        totalDays: 0,
        businessDays: 0,
        formattedStartDate: 'Invalid date',
        formattedEndDate: 'Invalid date'
      };
    }
  });
  
  // Sort vacations by start date (most recent first)
  const sortedVacations = [...vacationsWithDetails].sort((a, b) => {
    try {
      // Try to compare dates safely
      const aDate = new Date(a.startDate || a.start_date || 0);
      const bDate = new Date(b.startDate || b.start_date || 0);
      return bDate.getTime() - aDate.getTime();
    } catch (error) {
      console.error('Error sorting vacations:', error);
      return 0;
    }
  });
  
  return (
    <div>
      {sortedVacations.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          <Typography variant="body1" gutterBottom>
            You haven't booked any vacations yet.
          </Typography>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => router.push('/dashboard/request')}
            sx={{ mt: 2 }}
          >
            Book Your First Vacation
          </Button>
        </div>
      ) : (
        <List>
          {sortedVacations.map((vacation, index) => (
            <React.Fragment key={vacation.id}>
              <ListItem alignItems="flex-start" sx={{ flexDirection: 'column', py: 2 }}>
                <div className="w-full flex justify-between items-start">
                  <div>
                    <Typography variant="subtitle1" component="div" sx={{ fontWeight: 'medium' }}>
                      {formatDateRange(
                        vacation.startDate || vacation.start_date || '', 
                        vacation.endDate || vacation.end_date || ''
                      )}
                    </Typography>
                    
                    {vacation.note && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {vacation.note}
                      </Typography>
                    )}
                    
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Chip 
                        size="small" 
                        label={`${vacation.totalDays || 0} total days`} 
                        variant="outlined"
                      />
                      {(vacation.businessDays || 0) > 0 && (
                        <Chip 
                          size="small" 
                          label={`${vacation.businessDays || 0} working days`} 
                          color="primary"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </div>
                  
                  <IconButton 
                    edge="end" 
                    aria-label="delete" 
                    onClick={() => confirmDelete(vacation.id as string)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </div>
              </ListItem>
              {index < sortedVacations.length - 1 && <Divider component="li" />}
            </React.Fragment>
          ))}
        </List>
      )}
      
      {/* Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Vacation
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete this vacation? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} disabled={isDeleting}>
            Cancel
          </Button>
          <Button 
            onClick={handleDelete} 
            color="error" 
            variant="contained" 
            disabled={isDeleting}
            autoFocus
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Error Snackbar */}
      <Snackbar 
        open={!!errorMessage} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="error" variant="filled">
          {errorMessage}
        </Alert>
      </Snackbar>
      
      {/* Success Snackbar */}
      <Snackbar 
        open={!!successMessage} 
        autoHideDuration={3000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" variant="filled">
          {successMessage}
        </Alert>
      </Snackbar>
    </div>
  );
}
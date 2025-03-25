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
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { DateTime, Interval } from 'luxon';
import { VacationBooking } from '@/services/vacation/vacationTypes';
import { useRouter } from 'next/navigation';
import VacationSummary from '@/components/vacation/VacationSummary';

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
  isHalfDay?: boolean;
  halfDayPortion?: string | null;
  is_half_day?: boolean;
  half_day_portion?: string | null;
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
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
      
      // If different months but same year
      if (start.hasSame(end, 'year')) {
        return `${start.toFormat('MMM d')} - ${end.toFormat('MMM d, yyyy')}`;
      }
      
      // Different years
      return `${start.toFormat('MMM d, yyyy')} - ${end.toFormat('MMM d, yyyy')}`;
    } catch (error) {
      console.error('Error formatting date range:', error, { startDate, endDate });
      return 'Invalid date range';
    }
  };
  
  const confirmDelete = (id: string) => {
    setVacationToDelete(id);
    setDeleteDialogOpen(true);
  };
  
  const handleDelete = async () => {
    if (!vacationToDelete) return;
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/vacations/${vacationToDelete}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete vacation booking');
      }
      
      // Close dialog and show success message
      setDeleteDialogOpen(false);
      setSuccessMessage('Vacation deleted successfully');
      
      // Refresh the page to update the list
      router.refresh();
    } catch (error) {
      console.error('Error deleting vacation:', error);
      setErrorMessage('Failed to delete vacation. Please try again.');
    } finally {
      setIsDeleting(false);
      setVacationToDelete(null);
    }
  };
  
  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setVacationToDelete(null);
  };
  
  const handleCloseSnackbar = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };
  
  const handleAccordionChange = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
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
  
  // Sort vacations by date (most recent first)
  const sortedVacations = [...vacationsWithDetails].sort((a, b) => {
    const aStart = a.startDate || a.start_date;
    const bStart = b.startDate || b.start_date;
    
    if (!aStart) return 1;
    if (!bStart) return -1;
    
    // Convert to DateTime for comparison
    const aDateTime = aStart instanceof Date ? 
      DateTime.fromJSDate(aStart) : 
      DateTime.fromISO(aStart.toString());
      
    const bDateTime = bStart instanceof Date ? 
      DateTime.fromJSDate(bStart) : 
      DateTime.fromISO(bStart.toString());
    
    // Sort descending (newest first)
    return bDateTime.toMillis() - aDateTime.toMillis();
  });
  
  return (
    <>
      {sortedVacations.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            You haven't booked any vacations yet.
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Use the form to book your first vacation!
          </Typography>
        </Paper>
      ) : (
        <List>
          {sortedVacations.map((vacation, index) => {
            const startDate = vacation.startDate || vacation.start_date;
            const endDate = vacation.endDate || vacation.end_date;
            
            return (
              <React.Fragment key={vacation.id}>
                <Accordion 
                  expanded={expandedId === vacation.id} 
                  onChange={() => handleAccordionChange(vacation.id || '')}
                  sx={{ 
                    boxShadow: 'none', 
                    '&:before': { display: 'none' },
                    border: expandedId === vacation.id ? '1px solid rgba(0, 0, 0, 0.12)' : 'none',
                    my: 1
                  }}
                >
                  <AccordionSummary 
                    expandIcon={<ExpandMoreIcon />}
                    sx={{ px: 2 }}
                  >
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
                          {vacation.isHalfDay && (
                            <Chip 
                              size="small" 
                              label="Half-day" 
                              color="secondary"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </div>
                      
                      <IconButton 
                        edge="end" 
                        aria-label="delete" 
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDelete(vacation.id as string);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </div>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0 }}>
                    <Divider sx={{ mb: 2 }} />
                    <VacationSummary 
                      startDate={startDate || null}
                      endDate={endDate || null}
                      isHalfDay={vacation.isHalfDay}
                      holidays={holidays}
                    />
                  </AccordionDetails>
                </Accordion>
                {!expandedId && index < sortedVacations.length - 1 && <Divider component="li" />}
              </React.Fragment>
            );
          })}
        </List>
      )}
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCancelDelete}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this vacation booking? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} disabled={isDeleting}>
            Cancel
          </Button>
          <Button 
            onClick={handleDelete} 
            color="error" 
            disabled={isDeleting} 
            variant="contained"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbars for success/error messages */}
      <Snackbar open={!!errorMessage} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity="error" variant="filled">
          {errorMessage}
        </Alert>
      </Snackbar>
      
      <Snackbar open={!!successMessage} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity="success" variant="filled">
          {successMessage}
        </Alert>
      </Snackbar>
    </>
  );
}
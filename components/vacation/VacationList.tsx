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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { DateTime } from 'luxon';
import { useRouter } from 'next/navigation';
import VacationEditDialog from './VacationEditDialog';

interface Vacation {
  id: string;
  start_date: string;
  end_date: string;
  note?: string;
  is_half_day?: boolean;
  half_day_portion?: string;
  user_id: string;
  created_at: string;
  google_event_id?: string;
}

// Helper function to calculate duration
function calculateDuration(start: string, end: string) {
  const startDate = DateTime.fromISO(start);
  const endDate = DateTime.fromISO(end);
  const diff = endDate.diff(startDate, 'days').days + 1;
  return `${diff} ${diff === 1 ? 'day' : 'days'}`;
}

// Helper function to determine status text
function getStatusText(vacation: Vacation) {
  const now = DateTime.now();
  const startDate = DateTime.fromISO(vacation.start_date);
  const endDate = DateTime.fromISO(vacation.end_date);

  if (endDate < now) {
    return 'Completed';
  } else if (startDate <= now && endDate >= now) {
    return 'In Progress';
  } else {
    return 'Upcoming';
  }
}

export default function VacationList({ vacations }: { vacations: Vacation[] }) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vacationToDelete, setVacationToDelete] = useState<Vacation | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [vacationToEdit, setVacationToEdit] = useState<Vacation | null>(null);
  const router = useRouter();

  // Delete vacation handlers
  const handleDeleteClick = (vacation: Vacation) => {
    setVacationToDelete(vacation);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!vacationToDelete) return;

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/vacations/${vacationToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include', // Include credentials to send cookies with the request
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete vacation');
      }

      // Close dialog and refresh data
      setDeleteDialogOpen(false);
      router.refresh();
    } catch (error) {
      console.error('Error deleting vacation:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'An unknown error occurred',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseDialog = () => {
    setDeleteDialogOpen(false);
    setVacationToDelete(null);
    setErrorMessage(null);
  };

  // Edit vacation handlers
  const handleEditClick = (vacation: Vacation) => {
    setVacationToEdit(vacation);
    setEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    router.refresh();
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setVacationToEdit(null);
  };

  return (
    <>
      <TableContainer component={Paper} variant="outlined">
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell>Start Date</TableCell>
              <TableCell>End Date</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Note</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {vacations.length > 0 ? (
              vacations.map((vacation) => (
                <TableRow key={vacation.id} hover>
                  <TableCell>
                    {DateTime.fromISO(vacation.start_date).toFormat(
                      'MMM d, yyyy',
                    )}
                  </TableCell>
                  <TableCell>
                    {DateTime.fromISO(vacation.end_date).toFormat(
                      'MMM d, yyyy',
                    )}
                  </TableCell>
                  <TableCell>
                    {calculateDuration(vacation.start_date, vacation.end_date)}
                    {vacation.is_half_day && (
                      <Typography
                        variant="caption"
                        display="block"
                        color="text.secondary"
                      >
                        (Half-day {vacation.half_day_portion})
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{vacation.note || '-'}</TableCell>
                  <TableCell>{getStatusText(vacation)}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleEditClick(vacation)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteClick(vacation)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    No vacation bookings found
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1 }}
                  >
                    {'Click "Request Vacation" to create your first booking'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Confirm Vacation Cancellation
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to cancel your vacation from{' '}
            {vacationToDelete &&
              DateTime.fromISO(vacationToDelete.start_date).toFormat(
                'MMM d, yyyy',
              )}{' '}
            to{' '}
            {vacationToDelete &&
              DateTime.fromISO(vacationToDelete.end_date).toFormat(
                'MMM d, yyyy',
              )}
            ?
            {vacationToDelete?.google_event_id && (
              <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                This will also remove the event from your Google Calendar.
              </Typography>
            )}
          </DialogContentText>
          {errorMessage && (
            <Typography color="error" variant="body2" sx={{ mt: 2 }}>
              {errorMessage}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleDeleteConfirm()}
            color="error"
            variant="contained"
            disabled={isDeleting}
            startIcon={
              isDeleting ? <CircularProgress size={20} color="inherit" /> : null
            }
          >
            {isDeleting ? 'Deleting...' : 'Delete Vacation'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Vacation Dialog */}
      <VacationEditDialog
        open={editDialogOpen}
        onClose={handleCloseEditDialog}
        vacation={vacationToEdit}
        onSuccess={handleEditSuccess}
      />
    </>
  );
}

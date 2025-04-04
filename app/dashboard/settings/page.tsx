export const runtime = 'edge';
import React from 'react';
import { getServerSession } from '@/lib/auth-helpers.server';
import { Box, Container, Typography, Paper } from '@mui/material';
import UserSettings from '@/features/auth/UserSettings';

export default async function SettingsPage() {
  // Middleware ensures we have a session, so we don't need the redirect check
  const session = await getServerSession();

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Account Settings
        </Typography>

        <Paper sx={{ p: 3, mt: 3 }}>
          <UserSettings />
        </Paper>
      </Box>
    </Container>
  );
}

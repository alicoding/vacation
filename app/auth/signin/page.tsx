'use client';

export const runtime = 'edge';

import { useState, useEffect, Suspense } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { useAuth } from '@/components/auth/AuthProvider';
import { useRouter, useSearchParams } from 'next/navigation';

function SignInContent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInWithGoogle, session } = useAuth();

  // Get the callback URL from the query parameters
  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard';

  // Check for error parameters
  useEffect(() => {
    const errorParam = searchParams?.get('error');
    if (errorParam) {
      if (errorParam === 'auth_callback_error') {
        setError('Authentication failed. Please try again.');
      } else if (errorParam === 'unknown') {
        setError('An unknown error occurred. Please try again.');
      } else {
        setError(`Error: ${errorParam}`);
      }
    }
  }, [searchParams]);

  // Redirect if already signed in
  useEffect(() => {
    if (session) {
      router.push(callbackUrl);
    }
  }, [session, router, callbackUrl]);

  const handleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);

      // Pass the callback URL to the sign-in function
      await signInWithGoogle(callbackUrl);

      // The actual redirect will be handled by the auth callback
    } catch (err) {
      console.error('Error signing in with Google:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign in');
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          mt: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 450 }}>
          <Typography variant="h4" component="h1" align="center" gutterBottom>
            Sign In
          </Typography>

          <Typography
            variant="body1"
            color="text.secondary"
            align="center"
            sx={{ mb: 4 }}
          >
            Sign in to your Vacation Tracker account using your Google account.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Button
            fullWidth
            variant="contained"
            color="primary"
            size="large"
            startIcon={
              loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                <GoogleIcon />
              )
            }
            onClick={() => {
              void handleSignIn();
            }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in with Google'}
          </Button>
        </Paper>
      </Box>
    </Container>
  );
}

// Fallback component to show while the main content is loading
function SignInFallback() {
  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          mt: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: '100%',
            maxWidth: 450,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <CircularProgress />
        </Paper>
      </Box>
    </Container>
  );
}

export default function SignIn() {
  return (
    <Suspense fallback={<SignInFallback />}>
      <SignInContent />
    </Suspense>
  );
}

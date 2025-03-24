'use client';

import { signIn } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Container, 
  Typography, 
  Paper,
  Alert,
  CircularProgress
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { useSearchParams } from 'next/navigation';

export default function SignIn() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();

  // Set mounted state to true on client-side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check for error from callback
  useEffect(() => {
    if (!mounted) return;
    
    const errorType = searchParams?.get('error');
    if (errorType) {
      switch(errorType) {
        case 'OAuthSignin':
        case 'OAuthCallback':
        case 'OAuthCreateAccount':
        case 'EmailCreateAccount':
        case 'Callback':
          setError('There was a problem with the OAuth authentication. Please try again.');
          break;
        case 'OAuthAccountNotLinked':
          setError('This email is already associated with another account.');
          break;
        case 'EmailSignin':
          setError('The email signin link is invalid or has expired.');
          break;
        case 'CredentialsSignin':
          setError('The credentials you provided are invalid.');
          break;
        case 'SessionRequired':
          setError('Please sign in to access this page.');
          break;
        default:
          setError('An unexpected error occurred. Please try again.');
          break;
      }
    }
  }, [searchParams, mounted]);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Use absolute URL for callbackUrl
      const callbackUrl = `${window.location.origin}/dashboard`;
      
      await signIn('google', {
        callbackUrl,
        redirect: true
      });
    } catch (error) {
      console.error('Authentication error:', error);
      setError('Failed to authenticate with Google. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Return empty div until client-side hydration is complete
  if (!mounted) {
    return <Box sx={{ minHeight: '100vh' }} />;
  }

  return (
    <Box 
      sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2
      }}
    >
      <Container maxWidth="sm">
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center' 
          }}
        >
          <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
            Vacation Tracker
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
            Sign in to track your vacation days
          </Typography>
          
          {error && (
            <Alert 
              severity="error" 
              sx={{ width: '100%', mb: 3 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}
          
          <Button
            variant="outlined"
            fullWidth
            startIcon={isLoading ? <CircularProgress size={20} /> : <GoogleIcon />}
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            sx={{ 
              py: 1.5, 
              borderColor: 'divider',
              '&:hover': {
                bgcolor: 'action.hover',
              }
            }}
          >
            {isLoading ? 'Signing in...' : 'Sign in with Google'}
          </Button>
        </Paper>
      </Container>
    </Box>
  );
} 
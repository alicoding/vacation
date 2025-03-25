'use client';

import { signIn } from 'next-auth/react';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { 
  Box, 
  Button, 
  Container, 
  Typography, 
  Paper,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { useSearchParams } from 'next/navigation';
import GoogleOneTap from '@/features/auth/GoogleOneTap';

function SignInContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    console.log("SignIn: Component mounted");
    setMounted(true);
    
    // After 5 seconds, show the fallback button if One Tap hasn't worked
    const timer = setTimeout(() => {
      console.log("SignIn: Showing fallback button after timeout");
      setShowFallback(true);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []);

  // Check for error from callback
  useEffect(() => {
    if (!mounted) return;
    
    const errorType = searchParams?.get('error');
    if (errorType) {
      console.log(`SignIn: Error detected in URL params: ${errorType}`);
      switch(errorType) {
        case 'OAuthSignin':
        case 'OAuthCallback':
        case 'OAuthCreateAccount':
        case 'EmailCreateAccount':
        case 'Callback':
          setError('There was a problem with the OAuth authentication. Please try again.');
          setShowFallback(true);
          break;
        case 'OAuthAccountNotLinked':
          setError('This email is already associated with another account.');
          setShowFallback(true);
          break;
        case 'EmailSignin':
          setError('The email signin link is invalid or has expired.');
          setShowFallback(true);
          break;
        case 'CredentialsSignin':
          setError('The credentials you provided are invalid.');
          setShowFallback(true);
          break;
        case 'SessionRequired':
          setError('Please sign in to access this page.');
          setShowFallback(true);
          break;
        default:
          setError('An unexpected error occurred. Please try again.');
          setShowFallback(true);
          break;
      }
    }
  }, [searchParams, mounted]);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log("SignIn: Traditional Google sign-in initiated");
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

  const handleOneTapSuccess = useCallback(() => {
    console.log("SignIn: One Tap authentication successful");
  }, []);

  const handleOneTapError = useCallback((errorMessage: string) => {
    console.log(`SignIn: One Tap error: ${errorMessage}`);
    setError(errorMessage);
    setShowFallback(true);
  }, []);

  // Return empty div until client-side hydration is complete
  if (!mounted) {
    return <Box sx={{ minHeight: '100vh' }} />;
  }

  console.log("SignIn: Rendering sign-in page, showFallback:", showFallback);

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
          
          {/* Google One Tap Integration (invisible) */}
          <div id="google-one-tap-container" data-testid="google-one-tap-container">
            <GoogleOneTap onSuccess={handleOneTapSuccess} onError={handleOneTapError} />
          </div>
          
          {showFallback && (
            <>
              {showFallback && !error && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Automatic sign-in didn't work. Please use the button below.
                </Typography>
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
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInContent />
    </Suspense>
  );
} 
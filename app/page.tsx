'use client';

import { useEffect, useState } from 'react';
import { Box, Container, Typography, Button, CircularProgress } from '@mui/material';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { useRouter } from 'next/navigation';

function HomePageContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);
  
  // Redirect to dashboard if user is already authenticated
  useEffect(() => {
    // Only proceed with redirect if auth state is confirmed and user is authenticated
    if (!isLoading && isAuthenticated) {
      setRedirecting(true);
      // Use window.location for a hard redirect to avoid state issues
      window.location.href = '/dashboard';
    }
  }, [isAuthenticated, isLoading, router]);
  
  // Show loading indicator while checking authentication or during redirect
  if (isLoading || redirecting) {
    return (
      <Container maxWidth="md">
        <Box 
          sx={{ 
            mt: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '50vh',
          }}
        >
          <CircularProgress size={40} />
          <Typography variant="body1" sx={{ mt: 2 }}>
            {isLoading ? 'Checking authentication status...' : 'Redirecting to dashboard...'}
          </Typography>
        </Box>
      </Container>
    );
  }
  
  // If not authenticated, show the landing page
  return (
    <Container maxWidth="md">
      <Box 
        sx={{ 
          mt: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Typography variant="h2" component="h1" gutterBottom>
          Vacation Tracker
        </Typography>
        
        <Typography variant="h5" color="text.secondary" component="p">
          Track your vacation days, view holidays, and plan your time off efficiently.
        </Typography>
        
        <Box sx={{ mt: 4 }}>
          <Button 
            component={Link} 
            href="/auth/signin"
            variant="contained" 
            size="large"
          >
            Get Started
          </Button>
        </Box>
      </Box>
    </Container>
  );
}

// Export the client component
export default function Home() {
  return <HomePageContent />;
}
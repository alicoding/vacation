import { Box, Container, Typography, Button } from '@mui/material';
import Link from 'next/link';

// Root page - middleware will handle redirects automatically
export default function Home() {
  return (
    <Container maxWidth="md">
      <Box 
        sx={{ 
          mt: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
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
import { createTheme } from '@mui/material/styles';

// Create a theme instance updated for MUI v6
const theme = createTheme({
  // MUI v6 now uses colorSchemes instead of palette for light/dark modes
  colorSchemes: {
    light: {
      palette: {
        primary: {
          main: '#0284c7',
          light: '#38bdf8',
          dark: '#0369a1',
        },
        secondary: {
          main: '#6b7280',
          light: '#9ca3af',
          dark: '#4b5563',
        },
        background: {
          default: '#f9fafb',
          paper: '#ffffff',
        },
        error: {
          main: '#ef4444',
        },
        warning: {
          main: '#f97316',
        },
        info: {
          main: '#3b82f6',
        },
        success: {
          main: '#10b981',
        },
      },
    },
  },
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: '0.375rem',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '0.375rem',
          },
        },
      },
    },
  },
});

export default theme;

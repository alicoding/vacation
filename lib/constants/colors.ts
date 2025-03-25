/**
 * Shared color constants for consistent styling across the application
 */

// Calendar day colors
export const CALENDAR_COLORS = {
  // Vacation colors
  VACATION: {
    FULL_DAY: 'rgba(76, 175, 80, 0.15)', // Light green
    HALF_DAY: 'rgba(76, 175, 80, 0.1)', // Lighter green
    TEXT: '#2e7d32' // Dark green
  },
  
  // Holiday colors
  HOLIDAY: {
    BANK: 'rgba(255, 152, 0, 0.15)', // Light amber/orange
    PROVINCIAL: 'rgba(255, 152, 0, 0.1)', // Lighter amber/orange
    TEXT: '#ed6c02' // Dark orange
  },
  
  // Today highlight
  TODAY: {
    BACKGROUND: 'rgba(25, 118, 210, 0.15)', // Light blue
    TEXT: '#1976d2' // Dark blue
  },
  
  // Selected day
  SELECTED: {
    BACKGROUND: 'rgba(25, 118, 210, 0.25)', // Medium blue
    TEXT: '#ffffff' // White
  },
  
  // Disabled day (weekends, etc)
  DISABLED: {
    BACKGROUND: 'rgba(0, 0, 0, 0.05)', // Light gray
    TEXT: '#bdbdbd' // Light gray
  },
  
  // Other month days
  OTHER_MONTH: {
    TEXT: 'rgba(0, 0, 0, 0.4)' // Faded text
  }
};

// Border radius for circular calendar days
export const CALENDAR_DAY_BORDER_RADIUS = '50%'; 
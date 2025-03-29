'use client';

import { Box, Typography } from '@mui/material';

interface LegendItemProps {
  color: string;
  label: string;
}

const LegendItem = ({ color, label }: LegendItemProps) => (
  <Box display="flex" alignItems="center" gap={1}>
    <Box 
      sx={{ 
        width: 16, 
        height: 16, 
        backgroundColor: color, 
        borderRadius: '50%', 
      }} 
    />
    <Typography variant="body2">{label}</Typography>
  </Box>
);

export default function CalendarLegend() {
  return (
    <Box mt={4} display="flex" gap={2} flexWrap="wrap">
      <LegendItem color="success.light" label="Vacation" />
      <LegendItem color="warning.light" label="Holiday" />
      <LegendItem color="grey.100" label="Weekend" />
      <LegendItem color="primary.light" label="Today" />
    </Box>
  );
} 
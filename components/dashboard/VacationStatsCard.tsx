'use client';

import { 
  Card, CardContent, CardHeader, Typography, Box,
  Divider, LinearProgress, Grid
} from '@mui/material';

interface VacationStats {
  total: number;
  used: number;
  remaining: number;
}

export default function VacationStatsCard({ stats }: { stats: VacationStats }) {
  // Calculate percentages for the progress bars
  const usedPercentage = Math.min(100, Math.round((stats.used / stats.total) * 100)) || 0;
  const remainingPercentage = Math.min(100, Math.round((stats.remaining / stats.total) * 100)) || 0;
  
  return (
    <Card elevation={0} variant="outlined">
      <CardHeader title="Vacation Statistics" />
      <Divider />
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Box mb={2}>
              <Typography variant="subtitle2" gutterBottom>
                Total Vacation Days
              </Typography>
              <Typography variant="h4" color="primary.main">
                {stats.total}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle2">
                  Used
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stats.used} days ({usedPercentage}%)
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={usedPercentage} 
                color="warning"
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle2">
                  Remaining
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stats.remaining} days ({remainingPercentage}%)
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={remainingPercentage} 
                color="success"
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
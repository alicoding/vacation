'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/dashboard/Sidebar';
import { Box } from '@mui/material';
import { ReactNode } from 'react';
import ClientThemeWrapper from '@/components/theme/ClientThemeWrapper';

export default function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <ClientThemeWrapper>
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: '#f3f4f6',
          overflow: 'hidden',
        }}
      >
        <Header />
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            minHeight: 'calc(100vh - 64px)',
          }}
        >
          <Box
            component="nav"
            sx={{
              width: { xs: '100%', md: 240 },
              height: { xs: 'auto', md: '100%' },
              position: { xs: 'static', md: 'sticky' },
              top: 0,
              zIndex: 10,
              flexShrink: 0,
              transition: 'width 0.3s ease',
              borderRight: { xs: 'none', md: '1px solid #e0e0e0' },
            }}
          >
            <Sidebar />
          </Box>
          <Box
            component="main"
            sx={{
              flex: 1,
              p: { xs: 2, sm: 3, md: 4 },
              width: { xs: '100%', md: 'calc(100% - 240px)' },
              overflow: 'auto',
            }}
          >
            {children}
          </Box>
        </Box>
      </Box>
    </ClientThemeWrapper>
  );
}

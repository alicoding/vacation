'use client';

import React from 'react';
import { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import Link from 'next/dist/client/app-dir/link';
import { 
  AppBar, Toolbar, Box, Button, Avatar, Menu, MenuItem, IconButton,
  Typography, Container, CircularProgress,
} from '@mui/material';
import { User } from '@/types';

export default function Header() {
  const { user, isAuthenticated, isLoading, signOut: authSignOut } = useAuth();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  
  // Add debug logging to understand the auth state
  console.log('Header auth state:', { user, isAuthenticated, isLoading });
  
  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    await authSignOut();
  };

  return (
    <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="h6" noWrap sx={{ fontWeight: 700 }}>
                Vacation App
              </Typography>
            </Box>
          </Link>
          
          <Box>
            {isLoading ? (
              <CircularProgress size={24} />
            ) : isAuthenticated && user ? (
              <>
                <IconButton onClick={handleOpenMenu} size="small">
                  {user.user_metadata?.avatar_url ? (
                    <Avatar src={user.user_metadata.avatar_url} alt={user.user_metadata?.name || ''} />
                  ) : (
                    <Avatar>
                      {user.user_metadata?.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </Avatar>
                  )}
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleCloseMenu}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                  <MenuItem disabled>
                    <Typography variant="body2">{user.email}</Typography>
                  </MenuItem>
                  <MenuItem onClick={handleCloseMenu}>
                    <Link href="/dashboard" style={{ textDecoration: 'none', color: 'inherit', display: 'block', width: '100%' }}>
                      Dashboard
                    </Link>
                  </MenuItem>
                  <MenuItem onClick={handleCloseMenu}>
                    <Link href="/dashboard/settings" style={{ textDecoration: 'none', color: 'inherit', display: 'block', width: '100%' }}>
                      Settings
                    </Link>
                  </MenuItem>
                  <MenuItem onClick={handleSignOut}>
                    Sign out
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Button component={Link} href="/auth/signin" variant="outlined" color="primary">
                Sign In
              </Button>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
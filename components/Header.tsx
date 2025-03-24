'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/dist/client/app-dir/link';
import Image from 'next/image';
import { 
  AppBar, Toolbar, Box, Button, Avatar, Menu, MenuItem, IconButton,
  Typography, Container
} from '@mui/material';
import { User } from '@/types';

export default function Header() {
  const { data: session } = useSession();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  
  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  // Get typed user
  const user = session?.user as User | undefined;

  return (
    <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
          {/* Fix: Remove passHref and let Link properly handle the navigation */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            {/* Removed component="a" to prevent nested anchor tags */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="h6" noWrap sx={{ fontWeight: 700 }}>
                Vacation App
              </Typography>
            </Box>
          </Link>
          
          <Box>
            {session ? (
              <>
                <IconButton onClick={handleOpenMenu} size="small">
                  {user?.image ? (
                    <Avatar src={user.image} alt={user.name || ''} />
                  ) : (
                    <Avatar>
                      {user?.name?.charAt(0) || 'U'}
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
                    <Typography variant="body2">{user?.email}</Typography>
                  </MenuItem>
                  <MenuItem onClick={handleCloseMenu}>
                    <Link href="/dashboard" style={{ textDecoration: 'none', color: 'inherit', display: 'block', width: '100%' }}>
                      Dashboard
                    </Link>
                  </MenuItem>
                  <MenuItem onClick={handleCloseMenu}>
                    <Link href="/profile" style={{ textDecoration: 'none', color: 'inherit', display: 'block', width: '100%' }}>
                      Profile
                    </Link>
                  </MenuItem>
                  <MenuItem onClick={() => signOut({ callbackUrl: '/auth/signin' })}>
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
import React from 'react';
import { Box, Typography, Link, Divider } from '@mui/material';

/**
 * Footer Component - Application footer with links and copyright
 */
export default function Footer() {
  return (
    <Box sx={{ mt: 4, pb: 2 }}>
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary">
          &copy; {new Date().getFullYear()} Nexa Agents. All rights reserved.
        </Typography>
        
        <Box>
          <Link href="#" color="inherit" sx={{ mx: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Privacy
            </Typography>
          </Link>
          <Link href="#" color="inherit" sx={{ mx: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Terms
            </Typography>
          </Link>
          <Link href="#" color="inherit" sx={{ mx: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Help
            </Typography>
          </Link>
        </Box>
      </Box>
    </Box>
  );
}

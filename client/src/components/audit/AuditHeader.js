import React from 'react';
import { Box, Typography } from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';

const AuditHeader = ({ colorPalette }) => (
  <Box sx={{ 
    background: `linear-gradient(135deg, ${colorPalette.primary}22 0%, ${colorPalette.secondary}22 100%)`,
    borderRadius: 4,
    p: 4,
    mb: 4
  }}>
    <Typography variant="h4" sx={{ 
      fontWeight: 700, 
      color: colorPalette.textPrimary,
      mb: 2,
      display: 'flex',
      alignItems: 'center',
      gap: 2
    }}>
      <SecurityIcon sx={{ color: colorPalette.primary }} />
      Audit Trail Dashboard
    </Typography>
  </Box>
);

export default AuditHeader;

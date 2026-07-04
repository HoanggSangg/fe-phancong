import React from 'react';
import { Box, Typography } from '@mui/material';
import { LAYOUT } from '../../constants/layout';

const PageHeader = ({ icon, emoji, title, subtitle, actions }) => (
  <Box
    sx={{
      bgcolor: LAYOUT.headerBg,
      borderRadius: 2,
      px: { xs: 1.25, sm: 2 },
      py: { xs: 1, sm: 1.5 },
      mb: { xs: 1.5, sm: LAYOUT.sectionGap },
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 1.5,
      flexWrap: 'wrap',
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
      {icon && (
        <Box
          sx={{
            color: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            '& .MuiSvgIcon-root': { fontSize: { xs: 24, sm: 30 } },
          }}
        >
          {icon}
        </Box>
      )}
      {emoji && (
        <Box component="span" sx={{ fontSize: { xs: 22, sm: 26 }, lineHeight: 1 }} aria-hidden>
          {emoji}
        </Box>
      )}
      <Box>
        <Typography variant="h5" color="primary" sx={{ fontSize: { xs: '1rem', sm: undefined } }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: undefined } }}>
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>
    {actions && (
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
        {actions}
      </Box>
    )}
  </Box>
);

export default PageHeader;

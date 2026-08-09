import React from 'react';
import { Box, Typography } from '@mui/material';
import { LAYOUT } from '../../constants/layout';
import { pageHeaderSx } from '../../constants/brand';

const PageHeader = ({ icon, emoji, title, subtitle, actions }) => (
  <Box sx={{ ...pageHeaderSx, mb: { xs: 1.5, sm: LAYOUT.sectionGap } }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, pl: 0.75 }}>
      {icon && (
        <Box
          sx={{
            width: { xs: 38, sm: 44 },
            height: { xs: 38, sm: 44 },
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(21, 101, 192, 0.1)',
            color: 'primary.main',
            flexShrink: 0,
            '& .MuiSvgIcon-root': { fontSize: { xs: 22, sm: 26 } },
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
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="h5"
          color="primary"
          sx={{
            fontSize: { xs: '1rem', sm: '1.15rem' },
            fontFamily: '"Sora", sans-serif',
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
          >
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

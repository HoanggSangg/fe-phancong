import React from 'react';
import { Box } from '@mui/material';
import { LAYOUT } from '../../constants/layout';

const PageLayout = ({ children, maxWidth = 'full', sx = {} }) => {
  const resolvedMaxWidth = LAYOUT.maxWidth[maxWidth];

  return (
    <Box
      sx={{
        px: LAYOUT.pagePadding,
        pt: { xs: `${LAYOUT.pageTopGapMobile}px`, sm: 2 },
        pb: LAYOUT.pagePadding,
        maxWidth: resolvedMaxWidth,
        mx: resolvedMaxWidth ? 'auto' : undefined,
        width: '100%',
        boxSizing: 'border-box',
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};

export default PageLayout;

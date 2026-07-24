import React from 'react';
import { useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import { LAYOUT } from '../../constants/layout';
import { PageContent } from './AnimatedValue';

const PageLayout = ({ children, maxWidth = 'full', sx = {}, animate = true }) => {
  const location = useLocation();
  const resolvedMaxWidth = LAYOUT.maxWidth[maxWidth];

  const content = animate ? (
    <PageContent animationKey={location.pathname}>{children}</PageContent>
  ) : (
    children
  );

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
      {content}
    </Box>
  );
};

export default PageLayout;

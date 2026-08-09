import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import { filterPanelSx } from '../../constants/brand';
import { hoverLiftSx } from './AnimatedValue';

const FilterPanel = ({ children, title = 'Bộ lọc', sx = {} }) => (
  <Box
    sx={{
      ...filterPanelSx,
      ...hoverLiftSx,
      ...sx,
    }}
  >
    {title && (
      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1.5 }}>
        <FilterListIcon color="primary" sx={{ fontSize: 18 }} />
        <Typography variant="subtitle2" sx={{ fontFamily: '"Sora", sans-serif' }}>
          {title}
        </Typography>
      </Stack>
    )}
    {children}
  </Box>
);

export default FilterPanel;

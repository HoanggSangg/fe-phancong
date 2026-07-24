import React from 'react';
import { Paper, Stack, Typography } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import { LAYOUT } from '../../constants/layout';
import { hoverLiftSx } from './AnimatedValue';

const FilterPanel = ({ children, title = 'Bộ lọc', sx = {} }) => (
  <Paper
    sx={{
      p: LAYOUT.paperPadding,
      mb: LAYOUT.sectionGap,
      ...hoverLiftSx,
      ...sx,
    }}
  >
    {title && (
      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1.5 }}>
        <FilterListIcon color="primary" sx={{ fontSize: 18 }} />
        <Typography variant="subtitle2">{title}</Typography>
      </Stack>
    )}
    {children}
  </Paper>
);

export default FilterPanel;

import React from 'react';
import {
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  Chip,
} from '@mui/material';
import { PERIOD_OPTIONS } from '../../utils/dateFilters';

const PeriodFilterToolbar = ({
  period,
  onPeriodChange,
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  children,
  showDateChip = true,
}) => (
  <Stack spacing={1.5}>
    <ToggleButtonGroup
      value={period}
      exclusive
      onChange={(_, val) => val && onPeriodChange(val)}
      size="small"
      sx={{ flexWrap: 'wrap', gap: 0.5 }}
    >
      {PERIOD_OPTIONS.map((opt) => (
        <ToggleButton key={opt.value} value={opt.value} sx={{ px: 1.25, py: 0.5 }}>
          {opt.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>

    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      alignItems={{ sm: 'center' }}
      useFlexGap
      flexWrap="wrap"
    >
      {period === 'custom' && (
        <>
          <TextField
            label="Từ ngày"
            type="date"
            value={fromDate}
            onChange={(e) => onFromDateChange(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: { xs: '100%', sm: 160 } }}
          />
          <TextField
            label="Đến ngày"
            type="date"
            value={toDate}
            onChange={(e) => onToDateChange(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: { xs: '100%', sm: 160 } }}
          />
        </>
      )}

      {children}

      {showDateChip && (
        <Chip label={`${fromDate} → ${toDate}`} color="primary" variant="outlined" size="small" />
      )}
    </Stack>
  </Stack>
);

export default PeriodFilterToolbar;

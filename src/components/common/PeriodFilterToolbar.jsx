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
  <Stack spacing={2}>
    <ToggleButtonGroup
      value={period}
      exclusive
      onChange={(_, val) => val && onPeriodChange(val)}
      size="small"
      sx={{ flexWrap: 'wrap' }}
    >
      {PERIOD_OPTIONS.map((opt) => (
        <ToggleButton key={opt.value} value={opt.value}>
          {opt.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>

    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
      {period === 'custom' && (
        <>
          <TextField
            label="Từ ngày"
            type="date"
            size="small"
            value={fromDate}
            onChange={(e) => onFromDateChange(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: { xs: '100%', sm: 180 } }}
          />
          <TextField
            label="Đến ngày"
            type="date"
            size="small"
            value={toDate}
            onChange={(e) => onToDateChange(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: { xs: '100%', sm: 180 } }}
          />
        </>
      )}

      {children}

      {showDateChip && (
        <Chip label={`${fromDate} → ${toDate}`} color="primary" variant="outlined" />
      )}
    </Stack>
  </Stack>
);

export default PeriodFilterToolbar;

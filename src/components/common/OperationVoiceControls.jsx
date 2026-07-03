import React from 'react';
import { Button, Stack } from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';

const OperationVoiceControls = ({
  voiceEnabled,
  onToggle,
  onTest,
  size = 'small',
}) => (
  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
    <Button
      variant="outlined"
      size={size}
      onClick={onTest}
      disabled={!voiceEnabled}
    >
      Thử đọc
    </Button>
    <Button
      variant={voiceEnabled ? 'contained' : 'outlined'}
      color={voiceEnabled ? 'primary' : 'inherit'}
      size={size}
      startIcon={voiceEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
      onClick={onToggle}
    >
      {voiceEnabled ? 'Tắt đọc' : 'Bật đọc'}
    </Button>
  </Stack>
);

export default OperationVoiceControls;

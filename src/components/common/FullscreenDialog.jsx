import React from 'react';
import { Box, Dialog, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const FullscreenDialog = ({
  open,
  onClose,
  title,
  children,
  bgcolor = '#f5f5f5',
  fillContent = false,
}) => (
  <Dialog fullScreen open={open} onClose={onClose}>
    <Box sx={{ height: '100dvh', display: 'flex', flexDirection: 'column', bgcolor }}>
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #eee',
          bgcolor: '#fff',
          flexShrink: 0,
        }}
      >
        <Typography fontWeight="bold">{title}</Typography>
        <IconButton onClick={onClose} aria-label="Đóng">
          <CloseIcon />
        </IconButton>
      </Box>
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: fillContent ? 'hidden' : 'auto',
          p: fillContent ? 0 : { xs: 2, sm: 3 },
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </Box>
    </Box>
  </Dialog>
);

export default FullscreenDialog;

import React, { useEffect, useRef, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  Alert,
  Stack,
  Typography,
} from '@mui/material';
import useSystemUpdate from '../../hooks/useSystemUpdate';
import { useUnsavedChanges } from '../../context/UnsavedChangesContext';

const SystemUpdateListener = () => {
  const { pendingUpdate, dismissUpdate, reloadWithVersion } = useSystemUpdate();
  const { hasUnsavedChanges } = useUnsavedChanges();
  const [snackOpen, setSnackOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmForceOpen, setConfirmForceOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const timerRef = useRef(null);
  const countdownVersionRef = useRef('');

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => () => clearTimer(), []);

  useEffect(() => {
    if (!pendingUpdate?.version) {
      clearTimer();
      setSnackOpen(false);
      setDialogOpen(false);
      setSecondsLeft(null);
      countdownVersionRef.current = '';
      return undefined;
    }

    if (hasUnsavedChanges) {
      clearTimer();
      setSecondsLeft(null);
      setSnackOpen(false);
      setDialogOpen(true);
      return undefined;
    }

    setDialogOpen(false);
    setSnackOpen(true);

    if (
      countdownVersionRef.current === pendingUpdate.version
      && timerRef.current
    ) {
      return undefined;
    }

    countdownVersionRef.current = pendingUpdate.version;
    const total = pendingUpdate.forceReload ? 10 : 5;
    setSecondsLeft(total);
    clearTimer();

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev == null) return prev;
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          reloadWithVersion(pendingUpdate.version);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearTimer();
  }, [pendingUpdate, hasUnsavedChanges, reloadWithVersion]);

  if (!pendingUpdate) return null;

  const message = pendingUpdate.message || 'Hệ thống vừa được cập nhật.';

  return (
    <>
      <Snackbar
        open={snackOpen && !hasUnsavedChanges}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={pendingUpdate.forceReload ? 'error' : 'info'}
          variant="filled"
          sx={{ width: '100%', alignItems: 'center' }}
          action={(
            <Stack direction="row" spacing={1}>
              <Button color="inherit" size="small" onClick={() => reloadWithVersion(pendingUpdate.version)}>
                Tải lại ngay
              </Button>
              {!pendingUpdate.forceReload && (
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => {
                    clearTimer();
                    setSnackOpen(false);
                    setSecondsLeft(null);
                    countdownVersionRef.current = '';
                    dismissUpdate();
                  }}
                >
                  Để sau
                </Button>
              )}
            </Stack>
          )}
        >
          <Typography variant="body2" fontWeight={700}>
            {message}
          </Typography>
          <Typography variant="caption" display="block">
            {pendingUpdate.forceReload
              ? `Phiên bản ${pendingUpdate.version}. Trang sẽ tải lại sau ${secondsLeft ?? 10} giây.`
              : `Phiên bản ${pendingUpdate.version}. Trang sẽ tải lại sau ${secondsLeft ?? 5} giây.`}
          </Typography>
        </Alert>
      </Snackbar>

      <Dialog open={dialogOpen && hasUnsavedChanges} onClose={() => {}}>
        <DialogTitle>
          {pendingUpdate.forceReload ? 'Bắt buộc cập nhật hệ thống' : 'Hệ thống vừa được cập nhật'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 1.5 }}>
            {message}
          </DialogContentText>
          <DialogContentText color="warning.main">
            Bạn đang có dữ liệu chưa lưu. Hãy lưu dữ liệu trước khi tải lại trang.
            {pendingUpdate.forceReload
              ? ' Phiên bản hiện tại có thể không còn hoạt động an toàn.'
              : ''}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          {!pendingUpdate.forceReload && (
            <Button
              onClick={() => {
                setDialogOpen(false);
                dismissUpdate();
              }}
            >
              Để sau
            </Button>
          )}
          <Button
            color="error"
            variant="contained"
            onClick={() => setConfirmForceOpen(true)}
          >
            Tải lại ngay
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmForceOpen} onClose={() => setConfirmForceOpen(false)}>
        <DialogTitle>Xác nhận tải lại?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Dữ liệu chưa lưu có thể bị mất. Bạn chắc chắn muốn tải lại trang?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmForceOpen(false)}>Hủy</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => reloadWithVersion(pendingUpdate.version)}
          >
            Tải lại và mất dữ liệu chưa lưu
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SystemUpdateListener;

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import CameraswitchIcon from '@mui/icons-material/Cameraswitch';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Html5Qrcode } from 'html5-qrcode';
import PageLayout from '../common/PageLayout';
import PageHeader from '../common/PageHeader';
import DocumentImageUploader from './DocumentImageUploader';
import {
  buildUploadUrl,
  extractSoChungTu,
  isValidSoChungTu,
} from '../../utils/uploadUrl';
import { useToast } from '../../context/ToastContext';
import { LAYOUT } from '../../constants/layout';

export { buildUploadUrl, extractSoChungTu, isValidSoChungTu };

const SCANNER_ELEMENT_ID = 'qr-live-reader';

const isSecureCameraContext = () => {
  if (typeof window === 'undefined') return false;
  if (window.isSecureContext) return true;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
};

const UploadImageByQr = () => {
  const toast = useToast();
  const scannerRef = useRef(null);
  const handlingRef = useRef(false);

  const [manualCode, setManualCode] = useState('');
  const [scannedCode, setScannedCode] = useState('');
  const [uploadUrl, setUploadUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) {
      setIsScanning(false);
      return;
    }

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
    } catch {
      // ignore stop race
    }

    try {
      await scanner.clear();
    } catch {
      // ignore
    }

    scannerRef.current = null;
    setIsScanning(false);
  }, []);

  useEffect(() => () => {
    stopScanner();
  }, [stopScanner]);

  const applySuccess = useCallback(
    async (qrText) => {
      if (handlingRef.current) return false;
      handlingRef.current = true;

      const soChungTu = extractSoChungTu(qrText);
      if (!isValidSoChungTu(soChungTu)) {
        handlingRef.current = false;
        toast.error('Đã đọc được QR nhưng không tìm thấy số chứng từ hợp lệ.');
        return false;
      }

      const url = buildUploadUrl(soChungTu);
      setScannedCode(soChungTu);
      setManualCode(soChungTu);
      setUploadUrl(url);
      toast.success(`Đã quét: ${soChungTu}`);

      await stopScanner();
      handlingRef.current = false;
      return true;
    },
    [stopScanner, toast],
  );

  const startScanner = useCallback(async () => {
    if (isStarting || isScanning) return;

    if (!isSecureCameraContext()) {
      setCameraError(
        'Trình duyệt chỉ cho mở camera khi web chạy HTTPS. Dùng https://100.127.133.38:5173 (giữ IP cũ, chỉ đổi http→https).',
      );
      toast.error('Cần HTTPS để mở camera điện thoại.');
      return;
    }

    setCameraError('');
    setIsStarting(true);
    handlingRef.current = false;

    try {
      await stopScanner();

      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, { verbose: false });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 12,
          qrbox: (viewWidth, viewHeight) => {
            const edge = Math.min(Math.floor(viewWidth * 0.78), Math.floor(viewHeight * 0.78), 280);
            return { width: edge, height: edge };
          },
          aspectRatio: 1,
          disableFlip: false,
        },
        async (decodedText) => {
          await applySuccess(decodedText);
        },
        () => {
          // ignore frame miss
        },
      );

      setIsScanning(true);
    } catch (error) {
      console.error('Không mở được camera:', error);
      scannerRef.current = null;
      setIsScanning(false);

      const message = String(error?.message || error || '');
      if (/NotAllowedError|Permission|denied/i.test(message)) {
        setCameraError('Bạn đã từ chối quyền camera. Hãy cho phép camera rồi thử lại.');
      } else if (/NotFoundError|DevicesNotFound/i.test(message)) {
        setCameraError('Không tìm thấy camera trên thiết bị.');
      } else {
        setCameraError(message || 'Không mở được camera. Kiểm tra HTTPS và quyền truy cập.');
      }
      toast.error('Không mở được camera để quét QR.');
    } finally {
      setIsStarting(false);
    }
  }, [applySuccess, isScanning, isStarting, stopScanner, toast]);

  const handleOpenManual = () => {
    const soChungTu = String(manualCode || '').trim().toUpperCase();
    if (!isValidSoChungTu(soChungTu)) {
      toast.error('Số chứng từ không hợp lệ (ví dụ TT0000000003636).');
      return;
    }

    const url = buildUploadUrl(soChungTu);
    setScannedCode(soChungTu);
    setManualCode(soChungTu);
    setUploadUrl(url);
  };

  const handleOpenResult = () => {
    if (!uploadUrl && !manualCode.trim()) return;
    if (!uploadUrl) {
      handleOpenManual();
      return;
    }
    const newWindow = window.open(uploadUrl, '_blank', 'noopener,noreferrer');
    if (!newWindow) {
      toast.warning('Trình duyệt đã chặn cửa sổ mới. Vui lòng cho phép popup hoặc thử lại.');
    }
  };

  const handleRescan = async () => {
    setScannedCode('');
    setUploadUrl('');
    await startScanner();
  };

  return (
    <PageLayout maxWidth={scannedCode ? 'medium' : 'narrow'}>
      <PageHeader
        icon={<QrCodeScannerIcon />}
        title="Tải ảnh"
        subtitle="Quét QR trực tiếp bằng camera — không cần chụp ảnh."
      />

      <Stack spacing={LAYOUT.sectionGap}>
        <Alert severity="info">
          Bấm <strong>Quét QR</strong> để mở camera. Đưa mã QR vào khung là lấy số chứng từ.
          Link giữ nguyên IP Tailscale: <strong>https://100.127.133.38:5173</strong> (chỉ đổi http→https).
        </Alert>

        <Paper variant="outlined" sx={{ p: LAYOUT.paperPadding, borderRadius: 2 }}>
          <Box
            id={SCANNER_ELEMENT_ID}
            sx={{
              width: '100%',
              minHeight: isScanning || isStarting ? 280 : 0,
              mb: isScanning || isStarting ? 2 : 0,
              overflow: 'hidden',
              borderRadius: 1.5,
              bgcolor: isScanning || isStarting ? '#111' : 'transparent',
              '& video': {
                width: '100% !important',
                borderRadius: 1.5,
              },
              '& img': {
                display: 'none',
              },
            }}
          />

          {!isScanning && !isStarting && (
            <Box
              sx={{
                py: 3,
                px: 2,
                mb: 2,
                textAlign: 'center',
                bgcolor: 'grey.50',
                borderRadius: 1.5,
                border: '1px dashed',
                borderColor: 'grey.300',
              }}
            >
              <QrCodeScannerIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
                Quét mã QR trên phiếu sửa chữa
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Camera mở trực tiếp trong trang — không cần chụp rồi mới đọc.
              </Typography>
            </Box>
          )}

          {!!cameraError && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {cameraError}
            </Alert>
          )}

          {(isStarting || isScanning) && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {isStarting ? 'Đang mở camera…' : 'Đưa mã QR vào khung để quét…'}
            </Typography>
          )}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} useFlexGap flexWrap="wrap">
            {!isScanning ? (
              <Button
                variant="contained"
                startIcon={
                  isStarting ? <CircularProgress size={16} color="inherit" /> : <QrCodeScannerIcon />
                }
                onClick={startScanner}
                disabled={isStarting}
              >
                {isStarting ? 'Đang mở camera…' : 'Quét QR'}
              </Button>
            ) : (
              <Button
                variant="outlined"
                color="error"
                startIcon={<StopCircleIcon />}
                onClick={stopScanner}
              >
                Dừng camera
              </Button>
            )}

            {scannedCode && !isScanning && (
              <Button
                variant="outlined"
                startIcon={<CameraswitchIcon />}
                onClick={handleRescan}
                disabled={isStarting}
              >
                Quét mã khác
              </Button>
            )}

            {scannedCode && (
              <Button variant="text" startIcon={<RefreshIcon />} onClick={() => setScannedCode('')}>
                Xóa kết quả
              </Button>
            )}
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: LAYOUT.paperPadding, borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700 }}>
            Nhập thủ công số chứng từ
          </Typography>

          <Stack spacing={1.5}>
            <TextField
              fullWidth
              size="small"
              label="Số chứng từ"
              placeholder="TT0000000003636"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              inputProps={{ autoCapitalize: 'characters', spellCheck: false }}
              disabled={isScanning || isStarting}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button
                variant="contained"
                onClick={handleOpenManual}
                disabled={isScanning || isStarting || !manualCode.trim()}
              >
                Lấy thông tin xe
              </Button>
              <Button
                variant="outlined"
                startIcon={<OpenInNewIcon />}
                onClick={handleOpenResult}
                disabled={isScanning || isStarting || (!manualCode.trim() && !uploadUrl)}
              >
                Mở trang tải ảnh
              </Button>
            </Stack>
          </Stack>

          {(scannedCode || uploadUrl) && (
            <Box sx={{ mt: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1.5 }}>
              {scannedCode && (
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <Box component="span" fontWeight={700}>
                    Mã chứng từ:{' '}
                  </Box>
                  {scannedCode}
                </Typography>
              )}
              {uploadUrl && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ wordBreak: 'break-all', fontSize: '0.8rem' }}
                >
                  <Box component="span" fontWeight={700} color="text.primary">
                    Link:{' '}
                  </Box>
                  {uploadUrl}
                </Typography>
              )}
            </Box>
          )}
        </Paper>

        {scannedCode && <DocumentImageUploader soChungTu={scannedCode} />}
      </Stack>
    </PageLayout>
  );
};

export default UploadImageByQr;

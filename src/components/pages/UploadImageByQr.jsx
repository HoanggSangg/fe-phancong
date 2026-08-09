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
import RefreshIcon from '@mui/icons-material/Refresh';
import { Html5Qrcode } from 'html5-qrcode';
import { useSearchParams } from 'react-router-dom';
import PageLayout from '../common/PageLayout';
import PageHeader from '../common/PageHeader';
import DocumentImageUploader from './DocumentImageUploader';
import {
  buildUploadUrl,
  extractSoChungTu,
  isValidSoChungTu,
} from '../../utils/uploadUrl';
import { ACCESS_HINT } from '../../constants/accessUrls';
import { getDocumentImageContext } from '../../utils/documentImageApi';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const scannerRef = useRef(null);
  const handlingRef = useRef(false);
  const hydratedQueryRef = useRef('');

  const [manualCode, setManualCode] = useState('');
  const [scannedCode, setScannedCode] = useState('');
  const [carInfo, setCarInfo] = useState(null);
  const [carInfoLoading, setCarInfoLoading] = useState(false);
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

  const loadCarInfo = useCallback(async (soChungTu) => {
    if (!isValidSoChungTu(soChungTu)) {
      setCarInfo(null);
      return;
    }

    setCarInfoLoading(true);
    try {
      const data = await getDocumentImageContext(soChungTu);
      setCarInfo(data || null);
    } catch (error) {
      console.error(error);
      setCarInfo({
        baseTt: soChungTu,
        roNumber: soChungTu,
        plateNumber: '',
        roCode: '',
      });
    } finally {
      setCarInfoLoading(false);
    }
  }, []);

  const openSoChungTu = useCallback(
    async (rawValue, { announce = true, syncQuery = true } = {}) => {
      const soChungTu = extractSoChungTu(rawValue);
      if (!isValidSoChungTu(soChungTu)) {
        toast.error('Số chứng từ không hợp lệ (ví dụ TT0000000000198).');
        return false;
      }

      setScannedCode(soChungTu);
      setManualCode(soChungTu);
      hydratedQueryRef.current = soChungTu;

      if (syncQuery) {
        setSearchParams({ soChungTu }, { replace: true });
      }

      if (announce) {
        toast.success(`Đã mở xe: ${soChungTu}`);
      }

      await stopScanner();
      await loadCarInfo(soChungTu);
      return true;
    },
    [loadCarInfo, setSearchParams, stopScanner, toast],
  );

  useEffect(() => {
    const fromQuery = extractSoChungTu(searchParams.get('soChungTu') || '');
    if (!isValidSoChungTu(fromQuery)) return;
    if (hydratedQueryRef.current === fromQuery) return;

    openSoChungTu(fromQuery, { announce: false, syncQuery: false });
  }, [openSoChungTu, searchParams]);

  const applySuccess = useCallback(
    async (qrText) => {
      if (handlingRef.current) return false;
      handlingRef.current = true;
      const ok = await openSoChungTu(qrText, { announce: true, syncQuery: true });
      handlingRef.current = false;
      return ok;
    },
    [openSoChungTu],
  );

  const startScanner = useCallback(async () => {
    if (isStarting || isScanning) return;

    if (!isSecureCameraContext()) {
      setCameraError(
        `Trình duyệt chỉ cho mở camera khi web chạy HTTPS. ${ACCESS_HINT}`,
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
    openSoChungTu(manualCode, { announce: true, syncQuery: true });
  };

  const handleRescan = async () => {
    setScannedCode('');
    setCarInfo(null);
    hydratedQueryRef.current = '';
    setSearchParams({}, { replace: true });
    await startScanner();
  };

  const handleClearResult = () => {
    setScannedCode('');
    setCarInfo(null);
    hydratedQueryRef.current = '';
    setSearchParams({}, { replace: true });
  };

  return (
    <PageLayout maxWidth={scannedCode ? 'medium' : 'narrow'}>
      <PageHeader
        icon={<QrCodeScannerIcon />}
        title="Tải ảnh"
        subtitle="Quét QR trực tiếp bằng camera — không cần chụp ảnh."
      />

      <Stack spacing={LAYOUT.sectionGap}>
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

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 2 }}>
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
              <Button variant="text" startIcon={<RefreshIcon />} onClick={handleClearResult}>
                Xóa kết quả
              </Button>
            )}
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} useFlexGap>
            <TextField
              size="small"
              label="Hoặc nhập số chứng từ TT"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleOpenManual();
                }
              }}
              fullWidth
              placeholder="TT0000000000198"
            />
            <Button variant="outlined" onClick={handleOpenManual} sx={{ whiteSpace: 'nowrap' }}>
              Mở xe
            </Button>
          </Stack>
        </Paper>

        {carInfoLoading && scannedCode && (
          <Typography variant="body2" color="text.secondary">
            Đang tải thông tin xe…
          </Typography>
        )}

        {scannedCode && (
          <DocumentImageUploader soChungTu={scannedCode} carInfo={carInfo} />
        )}
      </Stack>
    </PageLayout>
  );
};

export default UploadImageByQr;

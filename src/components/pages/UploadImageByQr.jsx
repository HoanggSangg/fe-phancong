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
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import { Html5Qrcode } from 'html5-qrcode';
import { useSearchParams } from 'react-router-dom';
import PageLayout from '../common/PageLayout';
import PageHeader from '../common/PageHeader';
import DocumentImageUploader from './DocumentImageUploader';
import XuatKhoDialog from './XuatKhoDialog';
import { extractSoChungTu, isValidSoChungTu } from '../../utils/uploadUrl';
import { BARCODE_FORMATS, extractHanghoaCode, normHanghoa } from '../../utils/hanghoaScan';
import { ACCESS_HINT } from '../../constants/accessUrls';
import { getDocumentImageContext } from '../../utils/documentImageApi';
import { decodeQrFromImageFile } from '../../utils/decodeQrFromImage';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../utils/permissions';
import { LAYOUT } from '../../constants/layout';

const SCANNER_ELEMENT_ID = 'qr-live-reader';

const isSecureCameraContext = () => {
  if (typeof window === 'undefined') return false;
  if (window.isSecureContext) return true;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
};

const UploadImageByQr = () => {
  const toast = useToast();
  const { user, isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const scannerRef = useRef(null);
  const handlingRef = useRef(false);
  const hydratedQueryRef = useRef('');
  const qrImageInputRef = useRef(null);
  const scannedCodeRef = useRef('');
  const xuatKhoRef = useRef(null);
  const cameraHoldRef = useRef({ code: '', lastSeen: 0 });
  const lastWarnRef = useRef(0);
  const pendingPartRef = useRef('');

  const [manualCode, setManualCode] = useState('');
  const [scannedCode, setScannedCode] = useState('');
  const [carInfo, setCarInfo] = useState(null);
  const [carInfoLoading, setCarInfoLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isDecodingImage, setIsDecodingImage] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const allowDelete = Boolean(isAuthenticated && hasPermission(user, 'cars.upload-image'));

  useEffect(() => {
    scannedCodeRef.current = scannedCode;
  }, [scannedCode]);

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

  useEffect(() => {
    if (!isScanning) {
      cameraHoldRef.current = { code: '', lastSeen: 0 };
      return undefined;
    }
    const timer = window.setInterval(() => {
      const hold = cameraHoldRef.current;
      if (hold.code && Date.now() - hold.lastSeen > 450) {
        hold.code = '';
      }
    }, 150);
    return () => window.clearInterval(timer);
  }, [isScanning]);

  const loadCarInfo = useCallback(async (soChungTu) => {
    if (!isValidSoChungTu(soChungTu)) {
      setCarInfo(null);
      return;
    }

    setCarInfoLoading(true);
    try {
      const data = await getDocumentImageContext(soChungTu);
      setCarInfo(data || null);
    } catch {
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

      if (scannedCodeRef.current === soChungTu) {
        return true;
      }

      setScannedCode(soChungTu);
      setManualCode(soChungTu);
      hydratedQueryRef.current = soChungTu;

      if (syncQuery) {
        setSearchParams({ soChungTu }, { replace: true });
      }

      if (announce) {
        toast.success(`Đã mở xe: ${soChungTu}. Quét tiếp mã phụ tùng trên cùng khung này.`);
      }

      await loadCarInfo(soChungTu);
      return true;
    },
    [loadCarInfo, setSearchParams, toast],
  );

  useEffect(() => {
    const fromQuery = extractSoChungTu(searchParams.get('soChungTu') || '');
    if (!isValidSoChungTu(fromQuery)) return;
    if (hydratedQueryRef.current === fromQuery) return;

    openSoChungTu(fromQuery, { announce: false, syncQuery: false });
  }, [openSoChungTu, searchParams]);

  const applyDecoded = useCallback(
    async (qrText) => {
      const soChungTu = extractSoChungTu(qrText);
      if (isValidSoChungTu(soChungTu)) {
        if (handlingRef.current) return false;
        handlingRef.current = true;
        try {
          return await openSoChungTu(qrText, { announce: true, syncQuery: true });
        } finally {
          handlingRef.current = false;
        }
      }

      if (handlingRef.current) return false;

      if (!scannedCodeRef.current) {
        if (Date.now() - lastWarnRef.current > 2500) {
          lastWarnRef.current = Date.now();
          toast.error('Quét mã xe (TT…) trước, rồi quét mã phụ tùng trên cùng khung này.');
        }
        return false;
      }

      if (!xuatKhoRef.current) {
        pendingPartRef.current = qrText;
        return false;
      }

      return Boolean(await xuatKhoRef.current.addHanghoa(qrText));
    },
    [openSoChungTu, toast],
  );

  useEffect(() => {
    const pending = pendingPartRef.current;
    if (!scannedCode || !pending) return;
    pendingPartRef.current = '';
    xuatKhoRef.current?.addHanghoa(pending);
  }, [scannedCode]);

  const handleScanDecoded = useCallback(async (decodedText) => {
    const soChungTu = extractSoChungTu(decodedText);
    const holdKey = isValidSoChungTu(soChungTu)
      ? soChungTu
      : normHanghoa(extractHanghoaCode(decodedText));
    if (!holdKey) return;

    const hold = cameraHoldRef.current;
    hold.lastSeen = Date.now();
    if (hold.code === holdKey) return;
    hold.code = holdKey;
    await applyDecoded(decodedText);
  }, [applyDecoded]);

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

      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, {
        verbose: false,
        formatsToSupport: BARCODE_FORMATS,
      });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: (viewWidth, viewHeight) => ({
            width: Math.min(Math.floor(viewWidth * 0.88), 320),
            height: Math.min(Math.floor(viewHeight * 0.70), 280),
          }),
          aspectRatio: 1,
          disableFlip: false,
        },
        async (decodedText) => {
          await handleScanDecoded(decodedText);
        },
        () => {
          // ignore frame miss
        },
      );

      setIsScanning(true);
    } catch (error) {
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
  }, [handleScanDecoded, isScanning, isStarting, stopScanner, toast]);

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

  const handlePickQrImage = () => {
    qrImageInputRef.current?.click();
  };

  const handleQrImageSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsDecodingImage(true);
    setCameraError('');
    try {
      const { text, soChungTu } = await decodeQrFromImageFile(file);
      if (soChungTu) {
        await openSoChungTu(soChungTu, { announce: true, syncQuery: true });
        return;
      }
      if (scannedCodeRef.current) {
        await xuatKhoRef.current?.addHanghoa(text);
        return;
      }
      toast.error('Quét hoặc mở mã xe (TT…) trước, rồi tải ảnh mã phụ tùng.');
    } catch (error) {
      toast.error(error?.message || 'Không đọc được QR từ ảnh.');
    } finally {
      setIsDecodingImage(false);
    }
  };

  const scannerHint = isStarting
    ? 'Đang mở camera…'
    : scannedCode
      ? `Đã mở xe ${scannedCode}. Quét tiếp mã phụ tùng hoặc mã xe khác.`
      : 'Đưa mã xe (TT…) hoặc mã phụ tùng vào khung để quét…';

  return (
    <PageLayout maxWidth={scannedCode ? 'medium' : 'narrow'}>
      <PageHeader
        icon={<QrCodeScannerIcon />}
        title="Tải ảnh"
        subtitle="Một khung quét cho cả mã xe và mã phụ tùng — không cần mở camera lần hai."
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
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{
                py: 0.75,
                px: 1.25,
                mb: 1.5,
                bgcolor: 'grey.50',
                borderRadius: 1.5,
                border: '1px dashed',
                borderColor: 'grey.300',
              }}
            >
              <QrCodeScannerIcon sx={{ fontSize: 22, color: 'primary.main', flexShrink: 0 }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={700} noWrap>
                  Quét mã xe hoặc mã phụ tùng
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Quét TT… để mở xe, rồi quét tiếp mã phụ tùng trên cùng khung.
                </Typography>
              </Box>
            </Stack>
          )}

          {!!cameraError && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {cameraError}
            </Alert>
          )}

          {(isStarting || isScanning) && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {scannerHint}
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
                disabled={isStarting || isDecodingImage}
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

            <Button
              variant="outlined"
              startIcon={
                isDecodingImage ? <CircularProgress size={16} color="inherit" /> : <ImageSearchIcon />
              }
              onClick={handlePickQrImage}
              disabled={isStarting || isScanning || isDecodingImage}
            >
              {isDecodingImage ? 'Đang đọc ảnh…' : 'Tải ảnh để đọc QR'}
            </Button>

            {scannedCode && !isScanning && (
              <Button
                variant="outlined"
                startIcon={<CameraswitchIcon />}
                onClick={handleRescan}
                disabled={isStarting || isDecodingImage}
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

          <input
            ref={qrImageInputRef}
            type="file"
            hidden
            accept="image/*,.jpg,.jpeg,.png,.gif,.bmp,.webp"
            onChange={handleQrImageSelected}
          />

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
          <XuatKhoDialog
            ref={xuatKhoRef}
            khoaBaoGia={scannedCode}
            plateNumber={carInfo?.plateNumber || ''}
            roCode={carInfo?.roCode || carInfo?.roNumber || ''}
          />
        )}

        {scannedCode && (
          <DocumentImageUploader
            soChungTu={scannedCode}
            carInfo={carInfo}
            allowDelete={allowDelete}
          />
        )}
      </Stack>
    </PageLayout>
  );
};

export default UploadImageByQr;

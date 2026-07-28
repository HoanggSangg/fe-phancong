import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import PageLayout from '../common/PageLayout';
import PageHeader from '../common/PageHeader';
import DocumentImageUploader from './DocumentImageUploader';
import { useToast } from '../../context/ToastContext';
import { LAYOUT } from '../../constants/layout';

const SCANNER_ELEMENT_ID = 'upload-image-qr-reader';
const UPLOAD_BASE_URL = 'http://api2026.otobathanh.vn/upload.html';

const SCANNER_CONFIG = {
  formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
  useBarCodeDetectorIfSupported: true,
  verbose: false,
};

export const extractSoChungTu = (qrText) => {
  const rawValue = String(qrText || '').trim();

  if (!rawValue) return '';

  try {
    const parsedUrl = new URL(rawValue);
    const value =
      parsedUrl.searchParams.get('khoa') ||
      parsedUrl.searchParams.get('soChungTu');

    return String(value || '').trim().toUpperCase();
  } catch {
    return rawValue.toUpperCase();
  }
};

export const isValidSoChungTu = (soChungTu) => /^TT[A-Z0-9]+$/.test(soChungTu);

export const buildUploadUrl = (soChungTu) =>
  `${UPLOAD_BASE_URL}?soChungTu=${encodeURIComponent(soChungTu)}`;

const loadImageFromFile = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không tải được ảnh.'));
    };
    image.src = url;
  });

const canvasToFile = (canvas, name = 'qr-crop.png') =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Không tạo được ảnh xử lý.'));
          return;
        }
        resolve(new File([blob], name, { type: 'image/png' }));
      },
      'image/png',
      0.95,
    );
  });

const drawEnhancedRegion = (source, sx, sy, sw, sh, outSize) => {
  const canvas = document.createElement('canvas');
  canvas.width = outSize;
  canvas.height = outSize;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas không khả dụng.');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, outSize, outSize);
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, outSize, outSize);

  // Tăng tương phản nhẹ giúp ZXing nhận QR mờ/nhòe tốt hơn
  const imageData = ctx.getImageData(0, 0, outSize, outSize);
  const data = imageData.data;
  const contrast = 1.35;
  const intercept = 128 * (1 - contrast);
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const value = Math.max(0, Math.min(255, gray * contrast + intercept));
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
};

const buildScanVariants = (image) => {
  const { width: w, height: h } = image;
  const variants = [];
  const push = (sx, sy, sw, sh, size, label) => {
    const safeW = Math.max(1, Math.min(sw, w - sx));
    const safeH = Math.max(1, Math.min(sh, h - sy));
    if (safeW < 20 || safeH < 20) return;
    variants.push({
      label,
      canvas: drawEnhancedRegion(image, sx, sy, safeW, safeH, size),
    });
  };

  // Ảnh gốc (co về kích thước vừa phải)
  const fullSize = Math.min(1400, Math.max(w, h));
  push(0, 0, w, h, fullSize, 'full');

  // QR trên phiếu thường nằm nửa trên / góc phải
  push(0, 0, w, Math.floor(h * 0.55), 1000, 'top-half');
  push(Math.floor(w * 0.35), 0, Math.floor(w * 0.65), Math.floor(h * 0.55), 1000, 'top-right');
  push(Math.floor(w * 0.2), Math.floor(h * 0.05), Math.floor(w * 0.6), Math.floor(h * 0.45), 1100, 'center-top');

  // Quét theo lưới 2x2 và 3x3 để bắt QR nhỏ trong ảnh lớn
  [2, 3].forEach((grid) => {
    const cellW = Math.floor(w / grid);
    const cellH = Math.floor(h / grid);
    const overlapX = Math.floor(cellW * 0.2);
    const overlapY = Math.floor(cellH * 0.2);
    for (let row = 0; row < grid; row += 1) {
      for (let col = 0; col < grid; col += 1) {
        const sx = Math.max(0, col * cellW - overlapX);
        const sy = Math.max(0, row * cellH - overlapY);
        const sw = Math.min(w - sx, cellW + overlapX * 2);
        const sh = Math.min(h - sy, cellH + overlapY * 2);
        push(sx, sy, sw, sh, 900, `grid-${grid}-${row}-${col}`);
      }
    }
  });

  return variants;
};

const decodeWithBarcodeDetector = async (source) => {
  if (typeof window === 'undefined' || typeof window.BarcodeDetector !== 'function') {
    return null;
  }

  try {
    const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
    const codes = await detector.detect(source);
    const value = codes?.[0]?.rawValue;
    return value ? String(value) : null;
  } catch {
    return null;
  }
};

const pickBackCameraId = (cameras = []) => {
  if (!cameras.length) return null;

  const scored = cameras.map((camera) => {
    const label = String(camera.label || '').toLowerCase();
    let score = 0;
    if (/back|rear|environment|sau|posterior|trás/.test(label)) score += 5;
    if (/camera2?\s*0|camera\s*0|0\s*facing/.test(label)) score += 2;
    if (/front|user|facetime|selfie|trước/.test(label)) score -= 5;
    return { id: camera.id, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.id || cameras[0].id;
};

const UploadImageByQr = () => {
  const toast = useToast();

  const scannerRef = useRef(null);
  const isScanningRef = useRef(false);
  const isStartingRef = useRef(false);
  const isProcessingRef = useRef(false);
  const fileInputRef = useRef(null);
  const mountedRef = useRef(true);

  const [isScanning, setIsScanning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scannedCode, setScannedCode] = useState('');
  const [uploadUrl, setUploadUrl] = useState('');

  const ensureScanner = useCallback(() => {
    const element = document.getElementById(SCANNER_ELEMENT_ID);
    if (!element) {
      throw new Error('Không tìm thấy khung quét QR.');
    }

    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode(SCANNER_ELEMENT_ID, SCANNER_CONFIG);
    }

    return scannerRef.current;
  }, []);

  const recreateScanner = useCallback(() => {
    try {
      scannerRef.current?.clear();
    } catch {
      // ignore
    }
    scannerRef.current = null;

    const element = document.getElementById(SCANNER_ELEMENT_ID);
    if (element) {
      element.innerHTML = '';
    }

    scannerRef.current = new Html5Qrcode(SCANNER_ELEMENT_ID, SCANNER_CONFIG);
    return scannerRef.current;
  }, []);

  const stopScannerSafely = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) {
      isScanningRef.current = false;
      if (mountedRef.current) setIsScanning(false);
      return;
    }

    try {
      if (isScanningRef.current || scanner.isScanning) {
        await scanner.stop();
      }
    } catch {
      // Camera có thể đã dừng
    }

    try {
      scanner.clear();
    } catch {
      // ignore
    }

    scannerRef.current = null;
    isScanningRef.current = false;
    if (mountedRef.current) setIsScanning(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      isProcessingRef.current = false;
      const scanner = scannerRef.current;
      if (!scanner) return;

      (async () => {
        try {
          if (isScanningRef.current || scanner.isScanning) {
            await scanner.stop();
          }
        } catch {
          // ignore
        }
        try {
          scanner.clear();
        } catch {
          // ignore
        }
        scannerRef.current = null;
        isScanningRef.current = false;
      })();
    };
  }, []);

  const openUploadInNewTab = useCallback(
    (url) => {
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
      if (!newWindow) {
        toast.warning('Trình duyệt đã chặn cửa sổ mới. Vui lòng cho phép popup hoặc dùng khung tải ảnh bên dưới.');
        return false;
      }
      return true;
    },
    [toast],
  );

  const applySoChungTu = useCallback(
    (rawCode, { showToast = true } = {}) => {
      const soChungTu = extractSoChungTu(rawCode);

      if (!isValidSoChungTu(soChungTu)) {
        toast.error('Không tìm thấy số chứng từ hợp lệ trong mã QR.');
        return false;
      }

      const url = buildUploadUrl(soChungTu);
      setScannedCode(soChungTu);
      setManualCode(soChungTu);
      setUploadUrl(url);
      if (showToast) {
        toast.success(`Đã nhận mã chứng từ: ${soChungTu}`);
      }
      return true;
    },
    [toast],
  );

  const handleDecodedText = useCallback(
    async (decodedText) => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;

      try {
        await stopScannerSafely();

        if (!applySoChungTu(decodedText)) {
          isProcessingRef.current = false;
        }
      } catch (error) {
        console.error('Xử lý QR thất bại:', error);
        toast.error('Không thể xử lý mã QR. Vui lòng thử lại.');
        isProcessingRef.current = false;
      }
    },
    [applySoChungTu, stopScannerSafely, toast],
  );

  const decodeQrFromFile = useCallback(
    async (file) => {
      // 1) Native BarcodeDetector (Chrome/Edge/Android) — tốt với ảnh chụp thực tế
      const nativeFromFile = await decodeWithBarcodeDetector(file);
      if (nativeFromFile) return nativeFromFile;

      const image = await loadImageFromFile(file);
      const nativeFromImage = await decodeWithBarcodeDetector(image);
      if (nativeFromImage) return nativeFromImage;

      // 2) html5-qrcode trên file gốc
      let scanner = recreateScanner();
      try {
        const text = await scanner.scanFile(file, false);
        if (text) return text;
      } catch {
        // thử các biến thể crop/scale bên dưới
      }

      // 3) Cắt vùng + tăng tương phản (QR nhỏ trong ảnh phiếu lớn)
      const variants = buildScanVariants(image);
      for (const variant of variants) {
        const nativeVariant = await decodeWithBarcodeDetector(variant.canvas);
        if (nativeVariant) return nativeVariant;

        try {
          const variantFile = await canvasToFile(variant.canvas, `${variant.label}.png`);
          scanner = ensureScanner();
          const text = await scanner.scanFile(variantFile, false);
          if (text) return text;
        } catch {
          // tiếp tục biến thể khác
        }
      }

      throw new Error('NO_QR_FOUND');
    },
    [ensureScanner, recreateScanner],
  );

  const startScanner = async () => {
    if (isStartingRef.current || isScanningRef.current) return;

    isStartingRef.current = true;
    setIsStarting(true);
    isProcessingRef.current = false;

    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const onSuccess = (decodedText) => {
      handleDecodedText(decodedText);
    };

    const onError = () => {
      // Bỏ qua frame không có QR
    };

    const cameraConfig = {
      fps: 10,
      qrbox: (viewfinderWidth, viewfinderHeight) => {
        const edge = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.75);
        return {
          width: Math.max(180, edge),
          height: Math.max(180, edge),
        };
      },
      disableFlip: false,
    };

    const startWithCamera = async (cameraIdOrConfig) => {
      // Sau mỗi lần fail phải tạo instance mới — tránh "already under transition"
      await stopScannerSafely();
      await wait(120);
      const scanner = recreateScanner();
      await scanner.start(cameraIdOrConfig, cameraConfig, onSuccess, onError);
      return scanner;
    };

    try {
      await stopScannerSafely();
      await wait(50);

      const cameras = await Html5Qrcode.getCameras();
      const errors = [];

      // Ưu tiên cameraId cụ thể (ổn định hơn facingMode trên nhiều máy)
      if (cameras?.length) {
        const preferredId = pickBackCameraId(cameras);
        const orderedIds = [
          preferredId,
          ...cameras.map((cam) => cam.id).filter((id) => id !== preferredId),
        ];

        for (const cameraId of orderedIds) {
          try {
            await startWithCamera(cameraId);
            isScanningRef.current = true;
            if (mountedRef.current) setIsScanning(true);
            return;
          } catch (err) {
            errors.push(err);
            console.warn('Không mở được camera id:', cameraId, err);
          }
        }
      }

      // Fallback facingMode — html5-qrcode chỉ chấp nhận string hoặc { exact }
      for (const facingMode of ['environment', 'user']) {
        try {
          await startWithCamera({ facingMode });
          isScanningRef.current = true;
          if (mountedRef.current) setIsScanning(true);
          return;
        } catch (err) {
          errors.push(err);
          console.warn(`facingMode=${facingMode} thất bại:`, err);
        }

        try {
          await startWithCamera({ facingMode: { exact: facingMode } });
          isScanningRef.current = true;
          if (mountedRef.current) setIsScanning(true);
          return;
        } catch (err) {
          errors.push(err);
          console.warn(`facingMode.exact=${facingMode} thất bại:`, err);
        }
      }

      throw errors[errors.length - 1] || new Error('Không tìm thấy camera.');
    } catch (error) {
      console.error('Không thể mở camera:', error);
      isScanningRef.current = false;
      if (mountedRef.current) setIsScanning(false);
      try {
        await stopScannerSafely();
      } catch {
        // ignore
      }
      toast.error(
        'Không thể mở camera. Vui lòng cấp quyền camera hoặc sử dụng chức năng chọn ảnh QR.',
      );
    } finally {
      isStartingRef.current = false;
      if (mountedRef.current) setIsStarting(false);
    }
  };

  const handleStopScanner = async () => {
    await stopScannerSafely();
  };

  const handleRescan = async () => {
    isProcessingRef.current = false;
    setScannedCode('');
    setUploadUrl('');
    await startScanner();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    setIsReadingFile(true);
    isProcessingRef.current = false;

    try {
      await stopScannerSafely();
      const decodedText = await decodeQrFromFile(file);
      await handleDecodedText(decodedText);
    } catch (error) {
      console.error('Đọc QR từ ảnh thất bại:', error);
      toast.error('Không đọc được mã QR trong ảnh đã chọn.');
      isProcessingRef.current = false;
      try {
        recreateScanner();
      } catch {
        // ignore
      }
    } finally {
      setIsReadingFile(false);
    }
  };

  const handleOpenManual = () => {
    const soChungTu = String(manualCode || '').trim().toUpperCase();
    applySoChungTu(soChungTu, { showToast: true });
  };

  const handleOpenInNewTab = () => {
    if (uploadUrl) {
      openUploadInNewTab(uploadUrl);
      return;
    }
    const soChungTu = String(manualCode || '').trim().toUpperCase();
    if (!applySoChungTu(soChungTu, { showToast: false })) return;
    openUploadInNewTab(buildUploadUrl(soChungTu));
  };

  const showScannerSurface = isScanning || isStarting;

  return (
    <PageLayout maxWidth={uploadUrl ? 'medium' : 'narrow'}>
      <PageHeader
        icon={<QrCodeScannerIcon />}
        title="Tải ảnh"
        subtitle="Quét mã QR trên phiếu sửa chữa để tải ảnh ngay trong trang"
      />

      <Stack spacing={LAYOUT.sectionGap}>
        <Paper
          variant="outlined"
          sx={{
            p: LAYOUT.paperPadding,
            borderRadius: 2,
          }}
        >
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              maxWidth: 420,
              mx: 'auto',
              minHeight: 280,
              borderRadius: 1.5,
              overflow: 'hidden',
              bgcolor: showScannerSurface ? '#111' : 'grey.50',
              border: showScannerSurface ? 'none' : '1px dashed',
              borderColor: 'grey.300',
            }}
          >
            <Box
              id={SCANNER_ELEMENT_ID}
              sx={{
                width: '100%',
                minHeight: 280,
                '& video': {
                  width: '100% !important',
                  borderRadius: 1.5,
                  objectFit: 'cover',
                },
                '& img': {
                  width: '100%',
                  borderRadius: 1.5,
                },
                '& #qr-shaded-region': {
                  borderWidth: '2px !important',
                },
              }}
            />

            {!showScannerSurface && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  px: 2,
                  textAlign: 'center',
                  pointerEvents: 'none',
                }}
              >
                <QrCodeScannerIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Bấm &quot;Bắt đầu quét&quot; để mở camera, hoặc chọn ảnh QR có sẵn.
                </Typography>
              </Box>
            )}

            {isStarting && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(0,0,0,0.35)',
                }}
              >
                <CircularProgress size={32} sx={{ color: '#fff' }} />
              </Box>
            )}
          </Box>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ mt: 2 }}
            useFlexGap
            flexWrap="wrap"
          >
            {!isScanning ? (
              <Button
                variant="contained"
                startIcon={<QrCodeScannerIcon />}
                onClick={startScanner}
                disabled={isStarting || isReadingFile}
              >
                Bắt đầu quét
              </Button>
            ) : (
              <Button
                variant="outlined"
                color="error"
                startIcon={<StopCircleIcon />}
                onClick={handleStopScanner}
              >
                Dừng quét
              </Button>
            )}

            <Button
              variant="outlined"
              startIcon={<PhotoCameraIcon />}
              onClick={() => fileInputRef.current?.click()}
              disabled={isStarting || isReadingFile}
            >
              {isReadingFile ? 'Đang đọc ảnh...' : 'Chọn ảnh QR'}
            </Button>

            {(scannedCode || uploadUrl) && (
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleRescan}
                disabled={isStarting || isReadingFile}
              >
                Quét lại
              </Button>
            )}
          </Stack>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
            Mẹo: chụp gần mã QR, để QR chiếm phần lớn khung hình. Nếu camera không mở được trên HTTP,
            hãy dùng &quot;Chọn ảnh QR&quot; hoặc nhập số chứng từ thủ công.
          </Typography>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleFileChange}
          />
        </Paper>

        <Paper
          variant="outlined"
          sx={{
            p: LAYOUT.paperPadding,
            borderRadius: 2,
          }}
        >
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
              inputProps={{
                autoCapitalize: 'characters',
                spellCheck: false,
              }}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} useFlexGap flexWrap="wrap">
              <Button
                variant="contained"
                color="primary"
                onClick={handleOpenManual}
                disabled={!manualCode.trim()}
              >
                Mở tải ảnh trong app
              </Button>

              <Button
                variant="outlined"
                startIcon={<OpenInNewIcon />}
                onClick={handleOpenInNewTab}
                disabled={!manualCode.trim() && !uploadUrl}
              >
                Mở trang ngoài
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

        {!scannedCode && (
          <Paper
            variant="outlined"
            sx={{
              p: LAYOUT.paperPadding,
              borderRadius: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Quét QR hoặc nhập số chứng từ rồi bấm &quot;Hiển thị trang tải ảnh&quot; để chọn file và tải lên ngay trong app.
            </Typography>
          </Paper>
        )}
      </Stack>
    </PageLayout>
  );
};

export default UploadImageByQr;

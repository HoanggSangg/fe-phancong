import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import PageLayout from '../common/PageLayout';
import PageHeader from '../common/PageHeader';
import DocumentImageUploader from './DocumentImageUploader';
import { useToast } from '../../context/ToastContext';
import { LAYOUT } from '../../constants/layout';

const SCANNER_ELEMENT_ID = 'upload-image-qr-file-reader';
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

  const fullSize = Math.min(1400, Math.max(w, h));
  push(0, 0, w, h, fullSize, 'full');
  push(0, 0, w, Math.floor(h * 0.55), 1000, 'top-half');
  push(Math.floor(w * 0.35), 0, Math.floor(w * 0.65), Math.floor(h * 0.55), 1000, 'top-right');
  push(Math.floor(w * 0.2), Math.floor(h * 0.05), Math.floor(w * 0.6), Math.floor(h * 0.45), 1100, 'center-top');

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
    return codes?.[0]?.rawValue ? String(codes[0].rawValue) : null;
  } catch {
    return null;
  }
};

const renameCaptureFile = (file, soChungTu) => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const base = soChungTu || 'QR';
  const ext = /\.(jpe?g|png|gif|webp|bmp)$/i.test(file.name)
    ? file.name.split('.').pop().toLowerCase()
    : 'jpg';
  return new File([file], `${base}_${stamp}.${ext}`, {
    type: file.type || 'image/jpeg',
    lastModified: file.lastModified || Date.now(),
  });
};

const UploadImageByQr = () => {
  const toast = useToast();

  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraCaptureInputRef = useRef(null);

  const [isReadingFile, setIsReadingFile] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scannedCode, setScannedCode] = useState('');
  const [uploadUrl, setUploadUrl] = useState('');
  const [seedFiles, setSeedFiles] = useState([]);
  const [seedToken, setSeedToken] = useState(0);

  useEffect(() => {
    const el = document.getElementById(SCANNER_ELEMENT_ID);
    if (!el) return undefined;

    scannerRef.current = new Html5Qrcode(SCANNER_ELEMENT_ID, SCANNER_CONFIG);

    return () => {
      try {
        scannerRef.current?.clear();
      } catch {
        // ignore
      }
      scannerRef.current = null;
    };
  }, []);

  const ensureScanner = useCallback(() => {
    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode(SCANNER_ELEMENT_ID, SCANNER_CONFIG);
    }
    return scannerRef.current;
  }, []);

  const openUploadInNewTab = useCallback(
    (url) => {
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
      if (!newWindow) {
        toast.warning('Trình duyệt đã chặn cửa sổ mới.');
        return false;
      }
      return true;
    },
    [toast],
  );

  const applySoChungTu = useCallback(
    (rawCode, { showToast = true, imageFile = null } = {}) => {
      const soChungTu = extractSoChungTu(rawCode);

      if (!isValidSoChungTu(soChungTu)) {
        toast.error('Không tìm thấy số chứng từ hợp lệ trong mã QR.');
        return false;
      }

      const url = buildUploadUrl(soChungTu);
      setScannedCode(soChungTu);
      setManualCode(soChungTu);
      setUploadUrl(url);

      if (imageFile) {
        const renamed = renameCaptureFile(imageFile, soChungTu);
        setSeedFiles([renamed]);
        setSeedToken((prev) => prev + 1);
      }

      if (showToast) {
        toast.success(
          imageFile
            ? `Đã nhận mã ${soChungTu}. Ảnh QR đã thêm vào danh sách tải lên.`
            : `Đã nhận mã chứng từ: ${soChungTu}`,
        );
      }
      return true;
    },
    [toast],
  );

  const decodeQrFromFile = useCallback(
    async (file) => {
      const nativeFromFile = await decodeWithBarcodeDetector(file);
      if (nativeFromFile) return nativeFromFile;

      const image = await loadImageFromFile(file);
      const nativeFromImage = await decodeWithBarcodeDetector(image);
      if (nativeFromImage) return nativeFromImage;

      const scanner = ensureScanner();
      try {
        const text = await scanner.scanFile(file, false);
        if (text) return text;
      } catch {
        // thử crop
      }

      const variants = buildScanVariants(image);
      for (const variant of variants) {
        const nativeVariant = await decodeWithBarcodeDetector(variant.canvas);
        if (nativeVariant) return nativeVariant;

        try {
          const variantFile = await canvasToFile(variant.canvas, `${variant.label}.png`);
          const text = await ensureScanner().scanFile(variantFile, false);
          if (text) return text;
        } catch {
          // tiếp tục
        }
      }

      throw new Error('NO_QR_FOUND');
    },
    [ensureScanner],
  );

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsReadingFile(true);
    try {
      const decodedText = await decodeQrFromFile(file);
      applySoChungTu(decodedText, { imageFile: file });
    } catch (error) {
      console.error('Đọc QR từ ảnh thất bại:', error);
      toast.error('Không đọc được mã QR trong ảnh. Hãy chụp gần, rõ nét hơn.');
    } finally {
      setIsReadingFile(false);
    }
  };

  const handleReset = () => {
    setScannedCode('');
    setUploadUrl('');
    setManualCode('');
    setSeedFiles([]);
    setSeedToken(0);
    cameraCaptureInputRef.current?.click();
  };

  const handleOpenManual = () => {
    applySoChungTu(String(manualCode || '').trim().toUpperCase());
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

  return (
    <PageLayout maxWidth={scannedCode ? 'medium' : 'narrow'}>
      <PageHeader
        icon={<QrCodeScannerIcon />}
        title="Tải ảnh"
        subtitle="Chụp hoặc chọn ảnh mã QR phiếu sửa chữa để tải ảnh chứng từ"
      />

      <Stack spacing={LAYOUT.sectionGap}>
        <Alert severity="info">
          Bấm <strong>Chụp ảnh QR</strong> để mở camera điện thoại, hoặc chọn ảnh QR có sẵn.
          Hệ thống đọc mã chứng từ rồi tự thêm ảnh đó vào phần tải lên.
        </Alert>

        <Paper variant="outlined" sx={{ p: LAYOUT.paperPadding, borderRadius: 2 }}>
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
            <PhotoCameraIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
              Chụp / chọn ảnh mã QR
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Chụp gần, để QR rõ và chiếm phần lớn khung hình.
            </Typography>
          </Box>

          {/* Element ẩn cho html5-qrcode đọc file */}
          <Box id={SCANNER_ELEMENT_ID} sx={{ width: 1, height: 1, overflow: 'hidden', opacity: 0 }} />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} useFlexGap flexWrap="wrap">
            <Button
              variant="contained"
              startIcon={isReadingFile ? <CircularProgress size={16} color="inherit" /> : <PhotoCameraIcon />}
              onClick={() => cameraCaptureInputRef.current?.click()}
              disabled={isReadingFile}
            >
              {isReadingFile ? 'Đang đọc QR...' : 'Chụp ảnh QR'}
            </Button>

            <Button
              variant="outlined"
              startIcon={<QrCodeScannerIcon />}
              onClick={() => fileInputRef.current?.click()}
              disabled={isReadingFile}
            >
              Chọn ảnh có sẵn
            </Button>

            {(scannedCode || uploadUrl) && (
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleReset}
                disabled={isReadingFile}
              >
                Chụp mã khác
              </Button>
            )}
          </Stack>

          <input
            ref={cameraCaptureInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={handleFileChange}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleFileChange}
          />
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

        {scannedCode && (
          <DocumentImageUploader
            soChungTu={scannedCode}
            seedFiles={seedFiles}
            seedToken={seedToken}
          />
        )}

        {!scannedCode && (
          <Paper variant="outlined" sx={{ p: LAYOUT.paperPadding, borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Chụp/chọn ảnh QR hoặc nhập số chứng từ để mở phần tải ảnh.
            </Typography>
          </Paper>
        )}
      </Stack>
    </PageLayout>
  );
};

export default UploadImageByQr;

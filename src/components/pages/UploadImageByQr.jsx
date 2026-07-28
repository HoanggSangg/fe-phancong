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
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import ImageIcon from '@mui/icons-material/Image';
import jsQR from 'jsqr';
import PageLayout from '../common/PageLayout';
import PageHeader from '../common/PageHeader';
import DocumentImageUploader from './DocumentImageUploader';
import { useToast } from '../../context/ToastContext';
import { LAYOUT } from '../../constants/layout';

const UPLOAD_BASE_URL = 'http://api2026.otobathanh.vn/upload.html';
const MAX_SOURCE_SIZE = 2800;
const MAX_PROCESS_SIZE = 3200;

export const extractSoChungTu = (qrText) => {
  const rawValue = String(qrText || '').trim();
  if (!rawValue) return '';

  try {
    const url = new URL(rawValue);
    return String(url.searchParams.get('khoa') || url.searchParams.get('soChungTu') || '')
      .trim()
      .toUpperCase();
  } catch {
    return rawValue.toUpperCase();
  }
};

export const isValidSoChungTu = (value) => /^TT[A-Z0-9]+$/.test(value);

export const buildUploadUrl = (soChungTu) =>
  `${UPLOAD_BASE_URL}?soChungTu=${encodeURIComponent(soChungTu)}`;

export const getTopRightQuarter = (width, height) => ({
  sx: Math.floor(width * 0.5),
  sy: 0,
  sw: Math.floor(width * 0.5),
  sh: Math.floor(height * 0.5),
});

export const getTopRightQuarterWithPadding = (width, height) => ({
  sx: Math.floor(width * 0.42),
  sy: 0,
  sw: Math.floor(width * 0.58),
  sh: Math.floor(height * 0.58),
});

const getScaledSize = (width, height) => {
  const longest = Math.max(width, height);
  if (longest <= MAX_SOURCE_SIZE) return { width, height };
  const ratio = MAX_SOURCE_SIZE / longest;
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
};

const calculateSafeZoom = (cropWidth, cropHeight, requestedZoom) => {
  const longestAfterZoom = Math.max(cropWidth, cropHeight) * requestedZoom;
  if (longestAfterZoom <= MAX_PROCESS_SIZE) return requestedZoom;
  return MAX_PROCESS_SIZE / Math.max(cropWidth, cropHeight);
};

const yieldToBrowser = () => new Promise((resolve) => setTimeout(resolve, 0));

const cloneImageData = (imageData) =>
  new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);

const applyGrayscaleContrast = (imageData, contrast = 1.6) => {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const adjusted = Math.max(0, Math.min(255, (gray - 128) * contrast + 128));
    data[i] = adjusted;
    data[i + 1] = adjusted;
    data[i + 2] = adjusted;
  }
  return imageData;
};

const applyThreshold = (imageData, threshold) => {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const value = gray >= threshold ? 255 : 0;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }
  return imageData;
};

const invertImage = (imageData) => {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i];
    data[i + 1] = 255 - data[i + 1];
    data[i + 2] = 255 - data[i + 2];
  }
  return imageData;
};

const decodeCanvas = (canvas, imageDataOverride = null) => {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return '';

  const imageData =
    imageDataOverride || context.getImageData(0, 0, canvas.width, canvas.height);

  const result = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth',
  });

  return result?.data || '';
};

const drawCropToCanvas = (source, region, requestedZoom, targetCanvas) => {
  const zoom = calculateSafeZoom(region.sw, region.sh, requestedZoom);
  const targetWidth = Math.max(1, Math.round(region.sw * zoom));
  const targetHeight = Math.max(1, Math.round(region.sh * zoom));

  targetCanvas.width = targetWidth;
  targetCanvas.height = targetHeight;

  const context = targetCanvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;

  context.clearRect(0, 0, targetWidth, targetHeight);
  context.imageSmoothingEnabled = false;
  context.drawImage(
    source,
    region.sx,
    region.sy,
    region.sw,
    region.sh,
    0,
    0,
    targetWidth,
    targetHeight,
  );

  return targetCanvas;
};

const loadOrientedSource = async (file, sourceCanvas) => {
  let bitmap = null;
  let objectUrl = '';
  let image = null;

  try {
    if (typeof createImageBitmap === 'function') {
      try {
        bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      } catch {
        try {
          bitmap = await createImageBitmap(file);
        } catch {
          bitmap = null;
        }
      }
    }

    if (bitmap) {
      const { width, height } = getScaledSize(bitmap.width, bitmap.height);
      sourceCanvas.width = width;
      sourceCanvas.height = height;
      const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(bitmap, 0, 0, width, height);
      return sourceCanvas;
    }

    objectUrl = URL.createObjectURL(file);
    image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Không thể xử lý ảnh vừa chụp.'));
      img.src = objectUrl;
    });

    const { width, height } = getScaledSize(
      image.naturalWidth || image.width,
      image.naturalHeight || image.height,
    );
    sourceCanvas.width = width;
    sourceCanvas.height = height;
    const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    return sourceCanvas;
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    if (bitmap?.close) {
      try {
        bitmap.close();
      } catch {
        // ignore
      }
    }
  }
};

const scanRegionWithVariants = async ({
  source,
  region,
  zoomLevels,
  contrastLevels,
  thresholds,
  processingCanvas,
  tryInvertAtEnd = false,
}) => {
  let attempts = 0;

  const bump = async () => {
    attempts += 1;
    if (attempts % 4 === 0) await yieldToBrowser();
  };

  for (const zoom of zoomLevels) {
    const canvas = drawCropToCanvas(source, region, zoom, processingCanvas);
    if (!canvas) continue;

    let result = decodeCanvas(canvas);
    await bump();
    if (result) return result;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) continue;
    const original = context.getImageData(0, 0, canvas.width, canvas.height);

    for (const contrast of contrastLevels) {
      const contrasted = applyGrayscaleContrast(cloneImageData(original), contrast);
      result = decodeCanvas(canvas, contrasted);
      await bump();
      if (result) return result;
    }

    for (const threshold of thresholds) {
      const thresholded = applyThreshold(cloneImageData(original), threshold);
      result = decodeCanvas(canvas, thresholded);
      await bump();
      if (result) return result;
    }

    if (tryInvertAtEnd) {
      const inverted = invertImage(cloneImageData(original));
      result = decodeCanvas(canvas, inverted);
      await bump();
      if (result) return result;
    }
  }

  return '';
};

const scanCapturedImage = async (sourceCanvas, processingCanvas, onStage) => {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  const regions = [
    {
      name: 'full-image',
      label: 'Đang quét toàn bộ ảnh…',
      region: {
        sx: 0,
        sy: 0,
        sw: width,
        sh: height,
      },
      zoomLevels: [1],
      contrastLevels: [1.6],
      thresholds: [145],
      tryInvertAtEnd: true,
    },
    {
      name: 'top-right-quarter',
      label: 'Chưa thấy QR — đang phóng góc trên bên phải…',
      region: getTopRightQuarter(width, height),
      zoomLevels: [1.5, 2, 3, 4],
      contrastLevels: [1.3, 1.6, 2],
      thresholds: [90, 120, 145, 170, 200],
      tryInvertAtEnd: false,
    },
    {
      name: 'top-right-padded',
      label: 'Đang quét góc trên phải (mở rộng)…',
      region: getTopRightQuarterWithPadding(width, height),
      zoomLevels: [1.5, 2, 3],
      contrastLevels: [1.6],
      thresholds: [120, 145, 170],
      tryInvertAtEnd: false,
    },
    {
      name: 'right-half',
      label: 'Đang quét nửa bên phải…',
      region: {
        sx: Math.floor(width / 2),
        sy: 0,
        sw: Math.floor(width / 2),
        sh: height,
      },
      zoomLevels: [1, 1.5],
      contrastLevels: [1.6],
      thresholds: [145],
      tryInvertAtEnd: false,
    },
  ];

  for (const item of regions) {
    onStage?.(item.label);
    const result = await scanRegionWithVariants({
      source: sourceCanvas,
      region: item.region,
      zoomLevels: item.zoomLevels,
      contrastLevels: item.contrastLevels,
      thresholds: item.thresholds,
      processingCanvas,
      tryInvertAtEnd: item.tryInvertAtEnd,
    });

    if (result) return result;
    await yieldToBrowser();
  }

  return '';
};

const renameCaptureFile = (file, soChungTu) => {
  // Dùng Date.now() (ms) để tránh trùng tên khi chụp liên tiếp trong cùng giây
  const stamp = Date.now();
  const base = String(soChungTu || 'QR').replace(/[^\w.-]+/g, '_').slice(0, 40) || 'QR';
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

  const captureInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const sourceCanvasRef = useRef(null);
  const processingCanvasRef = useRef(null);
  const isImageProcessingRef = useRef(false);
  const previewUrlRef = useRef('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [scannedCode, setScannedCode] = useState('');
  const [uploadUrl, setUploadUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [seedFiles, setSeedFiles] = useState([]);
  const [seedToken, setSeedToken] = useState(0);

  useEffect(() => {
    sourceCanvasRef.current = document.createElement('canvas');
    processingCanvasRef.current = document.createElement('canvas');

    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = '';
      }
    };
  }, []);

  const clearPreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = '';
    }
    setPreviewUrl('');
  }, []);

  const updatePreviewFromRegion = useCallback(
    (sourceCanvas, region) => {
      const canvas = processingCanvasRef.current;
      if (!canvas) return;

      drawCropToCanvas(sourceCanvas, region, 2, canvas);
      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
          const url = URL.createObjectURL(blob);
          previewUrlRef.current = url;
          setPreviewUrl(url);
        },
        'image/jpeg',
        0.72,
      );
    },
    [],
  );

  const openUploadUrl = useCallback(
    (url, { autoOpen = false } = {}) => {
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
      if (!newWindow) {
        toast.warning(
          autoOpen
            ? 'Trình duyệt đã chặn cửa sổ mới. Vui lòng bấm Mở trang tải ảnh.'
            : 'Trình duyệt đã chặn cửa sổ mới. Vui lòng cho phép popup hoặc thử lại.',
        );
        return false;
      }
      return true;
    },
    [toast],
  );

  const applySuccess = useCallback(
    (qrText, imageFile = null) => {
      const soChungTu = extractSoChungTu(qrText);

      if (!isValidSoChungTu(soChungTu)) {
        toast.error('Đã đọc được QR nhưng không tìm thấy số chứng từ hợp lệ.');
        return false;
      }

      const url = buildUploadUrl(soChungTu);
      setScannedCode(soChungTu);
      setManualCode(soChungTu);
      setUploadUrl(url);

      if (imageFile) {
        setSeedFiles([renameCaptureFile(imageFile, soChungTu)]);
        setSeedToken((prev) => prev + 1);
      }

      toast.success('Đã đọc được mã QR.');
      openUploadUrl(url, { autoOpen: true });
      return true;
    },
    [openUploadUrl, toast],
  );

  const handleCapturedImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;
    if (isImageProcessingRef.current) return;

    isImageProcessingRef.current = true;
    setIsProcessing(true);
    setStatusText('Đang quét toàn bộ ảnh…');
    clearPreview();

    try {
      const sourceCanvas = sourceCanvasRef.current;
      const processingCanvas = processingCanvasRef.current;
      if (!sourceCanvas || !processingCanvas) {
        throw new Error('Không thể xử lý ảnh vừa chụp.');
      }

      await loadOrientedSource(file, sourceCanvas);

      const topRight = getTopRightQuarter(sourceCanvas.width, sourceCanvas.height);
      updatePreviewFromRegion(sourceCanvas, topRight);

      setStatusText('Đang quét toàn bộ ảnh…');
      const qrText = await scanCapturedImage(sourceCanvas, processingCanvas, setStatusText);

      if (!qrText) {
        toast.error(
          'Không đọc được mã QR. Vui lòng chụp lại và đảm bảo mã QR không bị mờ hoặc lóa sáng.',
        );
        return;
      }

      applySuccess(qrText, file);
    } catch (error) {
      console.error('Xử lý ảnh QR thất bại:', error);
      toast.error(error?.message || 'Không thể xử lý ảnh vừa chụp.');
    } finally {
      isImageProcessingRef.current = false;
      setIsProcessing(false);
      setStatusText('');
      if (captureInputRef.current) captureInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const handleOpenManual = () => {
    const soChungTu = String(manualCode || '').trim().toUpperCase();
    if (!isValidSoChungTu(soChungTu)) {
      toast.error('Đã đọc được QR nhưng không tìm thấy số chứng từ hợp lệ.');
      return;
    }

    const url = buildUploadUrl(soChungTu);
    setScannedCode(soChungTu);
    setManualCode(soChungTu);
    setUploadUrl(url);
    openUploadUrl(url);
  };

  const handleOpenResult = () => {
    if (uploadUrl) {
      openUploadUrl(uploadUrl);
      return;
    }
    handleOpenManual();
  };

  const handleReshoot = () => {
    if (isImageProcessingRef.current) return;
    setScannedCode('');
    setUploadUrl('');
    setSeedFiles([]);
    setSeedToken(0);
    clearPreview();
    captureInputRef.current?.click();
  };

  return (
    <PageLayout maxWidth={scannedCode ? 'medium' : 'narrow'}>
      <PageHeader
        icon={<QrCodeScannerIcon />}
        title="Tải ảnh"
        subtitle="Chụp mã QR trên phiếu sửa chữa (hoạt động trên HTTP)."
      />

      <Stack spacing={LAYOUT.sectionGap}>
        <Alert severity="info">
          Bấm <strong>Chụp mã QR</strong> để mở camera hệ thống. Hệ thống quét{' '}
          <strong>toàn bộ ảnh trước</strong>; nếu chưa thấy QR mới phóng / quét góc trên bên phải.
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
            <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
              Chụp rõ mã QR trên phiếu
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Tránh mờ / lóa sáng. Không dùng webcam trình duyệt trên HTTP.
            </Typography>
          </Box>

          {previewUrl && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" fontWeight={700} sx={{ display: 'block', mb: 0.75 }}>
                Vùng góc trên phải (dùng khi quét full chưa thấy QR)
              </Typography>
              <Box
                component="img"
                src={previewUrl}
                alt="Vùng QR góc trên phải"
                sx={{
                  display: 'block',
                  width: '100%',
                  maxHeight: 220,
                  objectFit: 'contain',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'success.light',
                  bgcolor: '#111',
                }}
              />
            </Box>
          )}

          {isProcessing && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">
                {statusText || 'Đang quét toàn bộ ảnh…'}
              </Typography>
            </Box>
          )}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} useFlexGap flexWrap="wrap">
            <Button
              variant="contained"
              startIcon={isProcessing ? <CircularProgress size={16} color="inherit" /> : <PhotoCameraIcon />}
              onClick={() => captureInputRef.current?.click()}
              disabled={isProcessing}
            >
              {isProcessing ? 'Đang tìm QR…' : 'Chụp mã QR'}
            </Button>

            <Button
              variant="outlined"
              startIcon={<ImageIcon />}
              onClick={() => galleryInputRef.current?.click()}
              disabled={isProcessing}
            >
              Chọn ảnh có sẵn
            </Button>

            {(scannedCode || uploadUrl || previewUrl) && (
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleReshoot}
                disabled={isProcessing}
              >
                Chụp lại
              </Button>
            )}
          </Stack>

          <input
            ref={captureInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={handleCapturedImage}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleCapturedImage}
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
              disabled={isProcessing}
            />

            <Button
              variant="contained"
              color="primary"
              startIcon={<OpenInNewIcon />}
              onClick={handleOpenResult}
              disabled={isProcessing || (!manualCode.trim() && !uploadUrl)}
            >
              Mở trang tải ảnh
            </Button>
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
      </Stack>
    </PageLayout>
  );
};

export default UploadImageByQr;

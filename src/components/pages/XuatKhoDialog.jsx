import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Collapse,
  Dialog,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useToast } from '../../context/ToastContext';
import { ACCESS_HINT } from '../../constants/accessUrls';
import { useIsMobile } from '../../hooks/useIsMobile';
import { commitXuatKho, getXuatKhoLichSu, lookupHanghoaByCode } from '../../utils/xuatKhoApi';

const SCANNER_ID = 'xuat-kho-hanghoa-reader';

const BARCODE_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODABAR,
];

const isSecureCameraContext = () => {
  if (typeof window === 'undefined') return false;
  if (window.isSecureContext) return true;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
};

const extractHanghoaCode = (rawValue) => {
  const text = String(rawValue || '').trim();
  if (!text) return '';
  try {
    const url = new URL(text);
    const fromQuery = String(
      url.searchParams.get('ma')
      || url.searchParams.get('maHangHoa')
      || url.searchParams.get('khoa')
      || url.searchParams.get('khoaHangHoa')
      || '',
    ).trim();
    if (fromQuery) return fromQuery;
  } catch {
    // không phải URL
  }
  return text.split(/\s|\n|\r/)[0] || text;
};

const fmtQty = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * 1000) / 1000);
};

const normHanghoa = (value) => String(value || '').trim().toUpperCase().replace(/\s+/g, '');

const rowMatchesHanghoa = (row, item, scanned) => {
  const scannedNorm = normHanghoa(scanned);
  const rowMa = normHanghoa(row?.ma);
  const rowKhoa = normHanghoa(row?.khoa);
  if (item?.khoa && row?.khoa && String(row.khoa) === String(item.khoa)) return true;
  if (item?.ma && rowMa && rowMa === normHanghoa(item.ma)) return true;
  if (scannedNorm && (rowMa === scannedNorm || rowKhoa === scannedNorm)) return true;
  return false;
};

const QtyStepper = ({ value, min = 1, max, disabled, onChange }) => {
  const qty = Number(value) || 0;
  return (
    <Stack
      direction="row"
      alignItems="center"
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        flexShrink: 0,
        bgcolor: 'background.paper',
      }}
    >
      <IconButton
        size="small"
        disabled={disabled || qty <= min}
        onClick={() => onChange(Math.max(min, qty - 1))}
        sx={{ borderRadius: 0, width: 40, height: 40 }}
        aria-label="Giảm"
      >
        <RemoveIcon fontSize="small" />
      </IconButton>
      <Typography
        sx={{
          minWidth: 36,
          textAlign: 'center',
          fontWeight: 800,
          fontSize: 16,
          lineHeight: '40px',
        }}
      >
        {fmtQty(qty)}
      </Typography>
      <IconButton
        size="small"
        disabled={disabled || (Number.isFinite(max) && qty >= max)}
        onClick={() => onChange(Number.isFinite(max) ? Math.min(max, qty + 1) : qty + 1)}
        sx={{ borderRadius: 0, width: 40, height: 40 }}
        aria-label="Tăng"
      >
        <AddIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
};

const XuatKhoDialog = ({
  open,
  onClose,
  khoaBaoGia = '',
  plateNumber = '',
  roCode = '',
}) => {
  const toast = useToast();
  const isMobile = useIsMobile();
  const scannerRef = useRef(null);
  const lookingCodesRef = useRef(new Set());
  const pendingByCodeRef = useRef(new Map());
  const cartRef = useRef([]);
  const cameraHoldRef = useRef({ code: '', lastSeen: 0 });
  const inputRef = useRef(null);

  const [manualCode, setManualCode] = useState('');
  const [cart, setCart] = useState([]);
  const [looking, setLooking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);
  const [historySummary, setHistorySummary] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) {
      setIsScanning(false);
      return;
    }
    try {
      if (scanner.isScanning) await scanner.stop();
    } catch {
      // ignore
    }
    try {
      await scanner.clear();
    } catch {
      // ignore
    }
    scannerRef.current = null;
    setIsScanning(false);
  }, []);

  const resetState = useCallback(() => {
    setManualCode('');
    setCart([]);
    setLooking(false);
    setSubmitting(false);
    setNotice(null);
    setHistorySummary([]);
    setHistoryOpen(false);
    setHistoryLoading(false);
    cartRef.current = [];
    lookingCodesRef.current.clear();
    pendingByCodeRef.current.clear();
    cameraHoldRef.current = { code: '', lastSeen: 0 };
  }, []);

  const loadHistory = useCallback(async () => {
    const khoa = String(khoaBaoGia || '').trim();
    const ro = String(roCode || '').trim();
    if (!khoa && !ro) {
      setHistorySummary([]);
      return;
    }

    setHistoryLoading(true);
    try {
      const data = await getXuatKhoLichSu({ khoaBaoGia: khoa, soBaoGia: ro });
      const summary = Array.isArray(data?.summary) ? data.summary : [];
      setHistorySummary(summary);
      setHistoryOpen(summary.length > 0);
    } catch {
      setHistorySummary([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [khoaBaoGia, roCode]);

  useEffect(() => {
    if (!open) {
      stopScanner();
      resetState();
      return undefined;
    }
    loadHistory();
    if (!isMobile) {
      const timer = window.setTimeout(() => inputRef.current?.focus(), 250);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [open, isMobile, loadHistory, resetState, stopScanner]);

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

  const applyCartQty = useCallback((item, scanned, addQty) => {
    const qty = Math.max(1, Number(addQty) || 1);
    const prev = cartRef.current;
    const idx = prev.findIndex((row) => rowMatchesHanghoa(row, item, scanned));
    if (idx >= 0) {
      const nextQty = Number(prev[idx].soLuong) + qty;
      const next = prev.map((row, index) => (
        index === idx
          ? { ...row, soLuong: nextQty, tonHienTai: item.tonHienTai ?? row.tonHienTai }
          : row
      ));
      cartRef.current = next;
      setCart(next);
      return { mode: 'inc', nextQty, label: next[idx].ma || next[idx].khoa };
    }
    const next = [...prev, {
      khoa: item.khoa,
      ma: item.ma,
      ten: item.ten,
      donViTinh: item.donViTinh,
      tonHienTai: item.tonHienTai,
      quayKe: item.quayKe,
      soLuong: qty,
    }];
    cartRef.current = next;
    setCart(next);
    return { mode: 'add', nextQty: qty, label: item.ten || item.ma || item.khoa };
  }, []);

  const addHanghoa = useCallback(async (rawCode) => {
    const code = extractHanghoaCode(rawCode);
    if (!code) {
      toast.error('Chưa có mã hàng hóa.');
      return false;
    }
    if (submitting) return false;

    const codeKey = normHanghoa(code);
    const existing = cartRef.current.find((row) => rowMatchesHanghoa(row, null, code));
    if (existing) {
      const result = applyCartQty(existing, code, 1);
      toast.success(`+1 ${result.label} → ${fmtQty(result.nextQty)}`);
      setManualCode('');
      setNotice(null);
      return true;
    }

    if (lookingCodesRef.current.has(codeKey)) {
      pendingByCodeRef.current.set(codeKey, (pendingByCodeRef.current.get(codeKey) || 0) + 1);
      setManualCode('');
      return true;
    }

    lookingCodesRef.current.add(codeKey);
    setLooking(true);
    setNotice(null);
    try {
      const item = await lookupHanghoaByCode(code);
      if (!item?.khoa) {
        toast.error(`Không đúng mã hàng hóa '${code}'.`);
        return false;
      }

      const extra = pendingByCodeRef.current.get(codeKey) || 0;
      pendingByCodeRef.current.delete(codeKey);
      const result = applyCartQty(item, code, 1 + extra);
      if (result.mode === 'inc') {
        toast.success(`+${fmtQty(1 + extra)} ${result.label} → ${fmtQty(result.nextQty)}`);
      } else if (result.nextQty > 1) {
        toast.success(`Đã thêm ${fmtQty(result.nextQty)} × ${result.label}`);
      } else {
        toast.success(`Đã thêm: ${result.label}`);
      }
      setManualCode('');
      return true;
    } catch (err) {
      pendingByCodeRef.current.delete(codeKey);
      const message = err?.response?.data?.message || err?.message || `Không đúng mã hàng hóa '${code}'.`;
      setNotice({ severity: 'error', message });
      toast.error(message);
      return false;
    } finally {
      lookingCodesRef.current.delete(codeKey);
      setLooking(lookingCodesRef.current.size > 0);
    }
  }, [applyCartQty, submitting, toast]);

  const handleScanDecoded = useCallback(async (decodedText) => {
    const code = extractHanghoaCode(decodedText);
    if (!code) return;
    const codeKey = normHanghoa(code);
    const hold = cameraHoldRef.current;
    hold.lastSeen = Date.now();
    if (hold.code === codeKey) return;
    hold.code = codeKey;
    await addHanghoa(decodedText);
  }, [addHanghoa]);

  const startScanner = useCallback(async () => {
    if (isStarting || isScanning) return;
    if (!isSecureCameraContext()) {
      toast.error(`Cần HTTPS để mở camera. ${ACCESS_HINT}`);
      return;
    }

    setIsStarting(true);
    try {
      await stopScanner();
      setIsScanning(true);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const scanner = new Html5Qrcode(SCANNER_ID, {
        verbose: false,
        formatsToSupport: BARCODE_FORMATS,
      });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: (viewWidth, viewHeight) => ({
            width: Math.min(Math.floor(viewWidth * 0.92), Math.max(0, viewWidth - 16)),
            height: Math.min(Math.floor(viewHeight * 0.62), Math.max(0, viewHeight - 16)),
          }),
          aspectRatio: 1,
          disableFlip: false,
        },
        async (decodedText) => {
          await handleScanDecoded(decodedText);
        },
        () => {},
      );
    } catch {
      scannerRef.current = null;
      setIsScanning(false);
      toast.error('Không mở được camera để quét mã hàng hóa.');
    } finally {
      setIsStarting(false);
    }
  }, [handleScanDecoded, isScanning, isStarting, stopScanner, toast]);

  const handleLookupManual = () => {
    addHanghoa(manualCode);
  };

  const setQty = (khoa, nextQty) => {
    setCart((prev) => prev.map((row) => (
      row.khoa === khoa ? { ...row, soLuong: Math.max(1, Number(nextQty) || 1) } : row
    )));
  };

  const removeRow = (khoa) => {
    setCart((prev) => prev.filter((row) => row.khoa !== khoa));
  };

  const handleExport = async () => {
    const key = String(khoaBaoGia || '').trim().toUpperCase();
    if (!key || submitting) return;

    const lines = cart
      .map((row) => ({
        khoaHangHoa: row.khoa,
        soLuong: Number(row.soLuong),
        ma: row.ma,
        ten: row.ten,
        donViTinh: row.donViTinh,
        tonHienTai: row.tonHienTai,
      }))
      .filter((row) => row.khoaHangHoa && Number.isFinite(row.soLuong) && row.soLuong > 0);

    if (!lines.length) {
      toast.info('Hãy quét mã hàng hóa trước khi xuất.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await commitXuatKho({
        khoaBaoGia: key,
        soXe: plateNumber,
        soBaoGia: roCode,
        lines: lines.map((row) => ({
          khoaHangHoa: row.khoaHangHoa,
          soLuong: row.soLuong,
        })),
      });
      const count = Array.isArray(result?.lines) ? result.lines.length : lines.length;
      toast.success(`Đã xuất ${count} mã.`);
      setNotice(null);
      setCart([]);
      await loadHistory();
    } catch (err) {
      const data = err?.response?.data || {};
      const message = data.detail || data.message || data.title || err?.message || 'Xuất kho thất bại.';
      setNotice({
        severity: 'error',
        message: `API /xe/xuat-kho: ${message}`,
      });
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    stopScanner();
    onClose?.();
  };

  const vehicleLabel = [plateNumber, roCode || khoaBaoGia].filter(Boolean).join(' · ');

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullScreen={isMobile}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: isMobile
          ? {
              m: 0,
              height: '100dvh',
              maxHeight: '100dvh',
              borderRadius: 0,
              display: 'flex',
              flexDirection: 'column',
            }
          : { borderRadius: 2 },
      }}
    >
      <Box
        sx={{
          px: 1.5,
          pt: isMobile ? 'max(8px, env(safe-area-inset-top))' : 1,
          pb: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderBottom: 1,
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        <Inventory2Icon color="primary" fontSize="small" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={800} lineHeight={1.2}>
            Xuất phụ tùng
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {vehicleLabel}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} disabled={submitting} aria-label="Đóng" size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          px: 1.5,
          py: 1.25,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.25,
        }}
      >
        <Stack direction="row" spacing={0.75} alignItems="center">
          {!isScanning ? (
            <Button
              variant="contained"
              onClick={startScanner}
              disabled={isStarting || submitting}
              sx={{ minWidth: 48, height: 44, px: 1.25 }}
              aria-label="Quét mã"
            >
              {isStarting ? <CircularProgress size={22} color="inherit" /> : <QrCodeScannerIcon />}
            </Button>
          ) : (
            <Button
              variant="contained"
              color="error"
              onClick={stopScanner}
              sx={{ minWidth: 48, height: 44, px: 1.25 }}
              aria-label="Dừng camera"
            >
              <StopCircleIcon />
            </Button>
          )}
          <TextField
            inputRef={inputRef}
            size="small"
            placeholder="Mã hàng hóa"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleLookupManual();
              }
            }}
            fullWidth
            autoComplete="off"
            disabled={submitting}
            sx={{
              '& .MuiInputBase-root': { height: 44, fontSize: 16 },
            }}
          />
          <Button
            variant="outlined"
            onClick={handleLookupManual}
            disabled={submitting || !manualCode.trim()}
            sx={{ height: 44, minWidth: 64, px: 1.25, whiteSpace: 'nowrap' }}
          >
            {looking ? '…' : 'Tìm'}
          </Button>
        </Stack>

        <Box
          id={SCANNER_ID}
          sx={{
            width: '100%',
            height: isScanning || isStarting ? (isMobile ? 'min(48dvh, 440px)' : 400) : 0,
            minHeight: isScanning || isStarting ? (isMobile ? 320 : 360) : 0,
            overflow: 'hidden',
            borderRadius: 1.5,
            bgcolor: isScanning || isStarting ? '#111' : 'transparent',
            '& video': {
              width: '100% !important',
              height: '100% !important',
              objectFit: 'cover',
              borderRadius: 1.5,
            },
            '& img': { display: 'none' },
          }}
        />
        {isScanning && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: -0.5 }}>
            Giữ camera, quét lần lượt từng mã. Quét trùng thì cộng số lượng.
          </Typography>
        )}

        {notice && (
          <Alert severity={notice.severity} sx={{ py: 0.25, px: 1 }} onClose={() => setNotice(null)}>
            {notice.message}
          </Alert>
        )}

        <Box sx={{ flex: 1, minHeight: 0 }}>
          {cart.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
              Quét mã để thêm. Quét lại cùng mã để cộng số lượng, rồi xuất.
            </Typography>
          ) : (
            <Stack spacing={0.75}>
              <Typography variant="caption" fontWeight={800} color="text.secondary">
                SẼ XUẤT · {cart.length}
              </Typography>
              {cart.map((row) => (
                <Box
                  key={row.khoa}
                  sx={{
                    px: 1,
                    py: 0.75,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1.5,
                    bgcolor: 'background.paper',
                  }}
                >
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={700} noWrap>
                        {row.ten || row.ma}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                        {row.ma || row.khoa}
                        {row.donViTinh ? ` · ${row.donViTinh}` : ''}
                        {` · tồn ${fmtQty(row.tonHienTai)}`}
                      </Typography>
                    </Box>
                    <QtyStepper
                      value={row.soLuong}
                      disabled={submitting}
                      onChange={(qty) => setQty(row.khoa, qty)}
                    />
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => removeRow(row.khoa)}
                      disabled={submitting}
                      aria-label="Xóa"
                      sx={{ width: 36, height: 36 }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Box>

        {historyLoading && historySummary.length === 0 && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 0.5 }}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">
              Đang tải hàng đã xuất…
            </Typography>
          </Stack>
        )}

        {historySummary.length > 0 && (
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1.5,
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            <Button
              fullWidth
              color="inherit"
              onClick={() => setHistoryOpen((openNow) => !openNow)}
              endIcon={
                <ExpandMoreIcon
                  sx={{ transform: historyOpen ? 'rotate(180deg)' : 'none', transition: '0.15s' }}
                />
              }
              sx={{
                justifyContent: 'space-between',
                px: 1.25,
                py: 0.75,
                minHeight: 40,
                bgcolor: 'action.hover',
              }}
            >
              Đã xuất
              {` (${historySummary.length})`}
            </Button>
            <Collapse in={historyOpen}>
              <Stack spacing={0.5} sx={{ px: 1.25, pb: 1, pt: 0.5 }}>
                {historySummary.map((row) => (
                  <Box key={row.khoaHangHoa || row.ma}>
                    <Typography variant="caption" sx={{ display: 'block' }}>
                      <strong>{fmtQty(row.soLuong)}</strong>
                      {row.donViTinh ? ` ${row.donViTinh}` : ''}
                      {' · '}
                      {row.ten || row.ma || row.khoaHangHoa}
                    </Typography>
                    {(row.ma || row.khoaHangHoa) && row.ten && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {row.ma || row.khoaHangHoa}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Stack>
            </Collapse>
          </Box>
        )}
      </Box>

      <Box
        sx={{
          px: 1.5,
          pt: 1,
          pb: isMobile ? 'max(12px, env(safe-area-inset-bottom))' : 1.25,
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          gap: 1,
          flexShrink: 0,
        }}
      >
        {!isMobile && (
          <Button onClick={handleClose} disabled={submitting} color="inherit" sx={{ height: 44 }}>
            Đóng
          </Button>
        )}
        <Button
          variant="contained"
          fullWidth
          onClick={handleExport}
          disabled={looking || submitting || cart.length === 0}
          sx={{ height: 48, fontSize: 16 }}
        >
          {submitting ? 'Đang lưu…' : `Xuất${cart.length ? ` (${cart.length})` : ''}`}
        </Button>
      </Box>
    </Dialog>
  );
};

export default XuatKhoDialog;

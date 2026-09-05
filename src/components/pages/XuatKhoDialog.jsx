import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Collapse,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useToast } from '../../context/ToastContext';
import { commitXuatKho, getXuatKhoLichSu, lookupHanghoaByCode } from '../../utils/xuatKhoApi';
import { extractHanghoaCode, fmtQty, normHanghoa, rowMatchesHanghoa } from '../../utils/hanghoaScan';

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

const XuatKhoDialog = forwardRef(({
  khoaBaoGia = '',
  plateNumber = '',
  roCode = '',
}, ref) => {
  const toast = useToast();
  const lookingCodesRef = useRef(new Set());
  const pendingByCodeRef = useRef(new Map());
  const cartRef = useRef([]);
  const prevKhoaRef = useRef('');

  const [cart, setCart] = useState([]);
  const [looking, setLooking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);
  const [historySummary, setHistorySummary] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  const resetCart = useCallback(() => {
    setCart([]);
    setLooking(false);
    setSubmitting(false);
    setNotice(null);
    cartRef.current = [];
    lookingCodesRef.current.clear();
    pendingByCodeRef.current.clear();
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
    const khoa = String(khoaBaoGia || '').trim();
    if (prevKhoaRef.current && prevKhoaRef.current !== khoa) {
      resetCart();
    }
    prevKhoaRef.current = khoa;
    loadHistory();
  }, [khoaBaoGia, loadHistory, resetCart]);

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
      setNotice(null);
      return true;
    }

    if (lookingCodesRef.current.has(codeKey)) {
      pendingByCodeRef.current.set(codeKey, (pendingByCodeRef.current.get(codeKey) || 0) + 1);
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

  useImperativeHandle(ref, () => ({
    addHanghoa,
  }), [addHanghoa]);

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

  const vehicleLabel = [plateNumber, roCode || khoaBaoGia].filter(Boolean).join(' · ');

  return (
    <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25 }}>
        <Inventory2Icon color="primary" fontSize="small" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={800} lineHeight={1.2}>
            Xuất phụ tùng
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {vehicleLabel || 'Quét mã phụ tùng trên khung camera phía trên'}
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={1.25}>
        {notice && (
          <Alert severity={notice.severity} sx={{ py: 0.25, px: 1 }} onClose={() => setNotice(null)}>
            {notice.message}
          </Alert>
        )}

        <Box>
          {cart.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 0.5 }}>
              Quét mã phụ tùng trên cùng khung camera với mã xe. Quét lại cùng mã để cộng số lượng.
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

        <Button
          variant="contained"
          fullWidth
          onClick={handleExport}
          disabled={looking || submitting || cart.length === 0}
          sx={{ height: 48, fontSize: 16 }}
        >
          {submitting ? 'Đang lưu…' : `Xuất${cart.length ? ` (${cart.length})` : ''}`}
        </Button>
      </Stack>
    </Paper>
  );
});

XuatKhoDialog.displayName = 'XuatKhoDialog';

export default XuatKhoDialog;

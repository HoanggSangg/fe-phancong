import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import SearchIcon from '@mui/icons-material/Search';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { Html5Qrcode } from 'html5-qrcode';
import {
  createInsuranceCar,
  deleteInsuranceCar,
  getInsuranceCars,
  lookupCarOrRO,
  updateInsuranceCar,
} from '../apis';
import PageLayout from '../common/PageLayout';
import PageHeader from '../common/PageHeader';
import FilterPanel from '../common/FilterPanel';
import DocumentImageUploader from './DocumentImageUploader';
import { useToast } from '../../context/ToastContext';
import { ACCESS_HINT } from '../../constants/accessUrls';
import { extractSoChungTu, isValidSoChungTu } from '../../utils/uploadUrl';
import {
  formatDateDisplay,
  formatDateInput,
  formatExpiryLabel,
  isInsuranceExpiringSoon,
  suggestExpiryFromDelivery,
} from '../../utils/insuranceExpiry';

const SCANNER_ID = 'insurance-qr-scanner';

const emptyForm = () => ({
  plateNumber: '',
  soChungTu: '',
  roNumber: '',
  roCode: '',
  externalCarTypeName: '',
  advisorName: '',
  insuranceCompanyKey: '',
  insurancePolicyNumber: '',
  insuranceAssessor: '',
  insuranceAssessorPhone: '',
  insuranceApproved: false,
  insuranceApprovedDate: '',
  insuranceFileCompleted: false,
  deductibleAmount: '',
  notes: '',
  deliveryDate: '',
  insuranceExpiryDate: '',
});

const cleanText = (val) => String(val || '').toUpperCase().replace(/\s/g, '');

/** API OtoBaThanh: YYYYMMDD → YYYY-MM-DD */
const yyyymmddToInput = (value) => {
  const s = String(value || '').trim();
  if (!/^\d{8}$/.test(s)) return '';
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
};

const isFlagOn = (value) => value === 1 || value === true || value === '1';

const money = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return '';
  return n.toLocaleString('vi-VN');
};

const getExternalContext = (externalData) => {
  const raw = externalData?.raw || {};
  const bg = raw.baogiaGanNhat || {};
  const header = bg.header || raw.header || {};
  const loaiXe = raw.loaiXe || header.loaiXe || {};

  const plateNumber = cleanText(
    externalData?.plateNumber
    || raw.soXeTimKiem
    || raw.soXe
    || header.soXe
    || '',
  );

  const headerTt = String(header.soChungtu || header.khoa || '').toUpperCase().trim();
  const selectedRo = String(externalData?.selectedRO || header.khoa || raw.khoaBaoGiaGanNhat || '')
    .toUpperCase()
    .trim();
  const soChungTu = (headerTt.startsWith('TT') ? headerTt : '')
    || (selectedRo.startsWith('TT') ? selectedRo : '');

  const deliveryDate = yyyymmddToInput(
    header.ngayDuKienHoanThanh || header.ngayXuatXuong || header.ngayHoanTat || '',
  );
  const insuranceExpiryDate = yyyymmddToInput(raw.ngayHetHanBaoHiem || '');
  const insuranceApprovedDate = yyyymmddToInput(header.ngayDuyetGiaBH || '');

  return {
    plateNumber,
    roCode: selectedRo,
    soChungTu,
    roNumber: soChungTu || selectedRo || String(header.soChungtu || '').toUpperCase().trim(),
    externalCarTypeName: loaiXe.tenViet || loaiXe.tenAnh || loaiXe.ma || '',
    advisorName: header.coVanDichVu1 || '',
    insuranceCompanyKey: String(header.khoaHangBaoHiem || raw.khoaHangBaoHiem || '').trim(),
    insurancePolicyNumber: String(raw.soBaoHiem || '').trim(),
    insuranceAssessor: String(header.lienHeBaoHiem || '').trim(),
    insuranceAssessorPhone: String(header.dienThoaiLienHe || '').trim(),
    insuranceApproved: isFlagOn(header.isDuyetGiaBH),
    insuranceApprovedDate,
    insuranceFileCompleted: isFlagOn(header.hoanTatBaoHiem),
    deductibleAmount: Number(header.mucMienThuong) > 0 ? Number(header.mucMienThuong) : '',
    deliveryDate,
    insuranceExpiryDate,
  };
};

const isSecureCameraContext = () => {
  if (typeof window === 'undefined') return false;
  return window.isSecureContext || ['localhost', '127.0.0.1'].includes(window.location.hostname);
};

const toPayload = (form) => ({
  plateNumber: cleanText(form.plateNumber),
  soChungTu: String(form.soChungTu || '').trim().toUpperCase().replace(/^HPT\//, ''),
  roNumber: String(form.roNumber || '').trim().toUpperCase(),
  roCode: String(form.roCode || '').trim().toUpperCase(),
  externalCarTypeName: String(form.externalCarTypeName || '').trim(),
  advisorName: String(form.advisorName || '').trim(),
  insuranceCompanyKey: String(form.insuranceCompanyKey || '').trim(),
  insurancePolicyNumber: String(form.insurancePolicyNumber || '').trim(),
  insuranceAssessor: String(form.insuranceAssessor || '').trim(),
  insuranceAssessorPhone: String(form.insuranceAssessorPhone || '').trim(),
  insuranceApproved: Boolean(form.insuranceApproved),
  insuranceApprovedDate: form.insuranceApprovedDate || null,
  insuranceFileCompleted: Boolean(form.insuranceFileCompleted),
  deductibleAmount: Number(form.deductibleAmount) || 0,
  notes: String(form.notes || '').trim(),
  deliveryDate: form.deliveryDate || null,
  insuranceExpiryDate: form.insuranceExpiryDate || null,
});

const InsurancePage = () => {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupKeyword, setLookupKeyword] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [isScanningQr, setIsScanningQr] = useState(false);
  const [isStartingQr, setIsStartingQr] = useState(false);
  const scannerRef = useRef(null);
  const qrHandlingRef = useRef(false);

  const loadItems = useCallback(async (q = search) => {
    setLoading(true);
    try {
      const res = await getInsuranceCars(q ? { q } : undefined);
      setItems(res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không tải được danh sách bảo hiểm');
    } finally {
      setLoading(false);
    }
  }, [search, toast]);

  useEffect(() => {
    loadItems('');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopQrScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) {
      setIsScanningQr(false);
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
    setIsScanningQr(false);
  }, []);

  useEffect(() => () => {
    stopQrScanner();
  }, [stopQrScanner]);

  const applyLookupData = useCallback((data) => {
    const ctx = getExternalContext(data);
    setForm((prev) => ({
      ...prev,
      plateNumber: ctx.plateNumber || prev.plateNumber,
      soChungTu: (ctx.soChungTu && ctx.soChungTu.startsWith('TT') ? ctx.soChungTu : prev.soChungTu)
        || (ctx.roCode?.startsWith('TT') ? ctx.roCode : prev.soChungTu),
      roCode: ctx.roCode || prev.roCode,
      roNumber: ctx.roNumber || prev.roNumber,
      externalCarTypeName: ctx.externalCarTypeName || prev.externalCarTypeName,
      advisorName: ctx.advisorName || prev.advisorName,
      insuranceCompanyKey: ctx.insuranceCompanyKey || prev.insuranceCompanyKey,
      insurancePolicyNumber: ctx.insurancePolicyNumber || prev.insurancePolicyNumber,
      insuranceAssessor: ctx.insuranceAssessor || prev.insuranceAssessor,
      insuranceAssessorPhone: ctx.insuranceAssessorPhone || prev.insuranceAssessorPhone,
      insuranceApproved: ctx.insuranceApproved || prev.insuranceApproved,
      insuranceApprovedDate: ctx.insuranceApprovedDate || prev.insuranceApprovedDate,
      insuranceFileCompleted: ctx.insuranceFileCompleted || prev.insuranceFileCompleted,
      deductibleAmount: ctx.deductibleAmount !== '' && ctx.deductibleAmount != null
        ? ctx.deductibleAmount
        : prev.deductibleAmount,
      deliveryDate: ctx.deliveryDate || prev.deliveryDate,
      insuranceExpiryDate: ctx.insuranceExpiryDate || prev.insuranceExpiryDate,
    }));
    if (ctx.soChungTu?.startsWith('TT') || ctx.roCode?.startsWith('TT')) {
      setLookupKeyword(ctx.soChungTu || ctx.roCode);
    }
  }, []);

  const runLookup = useCallback(async (keyword, plateHint = '') => {
    const cleanKeyword = cleanText(keyword);
    if (!cleanKeyword) {
      toast.error('Nhập biển số / RO / TT để tra cứu');
      return;
    }

    try {
      setLookupLoading(true);
      const plateParam =
        cleanKeyword.startsWith('RO') && !cleanKeyword.startsWith('TT')
          ? cleanText(plateHint || form.plateNumber)
          : '';
      const res = await lookupCarOrRO(cleanKeyword, plateParam);
      applyLookupData(res.data);
      toast.success('Đã điền thông tin từ hệ thống ngoài');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không tìm thấy thông tin');
    } finally {
      setLookupLoading(false);
    }
  }, [applyLookupData, form.plateNumber, toast]);

  const handleQrScanned = useCallback(async (qrText) => {
    if (qrHandlingRef.current) return;
    qrHandlingRef.current = true;
    const soChungTu = extractSoChungTu(qrText);
    if (!isValidSoChungTu(soChungTu)) {
      qrHandlingRef.current = false;
      toast.error('QR không chứa mã TT hợp lệ (vd: TT0000000000198).');
      return;
    }
    toast.success(`Đã quét: ${soChungTu}`);
    await stopQrScanner();
    setLookupKeyword(soChungTu);
    setForm((prev) => ({ ...prev, soChungTu }));
    await runLookup(soChungTu);
    qrHandlingRef.current = false;
  }, [runLookup, stopQrScanner, toast]);

  const startQrScanner = useCallback(async () => {
    if (isStartingQr || isScanningQr) return;
    if (!isSecureCameraContext()) {
      toast.error(`Cần HTTPS để mở camera. ${ACCESS_HINT}`);
      return;
    }
    setIsStartingQr(true);
    try {
      await stopQrScanner();
      // Hiện khung trước rồi mới gắn camera — tránh #scanner bị display:none
      setIsScanningQr(true);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const scanner = new Html5Qrcode(SCANNER_ID, { verbose: false });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 12,
          qrbox: (viewWidth, viewHeight) => {
            const edge = Math.min(
              Math.floor(viewWidth * 0.78),
              Math.floor(viewHeight * 0.78),
              280,
            );
            return { width: edge, height: edge };
          },
          aspectRatio: 1,
          disableFlip: false,
        },
        async (decodedText) => {
          await handleQrScanned(decodedText);
        },
        () => {},
      );
    } catch (err) {
      console.error(err);
      scannerRef.current = null;
      setIsScanningQr(false);
      toast.error('Không mở được camera quét QR.');
    } finally {
      setIsStartingQr(false);
    }
  }, [handleQrScanned, isScanningQr, isStartingQr, stopQrScanner, toast]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setLookupKeyword('');
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row._id);
    setForm({
      plateNumber: row.plateNumber || '',
      soChungTu: row.soChungTu || '',
      roNumber: row.roNumber || '',
      roCode: row.roCode || '',
      externalCarTypeName: row.externalCarTypeName || '',
      advisorName: row.advisorName || '',
      insuranceCompanyKey: row.insuranceCompanyKey || '',
      insurancePolicyNumber: row.insurancePolicyNumber || '',
      insuranceAssessor: row.insuranceAssessor || '',
      insuranceAssessorPhone: row.insuranceAssessorPhone || '',
      insuranceApproved: Boolean(row.insuranceApproved),
      insuranceApprovedDate: formatDateInput(row.insuranceApprovedDate),
      insuranceFileCompleted: Boolean(row.insuranceFileCompleted),
      deductibleAmount: row.deductibleAmount > 0 ? row.deductibleAmount : '',
      notes: row.notes || '',
      deliveryDate: formatDateInput(row.deliveryDate),
      insuranceExpiryDate: formatDateInput(row.insuranceExpiryDate),
    });
    setLookupKeyword(row.soChungTu || row.plateNumber || '');
    setDialogOpen(true);
  };

  const closeDialog = async () => {
    await stopQrScanner();
    setDialogOpen(false);
  };

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSuggestExpiry = () => {
    const suggested = suggestExpiryFromDelivery(form.deliveryDate);
    if (!suggested) {
      toast.error('Nhập ngày giao xe trước');
      return;
    }
    setForm((prev) => ({ ...prev, insuranceExpiryDate: suggested }));
  };

  const handleSave = async () => {
    const payload = toPayload(form);
    if (!payload.plateNumber) {
      toast.error('Biển số xe là bắt buộc');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await updateInsuranceCar(editingId, payload);
        toast.success('Đã cập nhật xe bảo hiểm');
      } else {
        await createInsuranceCar(payload);
        toast.success('Đã thêm xe bảo hiểm');
      }
      await closeDialog();
      await loadItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Xóa xe bảo hiểm ${row.plateNumber}?`)) return;
    try {
      await deleteInsuranceCar(row._id);
      toast.success('Đã xóa');
      await loadItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xóa thất bại');
    }
  };

  const filteredHint = useMemo(() => {
    const soon = items.filter((x) => isInsuranceExpiringSoon(x.insuranceExpiryDate)).length;
    return soon > 0 ? `${soon} xe sắp/đã hết hạn BH` : '';
  }, [items]);

  return (
    <PageLayout>
      <PageHeader
        icon={<HealthAndSafetyIcon />}
        title="Bảo hiểm"
        subtitle="Lưu thông tin xe BH riêng — quét QR tra cứu & ảnh chứng từ"
        actions={(
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Thêm xe BH
          </Button>
        )}
      />

      <FilterPanel title="Tìm kiếm">
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
          <TextField
            size="small"
            label="Biển số / TT / ghi chú"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') loadItems(search);
            }}
            fullWidth
          />
          <Button
            variant="outlined"
            startIcon={loading ? <CircularProgress size={16} /> : <SearchIcon />}
            onClick={() => loadItems(search)}
            disabled={loading}
          >
            Tìm
          </Button>
          {filteredHint && <Chip color="error" label={filteredHint} />}
        </Stack>
      </FilterPanel>

      <Paper sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Biển số', 'Loại xe', 'TT / RO', 'Giám định', 'Trạng thái BH', 'Hết hạn BH', 'Ghi chú', ''].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 700, bgcolor: 'grey.100' }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            )}
            {!loading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography variant="body2" color="text.secondary">Chưa có xe bảo hiểm.</Typography>
                </TableCell>
              </TableRow>
            )}
            {!loading && items.map((row) => {
              const warn = isInsuranceExpiringSoon(row.insuranceExpiryDate);
              const label = formatExpiryLabel(row.insuranceExpiryDate);
              return (
                <TableRow
                  key={row._id}
                  sx={{
                    bgcolor: warn ? 'rgba(211, 47, 47, 0.06)' : undefined,
                    '&:hover': { bgcolor: warn ? 'rgba(211, 47, 47, 0.1)' : 'action.hover' },
                  }}
                >
                  <TableCell>
                    <Typography fontWeight={700} color={warn ? 'error.main' : 'inherit'}>
                      {row.plateNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>{row.externalCarTypeName || '—'}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{row.soChungTu || '—'}</Typography>
                    <Typography variant="caption" color="text.secondary">{row.roCode || row.roNumber || ''}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{row.insuranceAssessor || '—'}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.insuranceAssessorPhone || ''}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {row.insuranceApproved && <Chip size="small" color="success" label="Duyệt giá" />}
                      {row.insuranceFileCompleted && <Chip size="small" color="info" label="HT hồ sơ" />}
                      {!row.insuranceApproved && !row.insuranceFileCompleted && (
                        <Typography variant="caption" color="text.secondary">—</Typography>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      fontWeight={warn ? 800 : 600}
                      color={warn ? 'error.main' : 'inherit'}
                    >
                      {formatDateDisplay(row.insuranceExpiryDate)}
                    </Typography>
                    {label && (
                      <Chip
                        size="small"
                        label={label}
                        color={warn ? 'error' : 'default'}
                        sx={{ mt: 0.5 }}
                      />
                    )}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 180 }}>
                    <Typography variant="body2" noWrap title={row.notes || ''}>
                      {row.notes || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Sửa">
                      <IconButton size="small" onClick={() => openEdit(row)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Xóa">
                      <IconButton size="small" color="error" onClick={() => handleDelete(row)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="md">
        <DialogTitle>{editingId ? 'Cập nhật xe bảo hiểm' : 'Thêm xe bảo hiểm'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'flex-start' }}>
              <TextField
                label="Tra cứu (biển / RO / TT)"
                value={lookupKeyword}
                onChange={(e) => setLookupKeyword(e.target.value)}
                fullWidth
                size="small"
              />
              <Button
                variant="outlined"
                startIcon={lookupLoading ? <CircularProgress size={16} /> : <SearchIcon />}
                onClick={() => runLookup(lookupKeyword)}
                disabled={lookupLoading}
                sx={{ minWidth: 120 }}
              >
                Tra cứu
              </Button>
              <Button
                variant="outlined"
                color={isScanningQr ? 'error' : 'primary'}
                startIcon={<QrCodeScannerIcon />}
                onClick={() => (isScanningQr ? stopQrScanner() : startQrScanner())}
                disabled={isStartingQr}
                sx={{ minWidth: 130 }}
              >
                {isScanningQr ? 'Dừng QR' : 'Quét QR'}
              </Button>
            </Stack>

            {(isScanningQr || isStartingQr) && (
              <Box
                sx={{
                  width: '100%',
                  maxWidth: 420,
                  mx: 'auto',
                  borderRadius: 2,
                  border: '2px solid',
                  borderColor: 'primary.main',
                  bgcolor: '#111',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    textAlign: 'center',
                    color: 'rgba(255,255,255,0.85)',
                    py: 0.75,
                    bgcolor: 'rgba(0,0,0,0.55)',
                  }}
                >
                  {isStartingQr ? 'Đang mở camera…' : 'Đưa mã QR vào khung vuông để quét'}
                </Typography>
                <Box
                  id={SCANNER_ID}
                  sx={{
                    width: '100%',
                    minHeight: 300,
                    '& video': {
                      width: '100% !important',
                      borderRadius: 0,
                    },
                    '& img': { display: 'none' },
                  }}
                />
              </Box>
            )}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                label="Biển số *"
                value={form.plateNumber}
                onChange={handleChange('plateNumber')}
                fullWidth
                required
                size="small"
              />
              <TextField
                label="Số chứng từ (TT…)"
                value={form.soChungTu}
                onChange={handleChange('soChungTu')}
                fullWidth
                size="small"
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField label="RO / mã" value={form.roCode} onChange={handleChange('roCode')} fullWidth size="small" />
              <TextField
                label="Loại xe"
                value={form.externalCarTypeName}
                onChange={handleChange('externalCarTypeName')}
                fullWidth
                size="small"
              />
              <TextField
                label="Cố vấn"
                value={form.advisorName}
                onChange={handleChange('advisorName')}
                fullWidth
                size="small"
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
              <TextField
                label="Ngày giao xe"
                type="date"
                value={form.deliveryDate}
                onChange={handleChange('deliveryDate')}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Ngày hết hạn BH"
                type="date"
                value={form.insuranceExpiryDate}
                onChange={handleChange('insuranceExpiryDate')}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                error={isInsuranceExpiringSoon(form.insuranceExpiryDate)}
                helperText={formatExpiryLabel(form.insuranceExpiryDate)}
              />
              <Button
                variant="outlined"
                startIcon={<EventAvailableIcon />}
                onClick={handleSuggestExpiry}
                sx={{ minWidth: 140, whiteSpace: 'nowrap' }}
              >
                +1 năm
              </Button>
            </Stack>

            <Box
              sx={{
                p: 1.5,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'grey.50',
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 1.25, fontWeight: 700 }}>
                Thông tin bảo hiểm (từ báo giá)
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 1.5 }}>
                <TextField
                  label="Mã hãng BH"
                  value={form.insuranceCompanyKey}
                  onChange={handleChange('insuranceCompanyKey')}
                  fullWidth
                  size="small"
                />
                <TextField
                  label="Số bảo hiểm"
                  value={form.insurancePolicyNumber}
                  onChange={handleChange('insurancePolicyNumber')}
                  fullWidth
                  size="small"
                />
                <TextField
                  label="Mức miễn thường"
                  value={form.deductibleAmount}
                  onChange={handleChange('deductibleAmount')}
                  fullWidth
                  size="small"
                  type="number"
                  helperText={money(form.deductibleAmount) ? `${money(form.deductibleAmount)} đ` : ' '}
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 1.5 }}>
                <TextField
                  label="Giám định / liên hệ BH"
                  value={form.insuranceAssessor}
                  onChange={handleChange('insuranceAssessor')}
                  fullWidth
                  size="small"
                />
                <TextField
                  label="Điện thoại giám định"
                  value={form.insuranceAssessorPhone}
                  onChange={handleChange('insuranceAssessorPhone')}
                  fullWidth
                  size="small"
                />
              </Stack>

              <TextField
                label="Ngày duyệt giá BH"
                type="date"
                value={form.insuranceApprovedDate}
                onChange={handleChange('insuranceApprovedDate')}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 1, maxWidth: { sm: 280 } }}
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <FormControlLabel
                  control={(
                    <Checkbox
                      checked={Boolean(form.insuranceApproved)}
                      onChange={(e) => setForm((prev) => ({
                        ...prev,
                        insuranceApproved: e.target.checked,
                      }))}
                    />
                  )}
                  label="Bảo hiểm chấp thuận (duyệt giá)"
                />
                <FormControlLabel
                  control={(
                    <Checkbox
                      checked={Boolean(form.insuranceFileCompleted)}
                      onChange={(e) => setForm((prev) => ({
                        ...prev,
                        insuranceFileCompleted: e.target.checked,
                      }))}
                    />
                  )}
                  label="Hoàn tất hồ sơ bảo hiểm"
                />
              </Stack>
            </Box>

            <TextField
              label="Ghi chú"
              value={form.notes}
              onChange={handleChange('notes')}
              fullWidth
              multiline
              minRows={2}
              size="small"
            />

            {isValidSoChungTu(form.soChungTu) ? (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Ảnh chứng từ — {form.soChungTu}
                </Typography>
                <DocumentImageUploader
                  soChungTu={form.soChungTu}
                  carInfo={{
                    plateNumber: form.plateNumber,
                    roNumber: form.soChungTu,
                    externalCarTypeName: form.externalCarTypeName,
                  }}
                />
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Nhập hoặc quét mã TT để mở panel ảnh chứng từ.
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Hủy</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
};

export default InsurancePage;

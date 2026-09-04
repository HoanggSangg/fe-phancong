import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PrintIcon from '@mui/icons-material/Print';
import PageLayout from '../common/PageLayout';
import PageHeader from '../common/PageHeader';
import { useToast } from '../../context/ToastContext';
import { LAYOUT } from '../../constants/layout';
import {
  LABEL_H_MM,
  LABEL_W_MM,
  exportQrLabelsPdf,
  parseLabelCodes,
  printQrLabels,
  renderQrLabelCanvas,
} from '../../utils/qrLabel';
import { hanghoaNameOf, lookupHanghoaByCode } from '../../utils/xuatKhoApi';
import { logQrLabelPrint } from '../apis';
import QrLabelHistory from './QrLabelHistory';

const QrLabelPage = () => {
  const toast = useToast();
  const [tab, setTab] = useState('create');
  const [rawCodes, setRawCodes] = useState('');
  const [copies, setCopies] = useState(1);
  const [previewUrl, setPreviewUrl] = useState('');
  const [rendering, setRendering] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState('');
  const [products, setProducts] = useState({});
  const [lookupBusy, setLookupBusy] = useState(false);
  const [historyTick, setHistoryTick] = useState(0);
  const productCache = useRef(new Map());

  const codes = useMemo(() => parseLabelCodes(rawCodes), [rawCodes]);
  const previewCode = codes[0] || '';
  const copyCount = Math.min(50, Math.max(1, Number(copies) || 1));
  const pdfCount = Math.max(1, codes.length) * copyCount;
  const previewProduct = products[previewCode];
  const allNamed = codes.length > 0 && codes.every((code) => products[code]?.name);
  const isCreateTab = tab === 'create';

  useEffect(() => {
    let cancelled = false;
    if (!codes.length) {
      setProducts({});
      setLookupBusy(false);
      return undefined;
    }

    setLookupBusy(true);
    const timer = window.setTimeout(async () => {
      const next = {};
      await Promise.all(codes.map(async (code) => {
        if (productCache.current.has(code)) {
          next[code] = productCache.current.get(code);
          return;
        }
        try {
          const detail = await lookupHanghoaByCode(code);
          const name = hanghoaNameOf(detail);
          const row = name
            ? { name, error: '' }
            : { name: '', error: `Không có tên sản phẩm cho mã '${code}'.` };
          if (name) productCache.current.set(code, row);
          next[code] = row;
        } catch (err) {
          next[code] = {
            name: '',
            error: err?.response?.data?.message || err?.message || `Không tìm thấy mã '${code}'.`,
          };
        }
      }));
      if (!cancelled) {
        setProducts(next);
        setLookupBusy(false);
      }
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [codes]);

  useEffect(() => {
    let cancelled = false;
    if (!previewCode) {
      setPreviewUrl('');
      setError('');
      return undefined;
    }
    if (lookupBusy && !previewProduct?.name) {
      setPreviewUrl('');
      setRendering(true);
      return undefined;
    }
    if (previewProduct?.error) {
      setPreviewUrl('');
      setError(previewProduct.error);
      setRendering(false);
      return undefined;
    }
    if (!previewProduct?.name) {
      setPreviewUrl('');
      setRendering(true);
      return undefined;
    }

    setRendering(true);
    const timer = window.setTimeout(async () => {
      try {
        const canvas = await renderQrLabelCanvas(previewCode, previewProduct.name);
        if (cancelled) return;
        setPreviewUrl(canvas.toDataURL('image/png'));
        setError('');
      } catch (err) {
        if (!cancelled) {
          setPreviewUrl('');
          setError(err?.message || 'Không tạo được tem xem trước.');
        }
      } finally {
        if (!cancelled) setRendering(false);
      }
    }, 80);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [previewCode, previewProduct, lookupBusy]);

  const labelPages = () => codes.flatMap((code) => Array.from({ length: copyCount }, () => ({
    code,
    name: products[code]?.name || '',
  })));

  const recordLabelPrint = async (method, pages) => {
    try {
      await logQrLabelPrint({
        method,
        widthMm: LABEL_W_MM,
        heightMm: LABEL_H_MM,
        items: pages,
      });
    } catch {
      // in tem vẫn thành công — không chặn nếu ghi lịch sử lỗi
    }
  };

  const handleExport = async () => {
    if (!codes.length) {
      toast.error('Nhập mã hàng hóa để xuất PDF.');
      return;
    }
    setExporting(true);
    try {
      const pages = labelPages();
      const fileName = await exportQrLabelsPdf(pages);
      await recordLabelPrint('pdf', pages);
      setHistoryTick((n) => n + 1);
      toast.success(`Đã tải ${fileName}`);
    } catch (err) {
      toast.error(err?.message || 'Không xuất được PDF.');
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = async () => {
    if (!codes.length) {
      toast.error('Nhập mã hàng hóa để in tem.');
      return;
    }
    setPrinting(true);
    try {
      const pages = labelPages();
      await printQrLabels(pages);
      await recordLabelPrint('print', pages);
      setHistoryTick((n) => n + 1);
    } catch (err) {
      toast.error(err?.message || 'Không in được tem.');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <PageLayout maxWidth="medium">
      <PageHeader
        icon={<QrCode2Icon />}
        title="Tem QR"
        subtitle={`Tem ${LABEL_W_MM} × ${LABEL_H_MM} mm · in lại tem đã lưu hoặc tạo tem mới`}
        actions={isCreateTab ? (
          <>
            <Button
              variant="contained"
              startIcon={printing ? <CircularProgress size={16} color="inherit" /> : <PrintIcon />}
              onClick={handlePrint}
              disabled={printing || exporting || !allNamed}
            >
              In tem{pdfCount > 1 ? ` (${pdfCount})` : ''}
            </Button>
            <Button
              variant="outlined"
              startIcon={exporting ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdfIcon />}
              onClick={handleExport}
              disabled={exporting || printing || !allNamed}
            >
              Xuất PDF{pdfCount > 1 ? ` (${pdfCount} tem)` : ''}
            </Button>
          </>
        ) : null}
      />

      <Tabs
        value={tab}
        onChange={(_, next) => setTab(next)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab
          value="create"
          icon={<QrCode2Icon />}
          iconPosition="start"
          label="Tạo tem"
        />
        <Tab
          value="history"
          icon={<HistoryIcon />}
          iconPosition="start"
          label="Tem đã tạo"
        />
      </Tabs>

      {tab === 'history' && (
        <QrLabelHistory refreshKey={historyTick} />
      )}

      {tab === 'create' && (
      <Stack spacing={LAYOUT.sectionGap}>
        <Paper variant="outlined" sx={{ p: LAYOUT.paperPadding, borderRadius: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="Mã hàng hóa"
              value={rawCodes}
              onChange={(e) => setRawCodes(e.target.value)}
              placeholder="0005-0005099"
              helperText="Mỗi dòng một mã. Tem in tên sản phẩm bên trái, mã ngay dưới QR."
              fullWidth
              multiline
              minRows={3}
              maxRows={8}
            />
            {codes.length > 0 && (
              <Stack spacing={0.5}>
                {lookupBusy && !allNamed && (
                  <Typography variant="caption" color="text.secondary">
                    Đang lấy tên sản phẩm từ hệ thống…
                  </Typography>
                )}
                {codes.map((code) => {
                  const row = products[code];
                  return (
                    <Typography
                      key={code}
                      variant="body2"
                      color={row?.error ? 'error.main' : 'text.primary'}
                      sx={{ fontWeight: row?.name ? 600 : 400 }}
                    >
                      {code}
                      {row?.name ? ` — ${row.name}` : row?.error ? ` — ${row.error}` : lookupBusy ? ' — đang tải…' : ''}
                    </Typography>
                  );
                })}
              </Stack>
            )}
            <TextField
              label="Số bản mỗi mã"
              type="number"
              value={copies}
              onChange={(e) => setCopies(e.target.value)}
              inputProps={{ min: 1, max: 50 }}
              sx={{ maxWidth: 180 }}
            />
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: LAYOUT.paperPadding, borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>
            Xem trước (khổ in {LABEL_W_MM} × {LABEL_H_MM} mm)
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>
          )}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 180,
              bgcolor: '#e8eef6',
              borderRadius: 2,
              p: 2,
            }}
          >
            {(rendering || (lookupBusy && !previewUrl)) && !error ? (
              <CircularProgress size={28} />
            ) : previewUrl ? (
              <Box
                component="img"
                src={previewUrl}
                alt={`Tem QR ${previewCode}`}
                sx={{
                  width: 'min(100%, 480px)',
                  maxWidth: '100%',
                  height: 'auto',
                  aspectRatio: `${LABEL_W_MM} / ${LABEL_H_MM}`,
                  objectFit: 'contain',
                  display: 'block',
                  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.18)',
                  borderRadius: 1,
                }}
              />
            ) : (
              <Typography color="text.secondary">Nhập mã để xem tem.</Typography>
            )}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.25 }}>
            Tem in tên sản phẩm bên trái, mã hàng hóa dưới QR. Chọn khổ giấy
            {` ${LABEL_W_MM}×${LABEL_H_MM} mm`}, lề Không, tỷ lệ 100%.
          </Typography>
        </Paper>
      </Stack>
      )}
    </PageLayout>
  );
};

export default QrLabelPage;

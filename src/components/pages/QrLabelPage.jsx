import React, { useEffect, useMemo, useState } from 'react';
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

const QrLabelPage = () => {
  const toast = useToast();
  const [rawCodes, setRawCodes] = useState('0005-0005099');
  const [copies, setCopies] = useState(1);
  const [previewUrl, setPreviewUrl] = useState('');
  const [rendering, setRendering] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState('');

  const codes = useMemo(() => parseLabelCodes(rawCodes), [rawCodes]);
  const previewCode = codes[0] || '';
  const copyCount = Math.min(50, Math.max(1, Number(copies) || 1));
  const pdfCount = Math.max(1, codes.length) * copyCount;

  useEffect(() => {
    let cancelled = false;
    if (!previewCode) {
      setPreviewUrl('');
      setError('');
      return undefined;
    }

    setRendering(true);
    const timer = window.setTimeout(async () => {
      try {
        const canvas = await renderQrLabelCanvas(previewCode);
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
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [previewCode]);

  const labelPages = () => codes.flatMap((code) => Array.from({ length: copyCount }, () => code));

  const handleExport = async () => {
    if (!codes.length) {
      toast.error('Nhập mã hàng hóa để xuất PDF.');
      return;
    }
    setExporting(true);
    try {
      const fileName = await exportQrLabelsPdf(labelPages());
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
      await printQrLabels(labelPages());
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
        title="Tạo tem QR"
        subtitle={`Tem ${LABEL_W_MM} × ${LABEL_H_MM} mm · mẫu logo Bá Thành`}
        actions={(
          <>
            <Button
              variant="contained"
              startIcon={printing ? <CircularProgress size={16} color="inherit" /> : <PrintIcon />}
              onClick={handlePrint}
              disabled={printing || exporting || !codes.length}
            >
              In tem{pdfCount > 1 ? ` (${pdfCount})` : ''}
            </Button>
            <Button
              variant="outlined"
              startIcon={exporting ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdfIcon />}
              onClick={handleExport}
              disabled={exporting || printing || !codes.length}
            >
              Xuất PDF{pdfCount > 1 ? ` (${pdfCount} tem)` : ''}
            </Button>
          </>
        )}
      />

      <Stack spacing={LAYOUT.sectionGap}>
        <Paper variant="outlined" sx={{ p: LAYOUT.paperPadding, borderRadius: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="Mã hàng hóa"
              value={rawCodes}
              onChange={(e) => setRawCodes(e.target.value)}
              placeholder="0005-0005099"
              helperText="Mỗi dòng một mã — QR và ô xanh đổi theo mã. Có thể dán nhiều mã để in hàng loạt."
              fullWidth
              multiline
              minRows={3}
              maxRows={8}
            />
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
            {rendering && !previewUrl ? (
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
            Bấm In tem để mở hộp thoại in của máy tính. Chọn máy in tem, khổ giấy
            {` ${LABEL_W_MM}×${LABEL_H_MM} mm`}, lề Không, tỷ lệ 100%. Xuất PDF nếu cần lưu file.
          </Typography>
        </Paper>
      </Stack>
    </PageLayout>
  );
};

export default QrLabelPage;

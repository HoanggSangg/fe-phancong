import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SearchIcon from '@mui/icons-material/Search';
import { useToast } from '../../context/ToastContext';
import { LAYOUT } from '../../constants/layout';
import {
  LABEL_H_MM,
  LABEL_W_MM,
  exportQrLabelsPdf,
  printQrLabels,
} from '../../utils/qrLabel';
import { getQrLabelHistory, logQrLabelPrint } from '../apis';

const formatDateTime = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const expandPages = (code, name, copies) => {
  const qty = Math.min(50, Math.max(1, Number(copies) || 1));
  return Array.from({ length: qty }, () => ({ code, name }));
};

const QrLabelHistory = ({ refreshKey = 0 }) => {
  const toast = useToast();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [loading, setLoading] = useState(true);
  const [copiesMap, setCopiesMap] = useState({});
  const [busyKey, setBusyKey] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getQrLabelHistory({
        search: search || undefined,
        page: page + 1,
        limit: rowsPerPage,
      });
      setItems(Array.isArray(data?.items) ? data.items : []);
      setPagination(data?.pagination || { page: 1, limit: rowsPerPage, total: 0, totalPages: 1 });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Không tải được lịch sử tem.');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory, refreshKey]);

  const copiesOf = (row) => copiesMap[row.code] ?? row.lastSoLuong ?? 1;

  const recordPrint = async (method, pages) => {
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

  const handleReprint = async (row, method) => {
    const name = String(row?.name || '').trim();
    const code = String(row?.code || '').trim();
    if (!code || !name) {
      toast.error('Tem này thiếu tên sản phẩm, không in lại được.');
      return;
    }
    const key = `${row._id}:${method}`;
    setBusyKey(key);
    try {
      const pages = expandPages(code, name, copiesOf(row));
      if (method === 'pdf') {
        const fileName = await exportQrLabelsPdf(pages);
        await recordPrint('pdf', pages);
        toast.success(`Đã tải ${fileName}`);
      } else {
        await printQrLabels(pages);
        await recordPrint('print', pages);
      }
      await loadHistory();
    } catch (err) {
      toast.error(err?.message || 'Không in lại được tem.');
    } finally {
      setBusyKey('');
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: LAYOUT.paperPadding, borderRadius: 2 }}>
      <Stack spacing={1.5}>
        <TextField
          size="small"
          label="Tìm tem đã tạo"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Tên sản phẩm hoặc mã hàng hóa"
          helperText="Tìm theo tên sản phẩm và in lại, không cần nhập mã."
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        {loading && !items.length ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : items.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 2 }}>
            {search
              ? `Không tìm thấy tem cho “${search}”.`
              : 'Chưa có tem đã tạo. In tem lần đầu để lưu vào danh sách này.'}
          </Typography>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Tên sản phẩm</TableCell>
                  <TableCell>Mã</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>In gần nhất</TableCell>
                  <TableCell align="center" sx={{ width: 96 }}>Số bản</TableCell>
                  <TableCell align="right">In lại</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((row) => {
                  const printBusy = busyKey === `${row._id}:print`;
                  const pdfBusy = busyKey === `${row._id}:pdf`;
                  const disabled = Boolean(busyKey) || !row.name;
                  return (
                    <TableRow key={row._id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>
                          {row.name || '—'}
                        </Typography>
                        {row.lastPrintedByName ? (
                          <Typography variant="caption" color="text.secondary">
                            {row.lastPrintedByName}
                            {row.printCount > 1 ? ` · ${row.printCount} lần` : ''}
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontFamily: 'ui-monospace, Menlo, monospace' }}>
                        {row.code}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {formatDateTime(row.lastPrintedAt)}
                      </TableCell>
                      <TableCell align="center">
                        <TextField
                          type="number"
                          size="small"
                          value={copiesOf(row)}
                          onChange={(e) => {
                            const next = Math.min(50, Math.max(1, Number(e.target.value) || 1));
                            setCopiesMap((prev) => ({ ...prev, [row.code]: next }));
                          }}
                          inputProps={{ min: 1, max: 50 }}
                          sx={{ width: 72 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.75} justifyContent="flex-end">
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={printBusy ? <CircularProgress size={14} color="inherit" /> : <PrintIcon />}
                            onClick={() => handleReprint(row, 'print')}
                            disabled={disabled}
                          >
                            In
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={pdfBusy ? <CircularProgress size={14} color="inherit" /> : <PictureAsPdfIcon />}
                            onClick={() => handleReprint(row, 'pdf')}
                            disabled={disabled}
                          >
                            PDF
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        )}

        {pagination.total > 0 && (
          <TablePagination
            component="div"
            count={pagination.total}
            page={page}
            onPageChange={(_, next) => setPage(next)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 20, 50]}
            labelRowsPerPage="Mỗi trang"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
          />
        )}
      </Stack>
    </Paper>
  );
};

export default QrLabelHistory;

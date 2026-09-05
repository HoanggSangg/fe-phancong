import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  IconButton,
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
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
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
import {
  deleteQrLabel,
  deleteQrLabels,
  getQrLabelHistory,
  logQrLabelPrint,
} from '../apis';

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
  const [selected, setSelected] = useState(() => new Set());

  const selectedCount = selected.size;
  const pageIds = useMemo(() => items.map((row) => String(row._id)), [items]);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someOnPageSelected = pageIds.some((id) => selected.has(id));

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
      setSelected(new Set());
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

  const toggleRow = (id) => {
    const key = String(id);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const togglePage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const afterDelete = async (deletedCount) => {
    toast.success(deletedCount > 1 ? `Đã xóa ${deletedCount} tem.` : 'Đã xóa tem.');
    const remainOnPage = items.length - deletedCount;
    if (page > 0 && remainOnPage <= 0) {
      setPage((prev) => Math.max(0, prev - 1));
      return;
    }
    await loadHistory();
  };

  const handleDeleteOne = async (row) => {
    const label = row?.name ? `${row.name} (${row.code})` : row?.code;
    if (!window.confirm(`Xóa tem “${label}” khỏi danh sách?`)) return;
    setBusyKey(`${row._id}:delete`);
    try {
      await deleteQrLabel(row._id);
      await afterDelete(1);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Không xóa được tem.');
    } finally {
      setBusyKey('');
    }
  };

  const handleDeleteSelected = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    if (!window.confirm(`Xóa ${ids.length} tem đã chọn khỏi danh sách?`)) return;
    setBusyKey('bulk-delete');
    try {
      const { data } = await deleteQrLabels({ ids });
      await afterDelete(data?.deleted || ids.length);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Không xóa được tem đã chọn.');
    } finally {
      setBusyKey('');
    }
  };

  const handleDeleteAll = async () => {
    if (!pagination.total) return;
    if (!window.confirm(`Xóa toàn bộ ${pagination.total} tem đã lưu? Không thể hoàn tác.`)) return;
    setBusyKey('bulk-delete');
    try {
      const { data } = await deleteQrLabels({ all: true });
      toast.success(`Đã xóa ${data?.deleted || pagination.total} tem.`);
      if (page === 0) await loadHistory();
      else setPage(0);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Không xóa được danh sách tem.');
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

        {pagination.total > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              size="small"
              color="error"
              variant="outlined"
              startIcon={busyKey === 'bulk-delete' ? <CircularProgress size={14} color="inherit" /> : <DeleteIcon />}
              onClick={handleDeleteSelected}
              disabled={!selectedCount || Boolean(busyKey)}
            >
              Xóa đã chọn{selectedCount ? ` (${selectedCount})` : ''}
            </Button>
            <Button
              size="small"
              color="error"
              variant="text"
              onClick={handleDeleteAll}
              disabled={Boolean(busyKey)}
            >
              Xóa tất cả
            </Button>
          </Stack>
        )}

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
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={allOnPageSelected}
                      indeterminate={someOnPageSelected && !allOnPageSelected}
                      onChange={togglePage}
                      disabled={Boolean(busyKey)}
                      inputProps={{ 'aria-label': 'Chọn tất cả tem trên trang' }}
                    />
                  </TableCell>
                  <TableCell>Tên sản phẩm</TableCell>
                  <TableCell>Mã</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>In gần nhất</TableCell>
                  <TableCell align="center" sx={{ width: 96 }}>Số bản</TableCell>
                  <TableCell align="right">Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((row) => {
                  const rowId = String(row._id);
                  const printBusy = busyKey === `${row._id}:print`;
                  const pdfBusy = busyKey === `${row._id}:pdf`;
                  const deleteBusy = busyKey === `${row._id}:delete`;
                  const disabled = Boolean(busyKey) || !row.name;
                  return (
                    <TableRow key={row._id} hover selected={selected.has(rowId)}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          size="small"
                          checked={selected.has(rowId)}
                          onChange={() => toggleRow(rowId)}
                          disabled={Boolean(busyKey)}
                          inputProps={{ 'aria-label': `Chọn tem ${row.code}` }}
                        />
                      </TableCell>
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
                        <Stack direction="row" spacing={0.75} justifyContent="flex-end" alignItems="center">
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
                          <Tooltip title="Xóa tem">
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteOne(row)}
                                disabled={Boolean(busyKey)}
                                aria-label="Xóa tem"
                              >
                                {deleteBusy ? <CircularProgress size={16} /> : <DeleteIcon fontSize="small" />}
                              </IconButton>
                            </span>
                          </Tooltip>
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

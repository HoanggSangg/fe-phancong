import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import Slide from '@mui/material/Slide';
import {
  Add,
  Delete,
  EditNote,
  ReceiptLong,
} from '@mui/icons-material';
import { formatMoney } from '../../utils/dateFilters';
import {
  getItemWorkerTotalPercentage,
  getWorkerRevenuePreview,
  isItemWorkerPercentageValid,
} from '../../utils/manageCarsHelpers';

const COMPACT_INPUT_SX = {
  '& .MuiInputBase-root': { fontSize: 13, height: 32 },
  '& .MuiInputLabel-root': { fontSize: 12 },
};

// ✅ Các mức phần trăm thường dùng để chọn nhanh khi chia việc cho thợ.
// Vẫn giữ ô nhập tay bên cạnh để nhập số khác nếu cần.
const COMMON_PERCENTAGE_OPTIONS = [100, 80, 70, 60, 50, 40, 30, 20, 10];

// ============================================================
// ✅ DebouncedTextField: gõ chữ CHỈ cập nhật state cục bộ (rẻ, tức thì).
// Chỉ đẩy giá trị lên component cha (onCommit) sau khi:
//   - người dùng dừng gõ ~300ms, HOẶC
//   - rời khỏi ô input (onBlur)
// => Tách hoàn toàn độ trễ bàn phím khỏi chi phí re-render nặng của cha,
// dù cha có re-render toàn trang mỗi lần commit, việc gõ vẫn luôn mượt.
// ============================================================
const DebouncedTextField = React.memo(function DebouncedTextField({
  value,
  onCommit,
  debounceMs = 300,
  ...rest
}) {
  const [localValue, setLocalValue] = useState(value ?? '');
  const isFocusedRef = useRef(false);
  const timerRef = useRef(null);

  // Đồng bộ lại từ prop bên ngoài khi ô KHÔNG đang được focus
  // (tránh ghi đè con trỏ/nội dung đang gõ dở của người dùng)
  useEffect(() => {
    if (!isFocusedRef.current) {
      setLocalValue(value ?? '');
    }
  }, [value]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const handleChange = (e) => {
    const newVal = e.target.value;
    setLocalValue(newVal);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onCommit(newVal);
    }, debounceMs);
  };

  const handleFocus = (e) => {
    isFocusedRef.current = true;
    rest.onFocus?.(e);
  };

  const handleBlur = (e) => {
    isFocusedRef.current = false;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onCommit(localValue);
    rest.onBlur?.(e);
  };

  return (
    <TextField
      {...rest}
      value={localValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  );
});

// ============================================================
// ✅ DebouncedMoneyField: giống DebouncedTextField nhưng hiển thị
// số có dấu phân cách hàng nghìn (vd: 1.250.000) ngay trong lúc gõ.
// - Người dùng chỉ gõ được chữ số (mọi ký tự khác bị loại bỏ).
// - Giá trị commit lên component cha (onCommit) là CHUỖI SỐ THÔ,
//   không có dấu chấm (vd "1250000"), để cha tự xử lý/convert Number().
// - Vẫn giữ cơ chế debounce ~300ms + commit khi blur như DebouncedTextField.
// ============================================================
const formatMoneyInput = (val) => {
  const digits = String(val ?? '').replace(/[^\d]/g, '');
  if (digits === '') return '';
  return Number(digits).toLocaleString('vi-VN');
};

const parseMoneyInput = (val) => String(val ?? '').replace(/[^\d]/g, '');

const DebouncedMoneyField = React.memo(function DebouncedMoneyField({
  value,
  onCommit,
  debounceMs = 300,
  ...rest
}) {
  const [localValue, setLocalValue] = useState(formatMoneyInput(value));
  const isFocusedRef = useRef(false);
  const timerRef = useRef(null);

  // Đồng bộ lại từ prop bên ngoài khi ô KHÔNG đang được focus
  useEffect(() => {
    if (!isFocusedRef.current) {
      setLocalValue(formatMoneyInput(value));
    }
  }, [value]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const commitRaw = (formatted) => {
    onCommit(parseMoneyInput(formatted));
  };

  const handleChange = (e) => {
    const formatted = formatMoneyInput(e.target.value);
    setLocalValue(formatted);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      commitRaw(formatted);
    }, debounceMs);
  };

  const handleFocus = (e) => {
    isFocusedRef.current = true;
    rest.onFocus?.(e);
  };

  const handleBlur = (e) => {
    isFocusedRef.current = false;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    commitRaw(localValue);
    rest.onBlur?.(e);
  };

  return (
    <TextField
      {...rest}
      value={localValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      inputProps={{ ...(rest.inputProps || {}), inputMode: 'numeric' }}
    />
  );
});

// ============================================================
// ✅ InlineWorkers: tách riêng + memo hoá.
// Chỉ re-render khi item, allWorkers hoặc canManage của CHÍNH nó đổi,
// không bị kéo theo khi người dùng gõ ở dòng khác.
// ============================================================
const InlineWorkers = React.memo(
  function InlineWorkers({
    item,
    allWorkers,
    canManage,
    onRepairWorkerChange,
    onRepairPercentageChange,
    onAddRepairWorkerRow,
    onRemoveRepairWorkerRow,
  }) {
    return (
      <Stack spacing={0.5} sx={{ minWidth: 430 }}>
        {(item.selectedWorkers || []).map((entry, rowIndex) => {
          const selectedQuickPercentage =
            COMMON_PERCENTAGE_OPTIONS.find((option) => Number(entry.percentage) === option) ?? null;

          return (
            <Box
              key={`${item._id}-${rowIndex}`}
              sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}
            >
              <Autocomplete
                size="small"
                disabled={!canManage}
                sx={{ width: 220, ...COMPACT_INPUT_SX }}
                options={allWorkers}
                getOptionLabel={(option) => option.name || ''}
                value={entry.worker}
                onChange={(_, newValue) => onRepairWorkerChange(item._id, rowIndex, newValue)}
                renderInput={(params) => (
                  <TextField {...params} placeholder="Chọn thợ" />
                )}
                isOptionEqualToValue={(option, value) => option._id === value?._id}
              />
              <DebouncedTextField
                size="small"
                type="number"
                label="%"
                disabled={!canManage}
                value={entry.percentage}
                onCommit={(val) => onRepairPercentageChange(item._id, rowIndex, val)}
                inputProps={{ min: 0, max: 100, step: 1 }}
                sx={{ width: 72, ...COMPACT_INPUT_SX }}
              />
              <Autocomplete
                size="small"
                disabled={!canManage}
                sx={{ width: 96, ...COMPACT_INPUT_SX }}
                options={COMMON_PERCENTAGE_OPTIONS}
                value={selectedQuickPercentage}
                onChange={(_, newValue) => {
                  if (newValue !== null) {
                    onRepairPercentageChange(item._id, rowIndex, String(newValue));
                  }
                }}
                getOptionLabel={(option) => `${option}%`}
                renderInput={(params) => (
                  <TextField {...params} placeholder="Nhanh" />
                )}
              />
              {canManage && (
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => onRemoveRepairWorkerRow(item._id, rowIndex)}
                  sx={{ p: 0.25 }}
                >
                  <Delete sx={{ fontSize: 16 }} />
                </IconButton>
              )}
            </Box>
          );
        })}
        {canManage && (
          <IconButton
            size="small"
            color="primary"
            onClick={() => onAddRepairWorkerRow(item._id)}
            sx={{ alignSelf: 'flex-start', p: 0.25 }}
          >
            <Add sx={{ fontSize: 16 }} />
          </IconButton>
        )}
        {item.selectedWorkers?.some((entry) => entry.worker) && (
          <Typography
            variant="caption"
            color={isItemWorkerPercentageValid(item) ? 'success.main' : 'error'}
            sx={{ lineHeight: 1.2 }}
          >
            {getItemWorkerTotalPercentage(item)}%
          </Typography>
        )}
      </Stack>
    );
  },
  // ✅ So sánh tuỳ chỉnh: chỉ re-render khi item CỦA CHÍNH DÒNG NÀY thay đổi
  (prev, next) =>
    prev.item === next.item &&
    prev.allWorkers === next.allWorkers &&
    prev.canManage === next.canManage
);

const renderCompactRepairTableHead = (canManage, editable = false) => (
  <TableRow>
    <TableCell sx={{ fontWeight: 'bold', py: 0.75, px: 1, width: 36 }}>#</TableCell>
    <TableCell sx={{ fontWeight: 'bold', py: 0.75, px: 1, width: 90 }}>Nhóm</TableCell>
    <TableCell sx={{ fontWeight: 'bold', py: 0.75, px: 1, minWidth: 160 }}>Nội dung</TableCell>
    <TableCell sx={{ fontWeight: 'bold', py: 0.75, px: 1, width: 72 }} align="right">SL</TableCell>
    <TableCell sx={{ fontWeight: 'bold', py: 0.75, px: 1, width: 120 }} align="right">ĐG</TableCell>
    <TableCell sx={{ fontWeight: 'bold', py: 0.75, px: 1, width: 120 }} align="right">TT</TableCell>
    <TableCell sx={{ fontWeight: 'bold', py: 0.75, px: 1, minWidth: 450 }}>Thợ</TableCell>
    {editable && canManage && (
      <TableCell sx={{ fontWeight: 'bold', py: 0.75, px: 0.5, width: 36 }} />
    )}
  </TableRow>
);

// ============================================================
// ✅ ManualRepairItemRow: tách riêng + memo hoá.
// Đây là nơi gây lag nhiều nhất trước đây vì có nhiều TextField
// controlled. Giờ mỗi dòng chỉ re-render khi `item` của chính nó đổi.
// Cột ĐG và TT dùng DebouncedMoneyField để hiển thị định dạng tiền
// (dấu chấm phân cách hàng nghìn) ngay trong lúc nhập.
// ============================================================
const ManualRepairItemRow = React.memo(
  function ManualRepairItemRow({
    item,
    index,
    canManage,
    allWorkers,
    onManualFieldChange,
    onRemoveManualItem,
    onRepairWorkerChange,
    onRepairPercentageChange,
    onAddRepairWorkerRow,
    onRemoveRepairWorkerRow,
  }) {
    return (
      <TableRow hover sx={{ bgcolor: '#fffbeb' }}>
        <TableCell sx={{ py: 0.5, px: 1, verticalAlign: 'middle' }}>{index + 1}</TableCell>
        <TableCell sx={{ py: 0.5, px: 1, verticalAlign: 'middle' }}>
          <DebouncedTextField
            size="small"
            disabled={!canManage}
            value={item.groupName || ''}
            onCommit={(val) => onManualFieldChange(item._id, 'groupName', val)}
            sx={{ width: 84, ...COMPACT_INPUT_SX }}
          />
        </TableCell>
        <TableCell sx={{ py: 0.5, px: 1, verticalAlign: 'middle' }}>
          <DebouncedTextField
            size="small"
            disabled={!canManage}
            placeholder="Nội dung *"
            value={item.content || ''}
            onCommit={(val) => onManualFieldChange(item._id, 'content', val)}
            fullWidth
            sx={COMPACT_INPUT_SX}
          />
        </TableCell>
        <TableCell sx={{ py: 0.5, px: 1, verticalAlign: 'middle' }} align="right">
          <DebouncedTextField
            size="small"
            type="number"
            disabled={!canManage}
            value={item.quantity ?? 1}
            onCommit={(val) => onManualFieldChange(item._id, 'quantity', val)}
            inputProps={{ min: 0, step: 1 }}
            sx={{ width: 64, ...COMPACT_INPUT_SX }}
          />
        </TableCell>
        <TableCell sx={{ py: 0.5, px: 1, verticalAlign: 'middle' }} align="right">
          <DebouncedMoneyField
            size="small"
            disabled={!canManage}
            value={item.unitPrice ?? 0}
            onCommit={(val) => onManualFieldChange(item._id, 'unitPrice', val)}
            sx={{ width: 112, ...COMPACT_INPUT_SX }}
          />
        </TableCell>
        <TableCell sx={{ py: 0.5, px: 1, verticalAlign: 'middle' }} align="right">
          <DebouncedMoneyField
            size="small"
            disabled={!canManage}
            value={item.amount ?? 0}
            onCommit={(val) => onManualFieldChange(item._id, 'amount', val)}
            sx={{ width: 112, ...COMPACT_INPUT_SX }}
          />
        </TableCell>
        <TableCell sx={{ py: 0.5, px: 1, verticalAlign: 'middle' }}>
          <InlineWorkers
            item={item}
            allWorkers={allWorkers}
            canManage={canManage}
            onRepairWorkerChange={onRepairWorkerChange}
            onRepairPercentageChange={onRepairPercentageChange}
            onAddRepairWorkerRow={onAddRepairWorkerRow}
            onRemoveRepairWorkerRow={onRemoveRepairWorkerRow}
          />
        </TableCell>
        {canManage && (
          <TableCell sx={{ py: 0.5, px: 0.5, verticalAlign: 'middle' }}>
            <IconButton size="small" color="error" onClick={() => onRemoveManualItem(item._id)} sx={{ p: 0.25 }}>
              <Delete sx={{ fontSize: 16 }} />
            </IconButton>
          </TableCell>
        )}
      </TableRow>
    );
  },
  (prev, next) =>
    prev.item === next.item &&
    prev.index === next.index &&
    prev.canManage === next.canManage &&
    prev.allWorkers === next.allWorkers
);

// ============================================================
// ✅ ApiRepairItemRow: tách riêng + memo hoá (chỉ đọc, nhẹ hơn
// nhưng vẫn tách ra để không bị render lại khi gõ ở bảng "nhập tay").
// ============================================================
const ApiRepairItemRow = React.memo(
  function ApiRepairItemRow({
    item,
    index,
    allWorkers,
    canManage,
    onRepairWorkerChange,
    onRepairPercentageChange,
    onAddRepairWorkerRow,
    onRemoveRepairWorkerRow,
  }) {
    return (
      <TableRow hover>
        <TableCell sx={{ py: 0.5, px: 1, verticalAlign: 'middle' }}>{index + 1}</TableCell>
        <TableCell sx={{ py: 0.5, px: 1, verticalAlign: 'middle', fontSize: 13 }}>
          {item.groupName || 'Khác'}
        </TableCell>
        <TableCell
          sx={{
            py: 0.5,
            px: 1,
            verticalAlign: 'middle',
            fontSize: 13,
            maxWidth: 280,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={item.content}
        >
          {item.content}
        </TableCell>
        <TableCell sx={{ py: 0.5, px: 1, verticalAlign: 'middle', fontSize: 13 }} align="right">
          {item.quantity}
        </TableCell>
        <TableCell sx={{ py: 0.5, px: 1, verticalAlign: 'middle', fontSize: 13, whiteSpace: 'nowrap' }} align="right">
          {formatMoney(item.unitPrice)}
        </TableCell>
        <TableCell sx={{ py: 0.5, px: 1, verticalAlign: 'middle', fontSize: 13, whiteSpace: 'nowrap' }} align="right">
          {formatMoney(item.amount)}
        </TableCell>
        <TableCell sx={{ py: 0.5, px: 1, verticalAlign: 'middle' }}>
          <InlineWorkers
            item={item}
            allWorkers={allWorkers}
            canManage={canManage}
            onRepairWorkerChange={onRepairWorkerChange}
            onRepairPercentageChange={onRepairPercentageChange}
            onAddRepairWorkerRow={onAddRepairWorkerRow}
            onRemoveRepairWorkerRow={onRemoveRepairWorkerRow}
          />
        </TableCell>
      </TableRow>
    );
  },
  (prev, next) =>
    prev.item === next.item &&
    prev.index === next.index &&
    prev.canManage === next.canManage &&
    prev.allWorkers === next.allWorkers
);

const RepairItemsDialog = ({
  open,
  onClose,
  isMobile,
  canManage,
  repairCar,
  repairLoading,
  repairSaving,
  repairItems,
  apiRepairItems,
  manualRepairItems,
  allWorkers,
  workersById,
  onSave,
  onRepairWorkerChange,
  onRepairPercentageChange,
  onAddRepairWorkerRow,
  onRemoveRepairWorkerRow,
  onManualFieldChange,
  onAddManualItem,
  onRemoveManualItem,
}) => {
  const totalAmount = useMemo(
    () => repairItems.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [repairItems]
  );

  const revenuePreview = useMemo(
    () => getWorkerRevenuePreview(repairItems, workersById),
    [repairItems, workersById]
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      fullScreen={isMobile}
      TransitionComponent={Slide}
      TransitionProps={{ direction: 'up' }}
      PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3 } }}
    >
      <DialogTitle>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptLong color="info" />
            <Typography variant="h6" fontWeight="bold">
              Chi tiết lệnh sửa chữa — {repairCar?.plateNumber || ''} - {repairCar?.roNumber || ''}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Mỗi hàng: thông tin hạng mục + phân công thợ trên cùng một dòng
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: isMobile ? 2 : 3 }}>
        {repairLoading ? (
          <Typography align="center" sx={{ py: 4 }}>
            Đang tải chi tiết sửa chữa...
          </Typography>
        ) : (
          <>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <ReceiptLong color="info" sx={{ fontSize: 18 }} />
                <Typography variant="subtitle1" fontWeight="bold">
                  Hạng mục từ báo giá
                </Typography>
                <Chip label="API" size="small" variant="outlined" sx={{ height: 20 }} />
              </Stack>
              {apiRepairItems.length === 0 ? (
                <Alert severity="info" sx={{ py: 0.5, mb: 1 }}>
                  Chưa có hạng mục từ báo giá.
                </Alert>
              ) : (
                <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
                  <Table size="small" sx={{ minWidth: 1210 }}>
                    <TableHead>{renderCompactRepairTableHead(canManage, false)}</TableHead>
                    <TableBody>
                      {apiRepairItems.map((item, index) => (
                        <ApiRepairItemRow
                          key={item._id}
                          item={item}
                          index={index}
                          allWorkers={allWorkers}
                          canManage={canManage}
                          onRepairWorkerChange={onRepairWorkerChange}
                          onRepairPercentageChange={onRepairPercentageChange}
                          onAddRepairWorkerRow={onAddRepairWorkerRow}
                          onRemoveRepairWorkerRow={onRemoveRepairWorkerRow}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              )}
            </Box>

            <Divider sx={{ my: 1.5 }} />

            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <EditNote color="warning" sx={{ fontSize: 18 }} />
                  <Typography variant="subtitle1" fontWeight="bold">
                    Công việc ngoài báo giá
                  </Typography>
                  <Chip label="Nhập tay" size="small" color="warning" variant="outlined" sx={{ height: 20 }} />
                </Stack>
                {canManage && (
                  <Button size="small" variant="contained" color="warning" startIcon={<Add />} onClick={onAddManualItem}>
                    Thêm
                  </Button>
                )}
              </Stack>
              {manualRepairItems.length === 0 ? (
                <Alert severity="warning" sx={{ py: 0.5 }}>
                  Chưa có công việc ngoài báo giá.
                </Alert>
              ) : (
                <Paper variant="outlined" sx={{ overflowX: 'auto', borderColor: '#fcd34d' }}>
                  <Table size="small" sx={{ minWidth: 1210 }}>
                    <TableHead>{renderCompactRepairTableHead(canManage, true)}</TableHead>
                    <TableBody>
                      {manualRepairItems.map((item, index) => (
                        <ManualRepairItemRow
                          key={item._id}
                          item={item}
                          index={index}
                          canManage={canManage}
                          allWorkers={allWorkers}
                          onManualFieldChange={onManualFieldChange}
                          onRemoveManualItem={onRemoveManualItem}
                          onRepairWorkerChange={onRepairWorkerChange}
                          onRepairPercentageChange={onRepairPercentageChange}
                          onAddRepairWorkerRow={onAddRepairWorkerRow}
                          onRemoveRepairWorkerRow={onRemoveRepairWorkerRow}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              )}
            </Box>
          </>
        )}

        {!repairLoading && repairItems.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" textAlign="right">
              Tổng thành tiền hạng mục: {formatMoney(totalAmount)}
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="right" sx={{ mb: 1 }}>
              Doanh thu thợ = thành tiền × % thực hiện × 75% (trừ hoa hồng).
            </Typography>
            {revenuePreview.length > 0 && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Xem trước doanh thu theo thợ (chưa trừ hoa hồng)
                </Typography>
                <Stack spacing={0.5}>
                  {revenuePreview.map((entry) => (
                    <Box
                      key={entry.name}
                      sx={{ display: 'flex', justifyContent: 'space-between' }}
                    >
                      <Typography variant="body2">{entry.name}</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {formatMoney(entry.total)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', gap: 2, p: 2, flexDirection: isMobile ? 'column' : 'row' }}>
        <Button onClick={onClose} variant="outlined" fullWidth={isMobile}>
          Đóng
        </Button>
        {canManage && (
          <Button
            onClick={onSave}
            variant="contained"
            color="primary"
            disabled={repairLoading || repairSaving}
            fullWidth={isMobile}
          >
            {repairSaving ? 'Đang lưu...' : 'Lưu phân công & công việc ghi thêm'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default RepairItemsDialog;

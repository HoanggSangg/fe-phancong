import React, { useMemo } from 'react';
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
  const renderInlineWorkers = (item) => (
    <Stack spacing={0.5} sx={{ minWidth: 320 }}>
      {(item.selectedWorkers || []).map((entry, rowIndex) => (
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
          <TextField
            size="small"
            type="number"
            label="%"
            disabled={!canManage}
            value={entry.percentage}
            onChange={(e) => onRepairPercentageChange(item._id, rowIndex, e.target.value)}
            inputProps={{ min: 0, max: 100, step: 1 }}
            sx={{ width: 72, ...COMPACT_INPUT_SX }}
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
      ))}
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

  const renderCompactRepairTableHead = (editable = false) => (
    <TableRow>
      <TableCell sx={{ fontWeight: 'bold', py: 0.75, px: 1, width: 36 }}>#</TableCell>
      <TableCell sx={{ fontWeight: 'bold', py: 0.75, px: 1, width: 90 }}>Nhóm</TableCell>
      <TableCell sx={{ fontWeight: 'bold', py: 0.75, px: 1, minWidth: 160 }}>Nội dung</TableCell>
      <TableCell sx={{ fontWeight: 'bold', py: 0.75, px: 1, width: 72 }} align="right">SL</TableCell>
      <TableCell sx={{ fontWeight: 'bold', py: 0.75, px: 1, width: 120 }} align="right">ĐG</TableCell>
      <TableCell sx={{ fontWeight: 'bold', py: 0.75, px: 1, width: 120 }} align="right">TT</TableCell>
      <TableCell sx={{ fontWeight: 'bold', py: 0.75, px: 1, minWidth: 340 }}>Thợ · %</TableCell>
      {editable && canManage && (
        <TableCell sx={{ fontWeight: 'bold', py: 0.75, px: 0.5, width: 36 }} />
      )}
    </TableRow>
  );

  const renderManualRepairItemCard = (item, index) => (
    <TableRow key={item._id} hover sx={{ bgcolor: '#fffbeb' }}>
      <TableCell sx={{ py: 0.5, px: 1, verticalAlign: 'middle' }}>{index + 1}</TableCell>
      <TableCell sx={{ py: 0.5, px: 1, verticalAlign: 'middle' }}>
        <TextField
          size="small"
          disabled={!canManage}
          value={item.groupName || ''}
          onChange={(e) => onManualFieldChange(item._id, 'groupName', e.target.value)}
          sx={{ width: 84, ...COMPACT_INPUT_SX }}
        />
      </TableCell>
      <TableCell sx={{ py: 0.5, px: 1, verticalAlign: 'middle' }}>
        <TextField
          size="small"
          disabled={!canManage}
          placeholder="Nội dung *"
          value={item.content || ''}
          onChange={(e) => onManualFieldChange(item._id, 'content', e.target.value)}
          fullWidth
          sx={COMPACT_INPUT_SX}
        />
      </TableCell>
      <TableCell sx={{ py: 0.5, px: 1, verticalAlign: 'middle' }} align="right">
        <TextField
          size="small"
          type="number"
          disabled={!canManage}
          value={item.quantity ?? 1}
          onChange={(e) => onManualFieldChange(item._id, 'quantity', e.target.value)}
          inputProps={{ min: 0, step: 1 }}
          sx={{ width: 64, ...COMPACT_INPUT_SX }}
        />
      </TableCell>
      <TableCell sx={{ py: 0.5, px: 1, verticalAlign: 'middle' }} align="right">
        <TextField
          size="small"
          type="number"
          disabled={!canManage}
          value={item.unitPrice ?? 0}
          onChange={(e) => onManualFieldChange(item._id, 'unitPrice', e.target.value)}
          inputProps={{ min: 0, step: 1000 }}
          sx={{ width: 112, ...COMPACT_INPUT_SX }}
        />
      </TableCell>
      <TableCell sx={{ py: 0.5, px: 1, verticalAlign: 'middle' }} align="right">
        <TextField
          size="small"
          type="number"
          disabled={!canManage}
          value={item.amount ?? 0}
          onChange={(e) => onManualFieldChange(item._id, 'amount', e.target.value)}
          inputProps={{ min: 0, step: 1000 }}
          sx={{ width: 112, ...COMPACT_INPUT_SX }}
        />
      </TableCell>
      <TableCell sx={{ py: 0.5, px: 1, verticalAlign: 'middle' }}>
        {renderInlineWorkers(item)}
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

  const renderApiRepairItemCard = (item, index) => (
    <TableRow key={item._id} hover>
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
        {renderInlineWorkers(item)}
      </TableCell>
    </TableRow>
  );

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
              Chi tiết lệnh sửa chữa — {repairCar?.plateNumber || ''}
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
                  <Table size="small" sx={{ minWidth: 1100 }}>
                    <TableHead>{renderCompactRepairTableHead(false)}</TableHead>
                    <TableBody>
                      {apiRepairItems.map((item, index) => renderApiRepairItemCard(item, index))}
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
                  <Table size="small" sx={{ minWidth: 1100 }}>
                    <TableHead>{renderCompactRepairTableHead(true)}</TableHead>
                    <TableBody>
                      {manualRepairItems.map((item, index) => renderManualRepairItemCard(item, index))}
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

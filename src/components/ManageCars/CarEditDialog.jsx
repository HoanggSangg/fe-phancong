import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { Edit } from '@mui/icons-material';
import { WORKER_SELECT_SX } from '../../constants/layout';
import { getCarROLabel } from '../../utils/carListHelpers';

const CarEditDialog = ({
  open,
  onClose,
  editData,
  supervisors,
  supervisorsLoading = false,
  mergeSelectedWorkers,
  onChange,
  onSave,
}) => {
  const roLabel = getCarROLabel(editData);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Edit color="primary" />
            <Typography variant="h6" fontWeight="bold">Cập nhật thông tin xe</Typography>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Biển số xe"
              name="plateNumber"
              value={editData.plateNumber || ''}
              onChange={onChange}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Số RO"
              fullWidth
              value={roLabel || 'Chưa có RO'}
              InputProps={{ readOnly: true }}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Loại xe (từ API)"
              fullWidth
              value={editData.externalCarTypeName || ''}
              InputProps={{ readOnly: true }}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Cố vấn (từ API)"
              fullWidth
              value={editData.advisorName || '—'}
              InputProps={{ readOnly: true }}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Thời gian giao (từ API)"
              fullWidth
              value={editData.deliveryTime || 'Chưa xác định'}
              InputProps={{ readOnly: true }}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth sx={{ mb: 2 }} size="small" disabled={supervisorsLoading}>
              <InputLabel id="car-edit-supervisor-label" shrink>Giám sát</InputLabel>
              <Select
                labelId="car-edit-supervisor-label"
                id="car-edit-supervisor-select"
                name="supervisor"
                value={editData.supervisor || ''}
                onChange={onChange}
                label="Giám sát"
                notched
                displayEmpty
                renderValue={(value) => supervisorsLoading
                  ? 'Đang tải giám sát...'
                  : (supervisors.find((supervisor) => supervisor._id === value)?.name || 'Không chọn')}
              >
                <MenuItem value="">
                  <em>Không chọn</em>
                </MenuItem>
                {supervisors.map((supervisor) => (
                  <MenuItem key={supervisor._id} value={supervisor._id}>
                    {supervisor.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 'auto' }}>
            <Autocomplete
              multiple
              options={mergeSelectedWorkers(editData.mainWorkers)}
              getOptionLabel={(option) => option.name || ''}
              value={mergeSelectedWorkers(editData.mainWorkers).filter((worker) =>
                editData.mainWorkers?.includes(worker._id)
              )}
              onChange={(event, newValue) => {
                onChange({
                  target: {
                    name: 'mainWorkers',
                    value: newValue.map((worker) => worker._id),
                  },
                });
              }}
              renderInput={(params) => (
                <TextField {...params} label="Thợ chính" InputLabelProps={{ shrink: true }} sx={{ mb: 2 }} />
              )}
              sx={{
                mb: 2,
                ...WORKER_SELECT_SX,
                '& .MuiAutocomplete-inputRoot': { minWidth: 280 },
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 'auto' }}>
            <Autocomplete
              multiple
              options={mergeSelectedWorkers(editData.subWorkers)}
              getOptionLabel={(option) => option.name || ''}
              value={mergeSelectedWorkers(editData.subWorkers).filter((worker) =>
                editData.subWorkers?.includes(worker._id)
              )}
              onChange={(event, newValue) => {
                onChange({
                  target: {
                    name: 'subWorkers',
                    value: newValue.map((worker) => worker._id),
                  },
                });
              }}
              renderInput={(params) => (
                <TextField {...params} label="Thợ phụ" InputLabelProps={{ shrink: true }} sx={{ mb: 2 }} />
              )}
              sx={{
                mb: 2,
                ...WORKER_SELECT_SX,
                '& .MuiAutocomplete-inputRoot': { minWidth: 280 },
              }}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', gap: 2, p: 2 }}>
        <Button onClick={onClose} variant="outlined">Hủy</Button>
        <Button onClick={onSave} variant="contained" color="primary">
          Lưu
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CarEditDialog;

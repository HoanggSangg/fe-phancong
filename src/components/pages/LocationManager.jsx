import React, { useEffect, useMemo, useState } from 'react';
import {
  getAllLocations,
  createLocation,
  updateLocation,
  deleteLocation,
} from '../apis/index';
import {
  Box,
  TextField,
  Button,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Tooltip,
  Grid,
  Chip,
  Stack,
} from '@mui/material';
import { Edit, Delete, LocationOn, Lock } from '@mui/icons-material';
import PageLayout from '../common/PageLayout';
import PageHeader from '../common/PageHeader';

const LocationRow = ({ location, index, onEdit, onDelete }) => (
  <Paper
    variant="outlined"
    sx={{
      px: 1.25,
      py: 0.85,
      borderRadius: 1.5,
      border: '2px solid',
      borderColor: 'grey.300',
      bgcolor: 'background.paper',
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      height: '100%',
      transition: 'border-color 0.2s',
      '&:hover': { borderColor: 'success.light' },
    }}
  >
    <Box
      sx={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        bgcolor: 'success.main',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <LocationOn sx={{ fontSize: 22 }} />
    </Box>

    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="body2" fontWeight={700} noWrap sx={{ fontSize: 13, lineHeight: 1.3 }}>
        {location.name}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
        STT {index + 1}
      </Typography>
    </Box>

    <Box sx={{ display: 'flex', flexShrink: 0, gap: 0.25 }}>
      <Tooltip title="Chỉnh sửa">
        <IconButton size="small" onClick={() => onEdit(location)} aria-label="Sửa">
          <Edit sx={{ fontSize: 17 }} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Xóa">
        <IconButton size="small" onClick={() => onDelete(location._id)} aria-label="Xóa" color="error">
          <Delete sx={{ fontSize: 17 }} />
        </IconButton>
      </Tooltip>
    </Box>
  </Paper>
);

const LocationManager = () => {
  const [locations, setLocations] = useState([]);
  const [newName, setNewName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState({ id: '', name: '' });

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const fetchLocations = async () => {
    try {
      const res = await getAllLocations();
      setLocations(res.data || []);
    } catch (err) {
      console.error('Lỗi khi tải địa điểm:', err);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const filteredLocations = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return locations;
    return locations.filter((item) => item.name?.toLowerCase().includes(keyword));
  }, [locations, searchTerm]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      setLoading(true);
      await createLocation({ name: newName.trim() });
      setNewName('');
      fetchLocations();
    } catch (err) {
      console.error('Lỗi khi tạo địa điểm:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (location) => {
    setEditData({ id: location._id, name: location.name });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editData.name.trim()) return;
    try {
      await updateLocation(editData.id, { name: editData.name.trim() });
      setEditOpen(false);
      fetchLocations();
    } catch (err) {
      console.error('Lỗi khi cập nhật địa điểm:', err);
    }
  };

  const isPasswordVerified = () => {
    const verifiedUntil = localStorage.getItem('location_verified_until');
    return verifiedUntil && new Date(verifiedUntil) > new Date();
  };

  const markPasswordVerified = () => {
    const expiry = new Date(Date.now() + 60 * 60 * 10000);
    localStorage.setItem('location_verified_until', expiry.toISOString());
  };

  const handleDelete = async (id) => {
    if (isPasswordVerified()) {
      proceedDelete(id);
    } else {
      setDeleteTargetId(id);
      setConfirmDialogOpen(true);
    }
  };

  const proceedDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa địa điểm này không?')) return;
    try {
      await deleteLocation(id);
      fetchLocations();
    } catch (err) {
      console.error('Lỗi khi xóa địa điểm:', err);
    }
  };

  return (
    <PageLayout>
      <PageHeader
        icon={<LocationOn color="primary" />}
        title="Quản lý địa điểm"
        subtitle={`${filteredLocations.length} địa điểm trong hệ thống`}
      />

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'center' },
          gap: 1.5,
          bgcolor: 'background.paper',
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
          p: { xs: 1.5, sm: 2 },
          mb: 1.5,
        }}
      >
        <Chip
          label={`Tổng: ${filteredLocations.length}`}
          color="success"
          variant="outlined"
          size="small"
          sx={{ fontWeight: 700, alignSelf: { xs: 'flex-start', md: 'center' }, flexShrink: 0 }}
        />

        <Box
          component="form"
          onSubmit={handleCreate}
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1,
            alignItems: { sm: 'center' },
            minWidth: 0,
          }}
        >
          <TextField
            label="Tên địa điểm mới"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            size="small"
            fullWidth
            sx={{ maxWidth: { sm: 280 } }}
          />
          <TextField
            label="Tìm địa điểm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            fullWidth
            sx={{ maxWidth: { sm: 220 } }}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            size="small"
            sx={{ flexShrink: 0, whiteSpace: 'nowrap', textTransform: 'none' }}
          >
            {loading ? 'Đang thêm...' : 'Thêm'}
          </Button>
        </Box>
      </Box>

      {filteredLocations.length === 0 ? (
        <Typography align="center" variant="body2" color="text.secondary">
          {searchTerm.trim() ? 'Không tìm thấy địa điểm phù hợp.' : 'Chưa có địa điểm nào.'}
        </Typography>
      ) : (
        <Grid container spacing={1}>
          {filteredLocations.map((location, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3, xl: 2 }} key={location._id}>
              <LocationRow
                location={location}
                index={index}
                onEdit={handleEditClick}
                onDelete={handleDelete}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Cập nhật địa điểm</DialogTitle>
        <DialogContent>
          <TextField
            label="Tên địa điểm"
            value={editData.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            required
            fullWidth
            size="small"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)} variant="outlined">Huỷ</Button>
          <Button onClick={handleEditSave} variant="contained">Lưu</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: 'error.main', fontWeight: 700 }}>
          <Stack direction="row" alignItems="center" gap={1}>
            <Lock fontSize="small" />
            Xác thực để xoá
          </Stack>
        </DialogTitle>
        <DialogContent>
          <TextField
            type="password"
            label="Nhập mật khẩu"
            fullWidth
            size="small"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)} variant="outlined">Huỷ</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (password === '123456@') {
                markPasswordVerified();
                setConfirmDialogOpen(false);
                setPassword('');
                proceedDelete(deleteTargetId);
              } else {
                alert('Sai mật khẩu!');
              }
            }}
          >
            Xác nhận
          </Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
};

export default LocationManager;

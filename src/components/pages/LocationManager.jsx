import React, { useState, useEffect } from 'react';
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
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Tooltip,
} from '@mui/material';

import { Edit, Delete, Save, Close } from '@mui/icons-material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LockIcon from '@mui/icons-material/Lock';
import PageLayout from '../common/PageLayout';
import PageHeader from '../common/PageHeader';

const LocationManager = () => {
  const [locations, setLocations] = useState([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);

  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const res = await getAllLocations();
      setLocations(res.data);
    } catch (err) {
      console.error('Lỗi khi tải địa điểm:', err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      setLoading(true);
      await createLocation({ name: newName });
      setNewName('');
      fetchLocations();
    } catch (err) {
      console.error('Lỗi khi tạo địa điểm:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id) => {
    try {
      await updateLocation(id, { name: editName });
      setEditId(null);
      setEditName('');
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
    const expiry = new Date(Date.now() + 60 * 60 * 10000); // 10 giờ
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
    <PageLayout maxWidth="narrow">
      <PageHeader
        icon={<LocationOnIcon />}
        title="Quản lý địa điểm"
      />

      <Paper elevation={3} sx={{ p: 2, mb: 3, borderRadius: 3, boxShadow: 2 }}>
        <Box
          component="form"
          onSubmit={handleCreate}
          sx={{ display: 'flex', gap: 2 }}
        >
          <TextField
            label="Tên địa điểm mới"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <Button type="submit" variant="contained" disabled={loading} sx={{ borderRadius: 2, fontWeight: 600 }}>
            {loading ? 'Đang thêm...' : 'Thêm'}
          </Button>
        </Box>
      </Paper>

      <Paper elevation={4} sx={{ borderRadius: 3, boxShadow: 3, p: 1 }}>
        <List>
          {locations.map((loc) => (
            <React.Fragment key={loc._id}>
              <ListItem
                sx={{
                  '&:hover': { backgroundColor: '#f5f5f5' },
                  borderRadius: 2,
                  mb: 1,
                  px: 1,
                }}
                secondaryAction={
                  editId === loc._id ? (
                    <>
                      <Tooltip title="Lưu">
                        <span>
                          <IconButton onClick={() => handleUpdate(loc._id)} sx={{ borderRadius: 2 }}>
                            <Save />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Huỷ">
                        <span>
                          <IconButton onClick={() => setEditId(null)} sx={{ borderRadius: 2 }}>
                            <Close />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </>
                  ) : (
                    <>
                      <Tooltip title="Sửa địa điểm">
                        <span>
                          <IconButton
                            onClick={() => {
                              setEditId(loc._id);
                              setEditName(loc.name);
                            }}
                            sx={{ borderRadius: 2 }}
                          >
                            <Edit />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Xoá địa điểm">
                        <span>
                          <IconButton onClick={() => handleDelete(loc._id)} sx={{ borderRadius: 2 }}>
                            <Delete />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </>
                  )
                }
              >
                {editId === loc._id ? (
                  <TextField
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    fullWidth
                    variant="standard"
                    InputLabelProps={{ shrink: true }}
                    sx={{ background: '#fffde7', borderRadius: 1 }}
                  />
                ) : (
                  <ListItemText primary={loc.name} sx={{ ml: 1 }} />
                )}
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
        </List>
      </Paper>

      {/* Dialog xác thực mật khẩu xóa */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LockIcon color="error" />
            <Typography variant="h6" fontWeight="bold">Xác thực để xoá</Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <TextField
            type="password"
            label="Nhập mật khẩu"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mt: 2, mb: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', gap: 2, p: 2 }}>
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
                alert('❌ Sai mật khẩu!');
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

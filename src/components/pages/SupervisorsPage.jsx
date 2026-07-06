import React, { useEffect, useMemo, useState } from 'react';
import {
  getAllSupervisors,
  deleteSupervisor,
  updateSupervisor,
  createSupervisor,
} from '../apis/index';
import {
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Grid,
  Paper,
  Avatar,
  Tooltip,
  Chip,
} from '@mui/material';
import { Edit, Delete, SupervisorAccount } from '@mui/icons-material';
import PageLayout from '../common/PageLayout';
import PageHeader from '../common/PageHeader';

const SupervisorRow = ({ supervisor, index, onEdit, onDelete }) => (
  <Paper
    sx={{
      px: 1.25,
      py: 0.75,
      borderRadius: 2,
      border: '1px solid',
      borderColor: 'divider',
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      height: '100%',
    }}
  >
    <Avatar
      sx={{
        width: 40,
        height: 40,
        bgcolor: '#f59e0b',
        flexShrink: 0,
      }}
    >
      <SupervisorAccount sx={{ fontSize: 22 }} />
    </Avatar>

    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="body2" fontWeight={700} noWrap sx={{ fontSize: 13, lineHeight: 1.3 }}>
        {supervisor.name}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
        STT {index + 1}
      </Typography>
    </Box>

    <Box sx={{ display: 'flex', flexShrink: 0, gap: 0.25 }}>
      <Tooltip title="Chỉnh sửa">
        <IconButton size="small" onClick={() => onEdit(supervisor)} aria-label="Sửa">
          <Edit sx={{ fontSize: 17 }} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Xóa">
        <IconButton size="small" onClick={() => onDelete(supervisor._id)} aria-label="Xóa" color="error">
          <Delete sx={{ fontSize: 17 }} />
        </IconButton>
      </Tooltip>
    </Box>
  </Paper>
);

const SupervisorsPage = () => {
  const [supervisors, setSupervisors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState({ id: '', name: '' });
  const [newSupervisor, setNewSupervisor] = useState({ name: '' });

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const fetchSupervisors = async () => {
    try {
      const res = await getAllSupervisors();
      setSupervisors(res.data || []);
    } catch (error) {
      console.error('Lỗi khi lấy danh sách giám sát:', error);
    }
  };

  useEffect(() => {
    fetchSupervisors();
  }, []);

  const filteredSupervisors = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return supervisors;
    return supervisors.filter((item) => item.name?.toLowerCase().includes(keyword));
  }, [supervisors, searchTerm]);

  const isPasswordVerified = () => {
    const verifiedUntil = localStorage.getItem('verified_until');
    return verifiedUntil && new Date(verifiedUntil) > new Date();
  };

  const markPasswordVerified = () => {
    const expiry = new Date(Date.now() + 60 * 60 * 10000);
    localStorage.setItem('verified_until', expiry.toISOString());
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
    if (!window.confirm('Bạn có chắc muốn xoá người giám sát này?')) return;
    try {
      await deleteSupervisor(id);
      fetchSupervisors();
    } catch (error) {
      console.error('Lỗi khi xoá:', error);
    }
  };

  const handleEditClick = (supervisor) => {
    setEditData({ id: supervisor._id, name: supervisor.name });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    try {
      await updateSupervisor(editData.id, { name: editData.name });
      setEditOpen(false);
      fetchSupervisors();
    } catch (error) {
      console.error('Lỗi khi cập nhật:', error);
    }
  };

  const handleAddSupervisor = async (e) => {
    e.preventDefault();
    if (!newSupervisor.name.trim()) {
      alert('Vui lòng nhập tên giám sát');
      return;
    }
    try {
      await createSupervisor(newSupervisor);
      setNewSupervisor({ name: '' });
      fetchSupervisors();
    } catch (error) {
      console.error('Lỗi khi thêm giám sát:', error);
    }
  };

  return (
    <PageLayout>
      <PageHeader
        emoji="👷‍♂️"
        title="Danh sách giám sát"
        subtitle={`Quản lý giám sát viên — ${filteredSupervisors.length} người`}
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <Chip
            label={`Tổng: ${filteredSupervisors.length}`}
            color="primary"
            variant="outlined"
            size="small"
            sx={{ fontWeight: 700 }}
          />
        </Box>

        <Box
          component="form"
          onSubmit={handleAddSupervisor}
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1,
            alignItems: { sm: 'center' },
          }}
        >
          <TextField
            label="Tên giám sát"
            value={newSupervisor.name}
            onChange={(e) => setNewSupervisor({ name: e.target.value })}
            required
            size="small"
            fullWidth
            sx={{ maxWidth: { sm: 280 } }}
          />
          <TextField
            label="Tìm giám sát"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            fullWidth
            sx={{ maxWidth: { sm: 220 } }}
          />
          <Button
            type="submit"
            variant="contained"
            size="small"
            sx={{ flexShrink: 0, whiteSpace: 'nowrap', textTransform: 'none' }}
          >
            Thêm
          </Button>
        </Box>
      </Box>

      {filteredSupervisors.length === 0 ? (
        <Typography align="center" variant="body2" color="text.secondary">
          Chưa có giám sát nào.
        </Typography>
      ) : (
        <Grid container spacing={1}>
          {filteredSupervisors.map((supervisor, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={supervisor._id}>
              <SupervisorRow
                supervisor={supervisor}
                index={index}
                onEdit={handleEditClick}
                onDelete={handleDelete}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Cập nhật giám sát</DialogTitle>
        <DialogContent>
          <TextField
            label="Tên"
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
        <DialogTitle sx={{ color: 'error.main', fontWeight: 'bold' }}>Xác thực để xoá</DialogTitle>
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

export default SupervisorsPage;

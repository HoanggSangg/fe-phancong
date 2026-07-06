import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Alert,
  Chip,
  Stack,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  InputAdornment,
  Switch,
  FormControlLabel,
  Divider,
  Grid,
} from '@mui/material';
import { Add, Delete, Edit, Search, AdminPanelSettings, LockOpen, Lock } from '@mui/icons-material';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getAllWorkers,
} from '../apis';
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from '../../utils/permissions';
import PageLayout from '../common/PageLayout';
import PageHeader from '../common/PageHeader';
import FilterPanel from '../common/FilterPanel';

const roleColor = {
  admin: 'error',
  giam_sat: 'warning',
  ktv: 'info',
};

const UserManagement = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [users, setUsers] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [form, setForm] = useState({
    username: '',
    password: '',
    fullName: '',
    role: 'ktv',
    workerId: '',
    isActive: true,
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  const workerMap = useMemo(
    () => Object.fromEntries(workers.map((w) => [w._id, w.name])),
    [workers]
  );

  const loadData = async () => {
    const [usersRes, workersRes] = await Promise.all([getUsers(), getAllWorkers()]);
    setUsers(usersRes.data || []);
    setWorkers(workersRes.data || []);
  };

  useEffect(() => {
    loadData().catch(() => setMessage({ type: 'error', text: 'Không tải được dữ liệu' }));
  }, []);

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchRole = roleFilter === 'all' || user.role === roleFilter;
      const matchSearch =
        !keyword ||
        user.fullName?.toLowerCase().includes(keyword) ||
        user.username?.toLowerCase().includes(keyword);
      return matchRole && matchSearch;
    });
  }, [users, search, roleFilter]);

  const openCreate = () => {
    setEditingUser(null);
    setForm({ username: '', password: '', fullName: '', role: 'ktv', workerId: '', isActive: true });
    setDialogOpen(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({
      username: user.username,
      password: '',
      fullName: user.fullName,
      role: user.role,
      workerId: user.worker?._id || user.worker || '',
      isActive: user.isActive !== false,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        fullName: form.fullName,
        role: form.role,
        workerId: form.workerId || null,
        isActive: form.isActive,
      };

      if (editingUser) {
        if (form.password) payload.password = form.password;
        await updateUser(editingUser._id, payload);
      } else {
        if (!form.username || !form.password) {
          setMessage({ type: 'error', text: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
          return;
        }
        await createUser({ ...payload, username: form.username, password: form.password });
      }

      setDialogOpen(false);
      setMessage({ type: 'success', text: 'Lưu tài khoản thành công' });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Lưu thất bại' });
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await updateUser(user._id, { isActive: !user.isActive });
      setMessage({
        type: 'success',
        text: user.isActive ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản',
      });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Cập nhật thất bại' });
    }
  };

  const handleQuickRole = async (user, role) => {
    if (user.role === role) return;
    if (!window.confirm(`Đổi vai trò ${user.fullName} thành ${ROLE_LABELS[role]}?`)) return;
    try {
      await updateUser(user._id, { role });
      setMessage({ type: 'success', text: 'Đã cập nhật vai trò' });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Cập nhật thất bại' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa tài khoản này?')) return;
    try {
      await deleteUser(id);
      setMessage({ type: 'success', text: 'Đã xóa tài khoản' });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Xóa thất bại' });
    }
  };

  const renderUserCard = (user) => (
    <Card key={user._id} variant="outlined" sx={{ mb: 1.5 }}>
      <CardContent>
        <Stack spacing={1.2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'flex-start' }}>
            <Box>
              <Typography fontWeight="bold">{user.fullName}</Typography>
              <Typography variant="body2" color="text.secondary">@{user.username}</Typography>
            </Box>
            <Chip size="small" label={ROLE_LABELS[user.role]} color={roleColor[user.role]} />
          </Box>

          <Typography variant="body2">
            Thợ liên kết: {workerMap[user.worker] || '—'}
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={user.isActive !== false}
                onChange={() => handleToggleActive(user)}
                color="success"
              />
            }
            label={user.isActive !== false ? 'Đang hoạt động' : 'Đã khóa'}
          />

          <Stack direction="row" spacing={1} flexWrap="wrap">
            {['admin', 'giam_sat', 'ktv'].map((role) => (
              <Chip
                key={role}
                size="small"
                variant={user.role === role ? 'filled' : 'outlined'}
                label={ROLE_LABELS[role]}
                onClick={() => handleQuickRole(user, role)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Stack>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" startIcon={<Edit />} onClick={() => openEdit(user)}>Sửa</Button>
            <Button size="small" color="error" startIcon={<Delete />} onClick={() => handleDelete(user._id)}>Xóa</Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );

  return (
    <PageLayout>
      <PageHeader
        icon={<AdminPanelSettings color="error" />}
        title="Quản lý tài khoản & phân quyền"
        subtitle="Admin có thể gán vai trò, khóa/mở tài khoản và liên kết KTV với thợ"
        actions={
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
            Thêm tài khoản
          </Button>
        }
      />

      {message.text && (
        <Alert severity={message.type || 'info'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      <FilterPanel title="Tìm kiếm">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 8 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Tìm theo tên hoặc username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Lọc vai trò"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <MenuItem value="all">Tất cả</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="giam_sat">Giám sát</MenuItem>
              <MenuItem value="ktv">KTV</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </FilterPanel>

      {isMobile ? (
        filteredUsers.map(renderUserCard)
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', width: '100%' }}>
          <Box sx={{ width: '100%', overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 900, width: '100%' }}>
            <TableHead sx={{ bgcolor: '#fafafa' }}>
              <TableRow>
                <TableCell>Họ tên</TableCell>
                <TableCell>Username</TableCell>
                <TableCell>Vai trò</TableCell>
                <TableCell>Thợ liên kết</TableCell>
                <TableCell>Trạng thái</TableCell>
                <TableCell align="right">Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user._id} hover>
                  <TableCell>{user.fullName}</TableCell>
                  <TableCell>@{user.username}</TableCell>
                  <TableCell>
                    <Chip size="small" label={ROLE_LABELS[user.role]} color={roleColor[user.role]} />
                  </TableCell>
                  <TableCell>{workerMap[user.worker] || '—'}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      icon={user.isActive !== false ? <LockOpen /> : <Lock />}
                      label={user.isActive !== false ? 'Hoạt động' : 'Khóa'}
                      color={user.isActive !== false ? 'success' : 'default'}
                      onClick={() => handleToggleActive(user)}
                      sx={{ cursor: 'pointer' }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEdit(user)}><Edit /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(user._id)}><Delete /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </Box>
        </Paper>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogTitle>{editingUser ? 'Sửa tài khoản' : 'Thêm tài khoản'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Họ tên" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} fullWidth required />
            {!editingUser && (
              <TextField label="Tên đăng nhập" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} fullWidth required />
            )}
            <TextField
              label={editingUser ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu'}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              fullWidth
              required={!editingUser}
            />
            <TextField select label="Vai trò" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} fullWidth>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="giam_sat">Giám sát</MenuItem>
              <MenuItem value="ktv">KTV</MenuItem>
            </TextField>
            <Alert severity="info" sx={{ py: 0.5 }}>
              {ROLE_DESCRIPTIONS[form.role]}
            </Alert>
            <Divider />
            <TextField
              select
              label="Liên kết thợ (cho KTV)"
              value={form.workerId}
              onChange={(e) => setForm({ ...form, workerId: e.target.value })}
              fullWidth
              helperText="KTV cần liên kết thợ để xem đúng xe đang làm"
            >
              <MenuItem value="">Không liên kết</MenuItem>
              {workers.map((worker) => (
                <MenuItem key={worker._id} value={worker._id}>{worker.name} ({worker.soBaoDanh})</MenuItem>
              ))}
            </TextField>
            <FormControlLabel
              control={
                <Switch
                  id="user-form-is-active"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
              }
              label={form.isActive ? 'Tài khoản đang hoạt động' : 'Khóa tài khoản'}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Huỷ</Button>
          <Button variant="contained" onClick={handleSave}>Lưu</Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
};

export default UserManagement;

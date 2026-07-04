import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  AdminPanelSettings,
  RestartAlt,
  Save,
  Search,
  Security,
} from '@mui/icons-material';
import { getUsers, updateUser } from '../apis';
import {
  getDefaultPermissionsForRole,
  getEffectivePermissions,
  getPermissionGroups,
  PERMISSION_CATALOG,
  ROLE_LABELS,
  usesCustomPermissions,
} from '../../utils/permissions';

const roleColor = {
  admin: 'error',
  giam_sat: 'warning',
  ktv: 'info',
};

const AccountPermissionsPage = () => {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [draftPermissions, setDraftPermissions] = useState([]);
  const [useCustom, setUseCustom] = useState(false);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);

  const permissionGroups = useMemo(() => getPermissionGroups(), []);

  const loadUsers = async () => {
    const res = await getUsers();
    setUsers(res.data || []);
  };

  useEffect(() => {
    loadUsers().catch(() => setMessage({ type: 'error', text: 'Không tải được danh sách tài khoản' }));
  }, []);

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return users.filter((user) => {
      if (user.role === 'admin') return false;
      if (!keyword) return true;
      return (
        user.fullName?.toLowerCase().includes(keyword)
        || user.username?.toLowerCase().includes(keyword)
      );
    });
  }, [users, search]);

  const selectedUser = useMemo(
    () => users.find((user) => user._id === selectedUserId) || null,
    [users, selectedUserId]
  );

  useEffect(() => {
    if (!selectedUser) {
      setDraftPermissions([]);
      setUseCustom(false);
      return;
    }

    const custom = usesCustomPermissions(selectedUser);
    setUseCustom(custom);
    setDraftPermissions(
      custom
        ? [...selectedUser.permissions]
        : getDefaultPermissionsForRole(selectedUser.role)
    );
  }, [selectedUser]);

  const togglePermission = (key) => {
    setDraftPermissions((prev) => (
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    ));
  };

  const applyRolePreset = (role) => {
    setDraftPermissions(getDefaultPermissionsForRole(role));
    setUseCustom(true);
  };

  const resetToRoleDefault = () => {
    if (!selectedUser) return;
    setUseCustom(false);
    setDraftPermissions(getDefaultPermissionsForRole(selectedUser.role));
  };

  const handleSave = async () => {
    if (!selectedUser) return;

    try {
      setSaving(true);
      await updateUser(selectedUser._id, {
        permissions: useCustom ? draftPermissions : [],
      });
      setMessage({
        type: 'success',
        text: `Đã lưu phân quyền cho ${selectedUser.fullName}`,
      });
      await loadUsers();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Lưu phân quyền thất bại',
      });
    } finally {
      setSaving(false);
    }
  };

  const enabledCount = draftPermissions.length;
  const totalCount = PERMISSION_CATALOG.length;

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between">
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Security color="primary" />
              <Typography variant="h5" fontWeight="bold">Phân chức năng tài khoản</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Gán quyền truy cập từng chức năng cho từng tài khoản. Mặc định theo vai trò, có thể tùy chỉnh riêng.
            </Typography>
          </Box>
          <Chip
            icon={<AdminPanelSettings />}
            label="Chỉ Admin quản lý trang này"
            color="error"
            variant="outlined"
          />
        </Stack>
      </Paper>

      {message.text && (
        <Alert severity={message.type || 'info'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, borderRadius: 3, height: '100%' }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1.5 }}>
              Chọn tài khoản
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="Tìm theo tên hoặc username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />

            <Stack spacing={1}>
              {filteredUsers.map((user) => {
                const active = user._id === selectedUserId;
                const effectiveCount = getEffectivePermissions(user).length;
                return (
                  <Card
                    key={user._id}
                    variant="outlined"
                    sx={{
                      cursor: 'pointer',
                      borderColor: active ? 'primary.main' : 'divider',
                      bgcolor: active ? 'action.selected' : 'background.paper',
                    }}
                    onClick={() => setSelectedUserId(user._id)}
                  >
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                        <Box>
                          <Typography fontWeight="bold">{user.fullName}</Typography>
                          <Typography variant="body2" color="text.secondary">@{user.username}</Typography>
                        </Box>
                        <Chip size="small" label={ROLE_LABELS[user.role]} color={roleColor[user.role]} />
                      </Stack>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        {usesCustomPermissions(user) ? 'Tùy chỉnh' : 'Theo vai trò'} · {effectiveCount} chức năng
                      </Typography>
                    </CardContent>
                  </Card>
                );
              })}
              {filteredUsers.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Không có tài khoản phù hợp (Admin không hiển thị ở đây).
                </Typography>
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, borderRadius: 3 }}>
            {!selectedUser ? (
              <Box sx={{ py: 8, textAlign: 'center' }}>
                <Security sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography color="text.secondary">
                  Chọn một tài khoản bên trái để phân chức năng
                </Typography>
              </Box>
            ) : (
              <>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  justifyContent="space-between"
                  alignItems={{ sm: 'center' }}
                  sx={{ mb: 2 }}
                >
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      {selectedUser.fullName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Vai trò: {ROLE_LABELS[selectedUser.role]} · Đang bật {enabledCount}/{totalCount} chức năng
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Button size="small" variant="outlined" onClick={resetToRoleDefault} startIcon={<RestartAlt />}>
                      Theo vai trò
                    </Button>
                    <Button size="small" variant="contained" onClick={handleSave} disabled={saving} startIcon={<Save />}>
                      Lưu phân quyền
                    </Button>
                  </Stack>
                </Stack>

                <Alert severity="info" sx={{ mb: 2 }}>
                  Áp dụng nhanh theo mẫu vai trò:
                  {['giam_sat', 'ktv'].map((role) => (
                    <Chip
                      key={role}
                      size="small"
                      label={ROLE_LABELS[role]}
                      onClick={() => applyRolePreset(role)}
                      sx={{ ml: 1, cursor: 'pointer' }}
                    />
                  ))}
                </Alert>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={useCustom}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setUseCustom(checked);
                        if (!checked) {
                          setDraftPermissions(getDefaultPermissionsForRole(selectedUser.role));
                        }
                      }}
                    />
                  }
                  label="Dùng phân quyền tùy chỉnh (bỏ chọn = theo vai trò mặc định)"
                />

                <Divider sx={{ my: 2 }} />

                {permissionGroups.map((group) => (
                  <Box key={group.group} sx={{ mb: 2.5 }}>
                    <Typography variant="subtitle1" fontWeight="bold" color="primary" sx={{ mb: 1 }}>
                      {group.group}
                    </Typography>
                    <Grid container spacing={1}>
                      {group.items.map((item) => (
                        <Grid item xs={12} sm={6} key={item.key}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={draftPermissions.includes(item.key)}
                                onChange={() => togglePermission(item.key)}
                                disabled={!useCustom}
                              />
                            }
                            label={(
                              <Box>
                                <Typography variant="body2">{item.label}</Typography>
                                {item.path && (
                                  <Typography variant="caption" color="text.secondary">
                                    {item.path}
                                  </Typography>
                                )}
                              </Box>
                            )}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                ))}
              </>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AccountPermissionsPage;

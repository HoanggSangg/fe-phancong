import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import {
  getWorkerGroups,
  createWorkerGroup,
  updateWorkerGroup,
  deleteWorkerGroup,
  getAllWorkers,
} from '../apis/index';
import PageLayout from '../common/PageLayout';
import PageHeader from '../common/PageHeader';
import { useToast } from '../../context/ToastContext';
import { getWorkerLabel } from '../../utils/workerSearch';

const getDataArray = (res) => {
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data?.data)) return res.data.data;
  return [];
};

const memberWorkerId = (member) => String(member?.worker?._id || member?.worker || '');

const getMembersTotal = (members = []) =>
  members.reduce((sum, member) => sum + (Number(member.percentage) || 0), 0);

const toMembersPayload = (members = []) =>
  members
    .map((member) => ({
      workerId: memberWorkerId(member),
      percentage: Number(member.percentage) || 0,
    }))
    .filter((member) => member.workerId);

const WorkerGroupManagement = () => {
  const toast = useToast();
  const [groups, setGroups] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [selectedPercentage, setSelectedPercentage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [savingMembers, setSavingMembers] = useState(false);
  const workersLoadedRef = useRef(false);

  const fetchGroups = useCallback(async (keepSelectedId) => {
    try {
      const res = await getWorkerGroups();
      const data = getDataArray(res);
      setGroups(data);
      const selectedId = keepSelectedId || selectedGroup?._id;
      if (selectedId) {
        setSelectedGroup(data.find((group) => group._id === selectedId) || null);
      }
      return data;
    } catch {
      toast.error('Lỗi khi lấy danh sách nhóm thợ');
      return [];
    }
  }, [selectedGroup?._id, toast]);

  const fetchWorkers = useCallback(async () => {
    if (workersLoadedRef.current) return;
    try {
      const res = await getAllWorkers();
      setWorkers(getDataArray(res));
      workersLoadedRef.current = true;
    } catch {
      toast.error('Lỗi khi lấy danh sách thợ');
    }
  }, [toast]);

  useEffect(() => {
    fetchGroups();
  }, []);

  const resetForm = () => {
    setGroupName('');
    setEditingGroupId(null);
  };

  const handleSubmitGroup = async (event) => {
    event.preventDefault();
    if (!groupName.trim()) {
      toast.error('Vui lòng nhập tên nhóm');
      return;
    }

    try {
      setLoading(true);
      if (editingGroupId) {
        await updateWorkerGroup(editingGroupId, { name: groupName.trim() });
        toast.success('Cập nhật tên nhóm thành công');
      } else {
        await createWorkerGroup({ name: groupName.trim(), members: [] });
        toast.success('Tạo nhóm thợ thành công');
      }
      resetForm();
      await fetchGroups(editingGroupId);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi lưu nhóm thợ');
    } finally {
      setLoading(false);
    }
  };

  const handleEditGroup = (group) => {
    setEditingGroupId(group._id);
    setGroupName(group.name);
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Bạn có chắc muốn xóa nhóm thợ này không?')) return;

    try {
      await deleteWorkerGroup(groupId);
      if (selectedGroup?._id === groupId) setSelectedGroup(null);
      if (editingGroupId === groupId) resetForm();
      await fetchGroups();
      toast.success('Xóa nhóm thợ thành công');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi xóa nhóm thợ');
    }
  };

  const selectedMemberIds = useMemo(
    () => (selectedGroup?.members || []).map(memberWorkerId),
    [selectedGroup]
  );

  const availableWorkers = useMemo(
    () => workers.filter((worker) => !selectedMemberIds.includes(String(worker._id))),
    [workers, selectedMemberIds]
  );

  const remainingPercentage = Math.max(
    0,
    100 - getMembersTotal(selectedGroup?.members || [])
  );

  const persistMembers = async (nextMembers, successMessage) => {
    if (!selectedGroup) return;
    const total = getMembersTotal(nextMembers);
    if (total > 100) {
      toast.error(`Tổng % thợ không được vượt quá 100 (hiện tại: ${total}%)`);
      return;
    }

    try {
      setSavingMembers(true);
      const res = await updateWorkerGroup(selectedGroup._id, {
        name: selectedGroup.name,
        members: toMembersPayload(nextMembers),
      });
      const updated = res.data?.data || res.data;
      setSelectedGroup(updated);
      await fetchGroups(selectedGroup._id);
      toast.success(successMessage);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi lưu thành viên nhóm');
    } finally {
      setSavingMembers(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedGroup) {
      toast.error('Vui lòng chọn nhóm trước');
      return;
    }
    if (!selectedWorker?._id) {
      toast.error('Vui lòng chọn thợ');
      return;
    }

    const percentage = Math.min(100, Math.max(0, Number(selectedPercentage) || 0));
    const nextMembers = [
      ...(selectedGroup.members || []),
      { worker: selectedWorker, percentage },
    ];
    await persistMembers(nextMembers, 'Đã thêm thợ vào nhóm');
    setSelectedWorker(null);
    setSelectedPercentage(Math.max(0, remainingPercentage - percentage));
  };

  const handlePercentageChange = (workerId, percentage) => {
    if (!selectedGroup) return;
    setSelectedGroup((prev) => ({
      ...prev,
      members: (prev.members || []).map((member) =>
        memberWorkerId(member) === String(workerId)
          ? { ...member, percentage: Math.min(100, Math.max(0, Number(percentage) || 0)) }
          : member
      ),
    }));
  };

  const handleSavePercentages = async () => {
    if (!selectedGroup) return;
    await persistMembers(selectedGroup.members || [], 'Đã lưu % chia trong nhóm');
  };

  const handleRemoveMember = async (workerId) => {
    if (!selectedGroup) return;
    const nextMembers = (selectedGroup.members || []).filter(
      (member) => memberWorkerId(member) !== String(workerId)
    );
    await persistMembers(nextMembers, 'Đã xóa thợ khỏi nhóm');
  };

  const membersTotal = getMembersTotal(selectedGroup?.members || []);

  return (
    <PageLayout
      maxWidth={false}
      sx={{
        bgcolor: 'grey.50',
        minHeight: '100vh',
        width: '100%',
        maxWidth: '100%',
        px: { xs: 1, sm: 2 },
        '& .MuiContainer-root': {
          maxWidth: '100% !important',
          width: '100%',
        },
      }}
    >
      <PageHeader
        icon={<GroupWorkIcon />}
        title="Nhóm thợ làm việc chung"
        subtitle="Tạo nhóm, gắn thợ và % chia doanh thu. Dùng nhóm này khi phân công trong chi tiết sửa chữa."
      />

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Typography variant="h6" gutterBottom>
              {editingGroupId ? 'Sửa tên nhóm' : 'Thêm nhóm mới'}
            </Typography>

            <Box component="form" onSubmit={handleSubmitGroup} sx={{ mb: 3 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Nhập tên nhóm, ví dụ: Nhóm đồng sơn 1"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                sx={{ mb: 1.5 }}
              />
              <Stack direction="row" spacing={1}>
                <Button type="submit" variant="contained" disabled={loading}>
                  {loading ? 'Đang lưu...' : editingGroupId ? 'Cập nhật' : 'Thêm nhóm'}
                </Button>
                {editingGroupId && (
                  <Button type="button" variant="outlined" color="inherit" onClick={resetForm}>
                    Hủy
                  </Button>
                )}
              </Stack>
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Typography variant="h6" gutterBottom>
              Danh sách nhóm
            </Typography>

            {groups.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50' }}>
                <Typography color="text.secondary">Chưa có nhóm thợ nào</Typography>
              </Paper>
            ) : (
              <List disablePadding>
                {groups.map((group) => {
                  const isActive = selectedGroup?._id === group._id;
                  const total = getMembersTotal(group.members);

                  return (
                    <ListItem
                      key={group._id}
                      disablePadding
                      sx={{
                        mb: 1,
                        border: 1,
                        borderColor: isActive ? 'primary.main' : 'divider',
                        borderRadius: 2,
                        bgcolor: isActive ? 'primary.50' : 'grey.50',
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: { xs: 'stretch', sm: 'center' },
                        gap: 1,
                        p: 1,
                      }}
                      secondaryAction={(
                        <Stack direction="row" spacing={0.75} sx={{ alignSelf: { xs: 'flex-end', sm: 'center' } }}>
                          <Button size="small" variant="contained" onClick={() => handleEditGroup(group)}>
                            Sửa
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            color="error"
                            onClick={() => handleDeleteGroup(group._id)}
                          >
                            Xóa
                          </Button>
                        </Stack>
                      )}
                    >
                      <ListItemText
                        primary={group.name}
                        secondary={`${group.members?.length || 0} thợ · tổng ${total}%`}
                        onClick={() => {
                          setSelectedGroup(group);
                          setSelectedWorker(null);
                          setSelectedPercentage(Math.max(0, 100 - getMembersTotal(group.members)));
                          fetchWorkers();
                        }}
                        sx={{ cursor: 'pointer', m: 0, pr: { sm: 14 } }}
                        primaryTypographyProps={{ fontWeight: 600 }}
                      />
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Typography variant="h6" gutterBottom>
              Thành viên & % chia
            </Typography>

            {!selectedGroup ? (
              <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
                <Typography color="text.secondary">
                  Chọn một nhóm bên trái để thêm thợ và % được chia
                </Typography>
              </Paper>
            ) : (
              <>
                <Paper
                  variant="outlined"
                  sx={{ p: 2, mb: 2, bgcolor: 'primary.50', borderColor: 'primary.light' }}
                >
                  <Typography variant="h5">{selectedGroup.name}</Typography>
                  <Typography
                    variant="body2"
                    color={membersTotal > 100 ? 'error' : 'text.secondary'}
                    sx={{ mt: 0.5 }}
                  >
                    {selectedGroup.members?.length || 0} thợ · tổng {membersTotal}%
                    {membersTotal === 100 ? ' (đủ 100%)' : membersTotal < 100 ? ` · còn ${100 - membersTotal}%` : ''}
                  </Typography>
                </Paper>

                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  sx={{ mb: 2 }}
                  alignItems={{ sm: 'flex-start' }}
                >
                  <Autocomplete
                    size="small"
                    sx={{ flex: '1 1 280px', minWidth: 220 }}
                    options={availableWorkers}
                    value={selectedWorker}
                    onOpen={fetchWorkers}
                    onChange={(_, value) => setSelectedWorker(value)}
                    getOptionLabel={(option) => getWorkerLabel(option)}
                    isOptionEqualToValue={(option, value) => option._id === value?._id}
                    renderInput={(params) => (
                      <TextField {...params} label="Chọn thợ" placeholder="Tên, SBD..." />
                    )}
                  />
                  <TextField
                    size="small"
                    type="number"
                    label="%"
                    value={selectedPercentage}
                    onChange={(e) => setSelectedPercentage(e.target.value)}
                    inputProps={{ min: 0, max: 100, step: 1 }}
                    sx={{ width: { xs: '100%', sm: 100 } }}
                  />
                  <Button
                    variant="contained"
                    onClick={handleAddMember}
                    disabled={savingMembers}
                    sx={{ flexShrink: 0, minWidth: { sm: 120 } }}
                  >
                    Thêm thợ
                  </Button>
                </Stack>

                {(selectedGroup.members || []).length === 0 ? (
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50' }}>
                    <Typography color="text.secondary">Nhóm này chưa có thợ</Typography>
                  </Paper>
                ) : (
                  <>
                    <List disablePadding>
                      {(selectedGroup.members || []).map((member) => {
                        const worker = member.worker || {};
                        const workerId = memberWorkerId(member);

                        return (
                          <ListItem
                            key={workerId}
                            disablePadding
                            sx={{
                              mb: 1,
                              border: 1,
                              borderColor: 'divider',
                              borderRadius: 2,
                              bgcolor: 'background.paper',
                              flexDirection: { xs: 'column', sm: 'row' },
                              alignItems: { xs: 'stretch', sm: 'center' },
                              gap: 1,
                              p: 1,
                            }}
                            secondaryAction={(
                              <Stack
                                direction="row"
                                spacing={0.75}
                                sx={{ alignSelf: { xs: 'flex-end', sm: 'center' }, alignItems: 'center' }}
                              >
                                <TextField
                                  size="small"
                                  type="number"
                                  label="%"
                                  value={member.percentage ?? 0}
                                  onChange={(e) => handlePercentageChange(workerId, e.target.value)}
                                  inputProps={{ min: 0, max: 100, step: 1 }}
                                  sx={{ width: 88 }}
                                />
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="error"
                                  disabled={savingMembers}
                                  onClick={() => handleRemoveMember(workerId)}
                                >
                                  Xóa
                                </Button>
                              </Stack>
                            )}
                          >
                            <ListItemAvatar>
                              <Avatar src={worker.avatar || undefined} alt={worker.name}>
                                {worker.name?.charAt(0)?.toUpperCase()}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={(
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <span>{worker.name || 'Thợ đã xóa'}</span>
                                  <Chip size="small" label={`${member.percentage || 0}%`} color="primary" />
                                </Stack>
                              )}
                              secondary={worker.soBaoDanh ? `MNV: ${worker.soBaoDanh}` : ''}
                              sx={{ m: 0, pr: { sm: 22 } }}
                              primaryTypographyProps={{ fontWeight: 600, component: 'div' }}
                            />
                          </ListItem>
                        );
                      })}
                    </List>
                    <Button
                      variant="contained"
                      onClick={handleSavePercentages}
                      disabled={savingMembers || membersTotal > 100}
                      sx={{ mt: 1 }}
                    >
                      {savingMembers ? 'Đang lưu...' : 'Lưu % chia'}
                    </Button>
                  </>
                )}
              </>
            )}
          </Paper>
        </Grid>
      </Grid>
    </PageLayout>
  );
};

export default WorkerGroupManagement;

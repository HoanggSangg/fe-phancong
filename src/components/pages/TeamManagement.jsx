import React, { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import {
  getAllTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  addWorkerToTeam,
  removeWorkerFromTeam,
  getAllWorkers,
} from '../apis/index';
import PageLayout from '../common/PageLayout';
import PageHeader from '../common/PageHeader';
import { WORKER_SELECT_SX } from '../../constants/layout';

const TeamManagement = () => {
  const [teams, setTeams] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);

  const [teamName, setTeamName] = useState('');
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [loading, setLoading] = useState(false);

  const getDataArray = (res) => {
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.data?.data)) return res.data.data;
    return [];
  };

  const fetchTeams = async () => {
    try {
      const res = await getAllTeams();
      const data = getDataArray(res);
      setTeams(data);

      if (selectedTeam) {
        const updatedTeam = data.find((team) => team._id === selectedTeam._id);
        setSelectedTeam(updatedTeam || null);
      }
    } catch (error) {
      console.error(error);
      alert('Lỗi khi lấy danh sách tổ');
    }
  };

  const fetchWorkers = async () => {
    try {
      const res = await getAllWorkers();
      const data = getDataArray(res);
      setWorkers(data);
    } catch (error) {
      console.error(error);
      alert('Lỗi khi lấy danh sách thợ');
    }
  };

  const fetchTeamDetail = async (teamId) => {
    try {
      const res = await getTeamById(teamId);
      const data = res.data?.data || res.data;
      setSelectedTeam(data);
    } catch (error) {
      console.error(error);
      alert('Lỗi khi lấy chi tiết tổ');
    }
  };

  useEffect(() => {
    fetchTeams();
    fetchWorkers();
  }, []);

  const resetForm = () => {
    setTeamName('');
    setEditingTeamId(null);
  };

  const handleSubmitTeam = async (e) => {
    e.preventDefault();

    if (!teamName.trim()) {
      alert('Vui lòng nhập tên tổ');
      return;
    }

    try {
      setLoading(true);

      if (editingTeamId) {
        await updateTeam(editingTeamId, {
          name: teamName,
          status: 'active',
        });
        alert('Cập nhật tổ thành công');
      } else {
        await createTeam({
          name: teamName,
        });
        alert('Tạo tổ thành công');
      }

      resetForm();
      await fetchTeams();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Lỗi khi lưu tổ');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTeam = (team) => {
    setEditingTeamId(team._id);
    setTeamName(team.name);
  };

  const handleDeleteTeam = async (teamId) => {
    const ok = window.confirm(
      'Bạn có chắc muốn xóa tổ này không? Các thợ trong tổ sẽ được đưa về chưa có tổ.'
    );

    if (!ok) return;

    try {
      await deleteTeam(teamId);

      if (selectedTeam?._id === teamId) {
        setSelectedTeam(null);
      }

      await fetchTeams();
      await fetchWorkers();

      alert('Xóa tổ thành công');
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Lỗi khi xóa tổ');
    }
  };

  const handleSelectTeam = async (teamId) => {
    await fetchTeamDetail(teamId);
    setSelectedWorkerId('');
  };

  const selectedTeamWorkerIds = useMemo(() => {
    if (!selectedTeam?.workers) return [];
    return selectedTeam.workers.map((worker) => worker._id);
  }, [selectedTeam]);

  const availableWorkersToAdd = useMemo(() => {
    return workers.filter((worker) => {
      return !selectedTeamWorkerIds.includes(worker._id);
    });
  }, [workers, selectedTeamWorkerIds]);

  const handleAddWorkerToTeam = async () => {
    if (!selectedTeam) {
      alert('Vui lòng chọn tổ trước');
      return;
    }

    if (!selectedWorkerId) {
      alert('Vui lòng chọn thợ');
      return;
    }

    try {
      await addWorkerToTeam(selectedTeam._id, selectedWorkerId);

      await fetchTeams();
      await fetchWorkers();
      await fetchTeamDetail(selectedTeam._id);

      setSelectedWorkerId('');
      alert('Thêm thợ vào tổ thành công');
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Lỗi khi thêm thợ vào tổ');
    }
  };

  const handleRemoveWorkerFromTeam = async (workerId) => {
    if (!selectedTeam) return;

    const ok = window.confirm('Bạn có chắc muốn xóa thợ này khỏi tổ không?');

    if (!ok) return;

    try {
      await removeWorkerFromTeam(selectedTeam._id, workerId);

      await fetchTeams();
      await fetchWorkers();
      await fetchTeamDetail(selectedTeam._id);

      alert('Xóa thợ khỏi tổ thành công');
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Lỗi khi xóa thợ khỏi tổ');
    }
  };

  return (
    <PageLayout maxWidth="wide" sx={{ bgcolor: 'grey.50', minHeight: '100vh' }}>
      <PageHeader
        icon={<GroupsIcon />}
        title="Quản lý tổ thợ"
        subtitle="Tạo tổ, sửa tổ, thêm thợ vào tổ và xóa thợ khỏi tổ."
      />

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Typography variant="h6" gutterBottom>
              {editingTeamId ? 'Sửa tổ' : 'Thêm tổ mới'}
            </Typography>

            <Box component="form" onSubmit={handleSubmitTeam} sx={{ mb: 3 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Nhập tên tổ, ví dụ: Tổ 1"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                sx={{ mb: 1.5 }}
              />

              <Stack direction="row" spacing={1}>
                <Button type="submit" variant="contained" disabled={loading}>
                  {loading ? 'Đang lưu...' : editingTeamId ? 'Cập nhật' : 'Thêm tổ'}
                </Button>

                {editingTeamId && (
                  <Button type="button" variant="outlined" color="inherit" onClick={resetForm}>
                    Hủy
                  </Button>
                )}
              </Stack>
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Typography variant="h6" gutterBottom>
              Danh sách tổ
            </Typography>

            {teams.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50' }}>
                <Typography color="text.secondary">Chưa có tổ nào</Typography>
              </Paper>
            ) : (
              <List disablePadding>
                {teams.map((team) => {
                  const isActive = selectedTeam?._id === team._id;

                  return (
                    <ListItem
                      key={team._id}
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
                      secondaryAction={
                        <Stack direction="row" spacing={0.75} sx={{ alignSelf: { xs: 'flex-end', sm: 'center' } }}>
                          <Button size="small" variant="contained" onClick={() => handleEditTeam(team)}>
                            Sửa
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            color="error"
                            onClick={() => handleDeleteTeam(team._id)}
                          >
                            Xóa
                          </Button>
                        </Stack>
                      }
                    >
                      <ListItemText
                        primary={team.name}
                        secondary={`${team.workers?.length || 0} thợ`}
                        onClick={() => handleSelectTeam(team._id)}
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
              Chi tiết tổ
            </Typography>

            {!selectedTeam ? (
              <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
                <Typography color="text.secondary">
                  Chọn một tổ bên trái để xem danh sách thợ
                </Typography>
              </Paper>
            ) : (
              <>
                <Paper
                  variant="outlined"
                  sx={{ p: 2, mb: 2, bgcolor: 'primary.50', borderColor: 'primary.light' }}
                >
                  <Typography variant="h5">{selectedTeam.name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Số thợ trong tổ: {selectedTeam.workers?.length || 0}
                  </Typography>
                </Paper>

                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  sx={{ mb: 2 }}
                >
                  <FormControl size="small" sx={{ ...WORKER_SELECT_SX, flex: '1 1 280px' }}>
                    <InputLabel id="add-worker-select-label">Chọn thợ</InputLabel>
                    <Select
                      labelId="add-worker-select-label"
                      label="Chọn thợ"
                      value={selectedWorkerId}
                      onChange={(e) => setSelectedWorkerId(e.target.value)}
                      sx={{ minWidth: 280 }}
                    >
                      <MenuItem value="">
                        <em>-- Chọn thợ để thêm vào tổ --</em>
                      </MenuItem>
                      {availableWorkersToAdd.map((worker) => (
                        <MenuItem key={worker._id} value={worker._id}>
                          {worker.name} - SBD: {worker.soBaoDanh}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Button
                    variant="contained"
                    onClick={handleAddWorkerToTeam}
                    sx={{ flexShrink: 0, minWidth: { sm: 120 } }}
                  >
                    Thêm thợ
                  </Button>
                </Stack>

                {selectedTeam.workers?.length === 0 ? (
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50' }}>
                    <Typography color="text.secondary">Tổ này chưa có thợ</Typography>
                  </Paper>
                ) : (
                  <List disablePadding>
                    {selectedTeam.workers?.map((worker) => (
                      <ListItem
                        key={worker._id}
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
                        secondaryAction={
                          <Button
                            size="small"
                            variant="contained"
                            color="error"
                            onClick={() => handleRemoveWorkerFromTeam(worker._id)}
                            sx={{ alignSelf: { xs: 'flex-end', sm: 'center' } }}
                          >
                            Xóa khỏi tổ
                          </Button>
                        }
                      >
                        <ListItemAvatar>
                          <Avatar src={worker.avatar || undefined} alt={worker.name}>
                            {worker.name?.charAt(0)?.toUpperCase()}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={worker.name}
                          secondary={
                            <>
                              MNV: {worker.soBaoDanh}
                              <br />
                              Trạng thái: {worker.status}
                            </>
                          }
                          sx={{ m: 0, pr: { sm: 14 } }}
                          primaryTypographyProps={{ fontWeight: 600 }}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </>
            )}
          </Paper>
        </Grid>
      </Grid>
    </PageLayout>
  );
};

export default TeamManagement;

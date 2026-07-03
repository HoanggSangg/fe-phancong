import React, { useEffect, useMemo, useState } from 'react';
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
    <>
      <style>{`
        .team-page {
          padding: 24px;
          background: #f5f6fa;
          min-height: 100vh;
          font-family: Arial, sans-serif;
        }

        .team-header {
          margin-bottom: 20px;
        }

        .team-header h2 {
          margin: 0;
          font-size: 28px;
          color: #222;
        }

        .team-header p {
          margin-top: 6px;
          color: #666;
        }

        .team-layout {
          display: grid;
          grid-template-columns: 420px 1fr;
          gap: 20px;
        }

        .team-card {
          background: #fff;
          border-radius: 14px;
          padding: 20px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
        }

        .team-card h3 {
          margin-top: 0;
          margin-bottom: 14px;
        }

        .team-form {
          margin-bottom: 28px;
        }

        .team-input,
        .team-select {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid #ddd;
          border-radius: 10px;
          font-size: 15px;
          outline: none;
          box-sizing: border-box;
        }

        .team-input:focus,
        .team-select:focus {
          border-color: #1677ff;
        }

        .team-form-actions {
          display: flex;
          gap: 10px;
          margin-top: 12px;
        }

        .team-btn {
          border: none;
          background: #1677ff;
          color: white;
          padding: 10px 14px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 14px;
          white-space: nowrap;
        }

        .team-btn:hover {
          opacity: 0.9;
        }

        .team-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-cancel {
          background: #777;
        }

        .btn-danger {
          background: #e53935;
        }

        .team-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .team-item {
          border: 1px solid #eee;
          border-radius: 12px;
          padding: 12px;
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
          background: #fafafa;
        }

        .team-item.active {
          border-color: #1677ff;
          background: #eef5ff;
        }

        .team-info {
          flex: 1;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .team-info strong {
          color: #222;
        }

        .team-info span {
          color: #666;
          font-size: 14px;
        }

        .team-actions {
          display: flex;
          gap: 8px;
        }

        .selected-team-box {
          background: #f0f7ff;
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 16px;
        }

        .selected-team-box h2 {
          margin: 0;
          color: #111;
        }

        .selected-team-box p {
          margin: 6px 0 0;
          color: #555;
        }

        .add-worker-box {
          display: grid;
          grid-template-columns: 1fr 120px;
          gap: 10px;
          margin-bottom: 18px;
        }

        .worker-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .worker-item {
          border: 1px solid #eee;
          border-radius: 12px;
          padding: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #fff;
          gap: 12px;
        }

        .worker-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .worker-left img,
        .avatar-placeholder {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .worker-left img {
          object-fit: cover;
        }

        .avatar-placeholder {
          background: #1677ff;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
        }

        .worker-detail {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .worker-detail strong {
          color: #222;
        }

        .worker-detail span {
          color: #666;
          font-size: 14px;
        }

        .empty-text,
        .empty-box {
          color: #777;
          padding: 16px;
          background: #fafafa;
          border-radius: 12px;
          text-align: center;
        }

        @media (max-width: 900px) {
          .team-layout {
            grid-template-columns: 1fr;
          }

          .add-worker-box {
            grid-template-columns: 1fr;
          }

          .team-item,
          .worker-item {
            flex-direction: column;
            align-items: stretch;
          }

          .team-actions {
            justify-content: flex-end;
          }
        }
      `}</style>

      <div className="team-page">
        <div className="team-header">
          <h2>Quản lý tổ thợ</h2>
          <p>Tạo tổ, sửa tổ, thêm thợ vào tổ và xóa thợ khỏi tổ.</p>
        </div>

        <div className="team-layout">
          <div className="team-card">
            <h3>{editingTeamId ? 'Sửa tổ' : 'Thêm tổ mới'}</h3>

            <form onSubmit={handleSubmitTeam} className="team-form">
              <input
                className="team-input"
                type="text"
                placeholder="Nhập tên tổ, ví dụ: Tổ 1"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />

              <div className="team-form-actions">
                <button className="team-btn" type="submit" disabled={loading}>
                  {loading ? 'Đang lưu...' : editingTeamId ? 'Cập nhật' : 'Thêm tổ'}
                </button>

                {editingTeamId && (
                  <button
                    className="team-btn btn-cancel"
                    type="button"
                    onClick={resetForm}
                  >
                    Hủy
                  </button>
                )}
              </div>
            </form>

            <h3>Danh sách tổ</h3>

            <div className="team-list">
              {teams.length === 0 ? (
                <div className="empty-text">Chưa có tổ nào</div>
              ) : (
                teams.map((team) => (
                  <div
                    key={team._id}
                    className={`team-item ${
                      selectedTeam?._id === team._id ? 'active' : ''
                    }`}
                  >
                    <div
                      className="team-info"
                      onClick={() => handleSelectTeam(team._id)}
                    >
                      <strong>{team.name}</strong>
                      <span>{team.workers?.length || 0} thợ</span>
                    </div>

                    <div className="team-actions">
                      <button
                        className="team-btn"
                        onClick={() => handleEditTeam(team)}
                      >
                        Sửa
                      </button>

                      <button
                        className="team-btn btn-danger"
                        onClick={() => handleDeleteTeam(team._id)}
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="team-card">
            <h3>Chi tiết tổ</h3>

            {!selectedTeam ? (
              <div className="empty-box">
                Chọn một tổ bên trái để xem danh sách thợ
              </div>
            ) : (
              <>
                <div className="selected-team-box">
                  <h2>{selectedTeam.name}</h2>
                  <p>Số thợ trong tổ: {selectedTeam.workers?.length || 0}</p>
                </div>

                <div className="add-worker-box">
                  <select
                    className="team-select"
                    value={selectedWorkerId}
                    onChange={(e) => setSelectedWorkerId(e.target.value)}
                  >
                    <option value="">-- Chọn thợ để thêm vào tổ --</option>

                    {availableWorkersToAdd.map((worker) => (
                      <option key={worker._id} value={worker._id}>
                        {worker.name} - SBD: {worker.soBaoDanh}
                      </option>
                    ))}
                  </select>

                  <button className="team-btn" onClick={handleAddWorkerToTeam}>
                    Thêm thợ
                  </button>
                </div>

                <div className="worker-list">
                  {selectedTeam.workers?.length === 0 ? (
                    <div className="empty-text">Tổ này chưa có thợ</div>
                  ) : (
                    selectedTeam.workers?.map((worker) => (
                      <div key={worker._id} className="worker-item">
                        <div className="worker-left">
                          {worker.avatar ? (
                            <img src={worker.avatar} alt={worker.name} />
                          ) : (
                            <div className="avatar-placeholder">
                              {worker.name?.charAt(0)?.toUpperCase()}
                            </div>
                          )}

                          <div className="worker-detail">
                            <strong>{worker.name}</strong>
                            <span>MNV: {worker.soBaoDanh}</span>
                            <span>Trạng thái: {worker.status}</span>
                          </div>
                        </div>

                        <button
                          className="team-btn btn-danger"
                          onClick={() => handleRemoveWorkerFromTeam(worker._id)}
                        >
                          Xóa khỏi tổ
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default TeamManagement;
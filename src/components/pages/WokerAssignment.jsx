import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Box, Button, Typography } from "@mui/material";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import {
  getAllWorkers,
  getAllCars,
  addManualJobToWorker,
  removeManualJobFromWorker,
} from "../apis/index";
import { useAuth } from "../../context/AuthContext";
import { ACTIVE_CAR_STATUSES, CAR_STATUS_LABELS, isAdmin } from "../../utils/permissions";
import { filterWorkersByKeyword } from "../../utils/workerSearch";
import useIsMobile from "../../hooks/useIsMobile";
import FullscreenDialog from "../common/FullscreenDialog";

const WokerAssignment = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [workers, setWorkers] = useState([]);
  const [cars, setCars] = useState([]);
  const [date, setDate] = useState("");
  const [workerSearch, setWorkerSearch] = useState("");
  const [jobInputs, setJobInputs] = useState({});
  const [pageFullscreen, setPageFullscreen] = useState(false);
  const isMobile = useIsMobile();

  const loadData = useCallback(async () => {
    try {
      const res = await getAllWorkers();
      const workerList = res?.data?.workers || res?.data || [];

      const carsRes = await getAllCars();
      setWorkers(workerList);
      setCars(carsRes?.data ?? []);
    } catch (err) {
      console.log(err);
      setWorkers([]);
      setCars([]);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, location.pathname]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") loadData();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadData]);

  const formatDate = (value) => {
    if (!value) return "";
    return new Date(value).toISOString().slice(0, 10);
  };

  const selectedDate = date || formatDate(new Date());

  const getWorkerId = (workerRef) => String(workerRef?._id || workerRef || "");

  const getWorkerCurrentCars = (workerId) => {
    const wid = String(workerId);

    return cars.filter((car) => {
      if (!ACTIVE_CAR_STATUSES.includes(car.status)) return false;

      return car.workers?.some((w) => getWorkerId(w.worker) === wid);
    });
  };

  const getWorkerRoleOnCar = (car, workerId) => {
    const assignment = car.workers?.find((w) => getWorkerId(w.worker) === String(workerId));
    if (!assignment) return "";
    return assignment.role === "main" ? "Thợ chính" : "Thợ phụ";
  };

  const getManualJobsByDate = (worker) => {
    return (worker.manualJobs || []).filter(
      (job) => formatDate(job.date) === selectedDate
    );
  };

  const buildWorkerRows = (sourceWorkers) =>
    sourceWorkers.map((worker) => {
      const currentCars = getWorkerCurrentCars(worker._id);
      const manualJobs = getManualJobsByDate(worker);

      const isBusy =
        currentCars.length > 0 ||
        manualJobs.some((job) => job.status === "co_viec");

      return { worker, currentCars, manualJobs, isBusy };
    });

  const filteredWorkers = useMemo(
    () => filterWorkersByKeyword(workers, workerSearch),
    [workers, workerSearch]
  );

  const workerRows = useMemo(
    () => buildWorkerRows(filteredWorkers),
    [filteredWorkers, cars, selectedDate]
  );

  const allWorkerRows = useMemo(
    () => buildWorkerRows(workers),
    [workers, cars, selectedDate]
  );

  const handleAddJob = async (worker) => {
    const detail = jobInputs[worker._id]?.trim();

    if (!detail) {
      alert("Vui lòng nhập chi tiết công việc");
      return;
    }

    try {
      await addManualJobToWorker(worker._id, {
        content: detail,
        date: selectedDate,
      });

      setJobInputs((prev) => ({ ...prev, [worker._id]: "" }));
      await loadData();
      alert("Đã giao việc cho thợ");
    } catch (err) {
      console.log(err);
      alert(err.response?.data?.message || "Lỗi khi giao việc");
    }
  };

  const handleDeleteJob = async (workerId, jobId) => {
    if (!window.confirm("Bạn có chắc muốn xóa công việc này không?")) return;

    try {
      await removeManualJobFromWorker(workerId, jobId);
      await loadData();
      alert("Đã xóa công việc");
    } catch (err) {
      console.log(err);
      alert(err.response?.data?.message || "Lỗi khi xóa công việc");
    }
  };

  const getStatusText = (row) => {
    if (row.currentCars.length > 0) return "Đang có xe / việc";
    if (row.manualJobs.length > 0) return "Có việc ghi tay";
    return "Chưa có việc";
  };

  const getStatusStyle = (isBusy) => ({
    ...styles.status,
    background: isBusy ? "#fee2e2" : "#dcfce7",
    color: isBusy ? "#991b1b" : "#15803d",
  });

  const renderCars = (worker, currentCars) => {
    if (currentCars.length === 0) {
      return (
        <span style={{ color: "#16a34a", fontWeight: "bold" }}>
          Chưa sửa xe nào
        </span>
      );
    }

    return currentCars.map((car) => (
      <div key={car._id} style={styles.carBox}>
        🚗 <b>{car.plateNumber}</b>
        <br />
        <small>Vai trò: {getWorkerRoleOnCar(car, worker._id)}</small>
        <br />
        <small>Trạng thái: {CAR_STATUS_LABELS[car.status] || car.status}</small>
        <br />
        <small>Hiệu xe: {car.externalCarTypeName || "—"}</small>
      </div>
    ));
  };

  const renderJobs = (worker, manualJobs) => {
    if (manualJobs.length === 0) {
      return <span style={{ color: "#64748b" }}>Chưa có công việc ghi tay</span>;
    }

    return manualJobs.map((job) => (
      <div key={job._id} style={styles.jobBox}>
        📝 {job.content}
        <br />
        <small>Ngày: {formatDate(job.date)}</small>
        <br />
        <button
          style={{ ...styles.btn, background: "#ef4444", color: "#fff", marginTop: 6 }}
          onClick={() => handleDeleteJob(worker._id, job._id)}
        >
          Xóa việc
        </button>
      </div>
    ));
  };

  const renderAddJob = (worker) => {
    if (!isAdmin(user?.role) && user?.role !== "giam_sat") {
      return <span style={{ color: "#64748b" }}>Chỉ giám sát/admin giao việc ghi tay</span>;
    }

    return (
      <>
        <input
          style={styles.inputSmall}
          placeholder="Nhập chi tiết công việc"
          value={jobInputs[worker._id] || ""}
          onChange={(e) =>
            setJobInputs((prev) => ({
              ...prev,
              [worker._id]: e.target.value,
            }))
          }
        />

        <button
          style={{ ...styles.btnPrimary, marginTop: 8, width: "100%" }}
          onClick={() => handleAddJob(worker)}
        >
          ➕ Giao việc
        </button>
      </>
    );
  };

  const renderToolbar = () => (
    <div style={styles.card}>
      <div style={styles.formRow}>
        <input
          type="text"
          style={styles.input}
          placeholder="Tìm thợ theo tên, SBD..."
          value={workerSearch}
          onChange={(e) => setWorkerSearch(e.target.value)}
        />

        <input
          type="date"
          style={styles.input}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <button style={styles.btnPrimary} onClick={loadData}>
          🔍 Tải lại
        </button>

        <button
          style={styles.btn}
          onClick={() => {
            setDate("");
            setTimeout(loadData, 0);
          }}
        >
          Reset hôm nay
        </button>
      </div>

      <div style={styles.dateText}>
        Việc ghi tay theo ngày: <b>{selectedDate}</b>
        <br />
        <small>Xe đang làm = xe được gán thợ (chưa giao)</small>
      </div>
    </div>
  );

  const renderWorkerList = (hideSearch = false) => {
    const rows = hideSearch ? allWorkerRows : workerRows;

    return isMobile ? (
      <div style={styles.mobileList}>
        {rows.length === 0 ? (
          <div style={styles.empty}>Không có dữ liệu thợ</div>
        ) : (
          rows.map((row) => {
            const { worker, currentCars, manualJobs, isBusy } = row;

            return (
              <div key={worker._id} style={styles.mobileCard}>
                <div style={styles.mobileHeader}>
                  <div>
                    <div style={styles.workerName}>{worker.name}</div>
                    <div style={styles.workerCode}>MNV: {worker.soBaoDanh || "—"}</div>
                  </div>

                  <span style={getStatusStyle(isBusy)}>
                    {getStatusText(row)}
                  </span>
                </div>

                <div style={styles.mobileSection}>
                  <div style={styles.label}>Xe đang làm</div>
                  {renderCars(worker, currentCars)}
                </div>

                <div style={styles.mobileSection}>
                  <div style={styles.label}>Công việc ghi tay</div>
                  {renderJobs(worker, manualJobs)}
                </div>

                <div style={styles.mobileSection}>
                  <div style={styles.label}>Thêm việc</div>
                  {renderAddJob(worker)}
                </div>
              </div>
            );
          })
        )}
      </div>
    ) : (
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.theadRow}>
              <th style={styles.th}>Thợ</th>
              <th style={styles.th}>MNV</th>
              <th style={styles.th}>Trạng thái</th>
              <th style={styles.th}>Xe đang làm</th>
              <th style={styles.th}>Công việc ghi tay</th>
              <th style={styles.th}>Thêm việc</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan="6" style={styles.empty}>
                  Không có dữ liệu thợ
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const { worker, currentCars, manualJobs, isBusy } = row;

                return (
                  <tr key={worker._id}>
                    <td style={styles.td}>
                      <b>{worker.name}</b>
                    </td>

                    <td style={styles.td}>{worker.soBaoDanh || "—"}</td>

                    <td style={styles.td}>
                      <span style={getStatusStyle(isBusy)}>
                        {getStatusText(row)}
                      </span>
                    </td>

                    <td style={styles.td}>{renderCars(worker, currentCars)}</td>

                    <td style={styles.td}>{renderJobs(worker, manualJobs)}</td>

                    <td style={styles.td}>{renderAddJob(worker)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.titleRow}>
        <h2 style={styles.title}>📋 Phân công công việc theo thợ</h2>
        <Button
          variant="outlined"
          size="small"
          startIcon={<FullscreenIcon />}
          onClick={() => setPageFullscreen(true)}
          sx={{ flexShrink: 0, bgcolor: '#fff' }}
        >
          {isMobile ? 'Full' : 'Xem full màn hình'}
        </Button>
      </div>

      {renderToolbar()}
      {renderWorkerList()}

      <FullscreenDialog
        open={pageFullscreen}
        onClose={() => setPageFullscreen(false)}
        title={`Phân công công việc — ${selectedDate}`}
        bgcolor="#f4f6f8"
      >
        {renderWorkerList(true)}
      </FullscreenDialog>
    </div>
  );
};

export default WokerAssignment;

const styles = {
  container: {
    padding: "16px",
    background: "#f4f6f8",
    minHeight: "100vh",
    fontFamily: "Arial",
    boxSizing: "border-box",
  },

  title: {
    marginBottom: 0,
    fontSize: "clamp(20px, 5vw, 28px)",
  },

  titleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 15,
    flexWrap: "wrap",
  },

  card: {
    background: "#fff",
    padding: 15,
    borderRadius: 14,
    marginBottom: 15,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },

  formRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },

  input: {
    flex: 1,
    minWidth: 160,
    padding: 12,
    borderRadius: 8,
    border: "1px solid #ddd",
    fontSize: 15,
    boxSizing: "border-box",
  },

  inputSmall: {
    width: "100%",
    padding: 11,
    borderRadius: 8,
    border: "1px solid #ddd",
    boxSizing: "border-box",
    fontSize: 15,
  },

  btn: {
    padding: "11px 15px",
    border: "none",
    borderRadius: 8,
    background: "#ddd",
    cursor: "pointer",
    fontSize: 14,
  },

  btnPrimary: {
    padding: "11px 15px",
    border: "none",
    borderRadius: 8,
    background: "#1976d2",
    color: "#fff",
    cursor: "pointer",
    fontSize: 14,
  },

  dateText: {
    marginTop: 10,
    color: "#64748b",
    fontSize: 14,
  },

  tableWrapper: {
    overflowX: "auto",
    background: "#fff",
    borderRadius: 12,
    padding: 10,
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 1000,
  },

  theadRow: {
    background: "#f1f5f9",
  },

  th: {
    textAlign: "left",
    padding: "12px",
    borderBottom: "1px solid #ddd",
    fontWeight: "bold",
  },

  td: {
    padding: "12px",
    borderBottom: "1px solid #eee",
    verticalAlign: "top",
  },

  empty: {
    textAlign: "center",
    padding: 20,
    color: "#64748b",
  },

  status: {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "bold",
    display: "inline-block",
    whiteSpace: "nowrap",
  },

  carBox: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: 10,
    padding: 9,
    marginBottom: 6,
    color: "#1e3a8a",
  },

  jobBox: {
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    borderRadius: 10,
    padding: 9,
    marginBottom: 6,
    color: "#9a3412",
  },

  mobileList: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },

  mobileCard: {
    background: "#fff",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 4px 18px rgba(15,23,42,0.08)",
  },

  mobileHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },

  workerName: {
    fontSize: 18,
    fontWeight: 800,
    color: "#0f172a",
  },

  workerCode: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 3,
  },

  mobileSection: {
    borderTop: "1px solid #e5e7eb",
    paddingTop: 10,
    marginTop: 10,
  },

  label: {
    fontSize: 13,
    fontWeight: 800,
    color: "#334155",
    marginBottom: 6,
    textTransform: "uppercase",
  },
};

import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import SearchIcon from "@mui/icons-material/Search";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { getCarROLabel, normalizeROKey } from "../../utils/carListHelpers";
import {
  getAllWorkers,
  getAllCars,
  addManualJobToWorker,
  removeManualJobFromWorker,
} from "../apis/index";
import { queryKeys } from "../../lib/queryKeys";
import { useAuth } from "../../context/AuthContext";
import { ACTIVE_CAR_STATUSES, BUSY_CAR_STATUSES, CAR_STATUS_LABELS, hasPermission, isKtv } from "../../utils/permissions";
import { filterWorkersByKeyword } from "../../utils/workerSearch";
import useIsMobile from "../../hooks/useIsMobile";
import FullscreenDialog from "../common/FullscreenDialog";
import PageLayout from "../common/PageLayout";
import PageHeader from "../common/PageHeader";
import FilterPanel from "../common/FilterPanel";

const WokerAssignment = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [date, setDate] = useState("");
  const [workerSearch, setWorkerSearch] = useState("");
  const [jobInputs, setJobInputs] = useState({});
  const [pageFullscreen, setPageFullscreen] = useState(false);
  const isMobile = useIsMobile();

  const isKtvUser = isKtv(user);
  const canManageJobs = hasPermission(user, 'workers.woker') && !isKtvUser;
  const canViewCars = hasPermission(user, 'cars.manage');

  const workersQuery = useQuery({
    queryKey: queryKeys.workers.all,
    queryFn: async () => {
      const res = await getAllWorkers();
      return res?.data?.workers || res?.data || [];
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const carsQuery = useQuery({
    queryKey: isKtvUser ? queryKeys.carsMine : queryKeys.cars,
    queryFn: async () => (await getAllCars(isKtvUser ? { mine: '1' } : undefined)).data,
    staleTime: 45_000,
  });

  const workers = workersQuery.data || [];
  const cars = carsQuery.data || [];

  const reloadWorkers = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.workers.all });
  };

  const reloadAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.workers.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.workers.available }),
      queryClient.invalidateQueries({ queryKey: queryKeys.cars }),
    ]);
  };

  useEffect(() => {
    reloadAll();
  }, [location.pathname]);

  const formatDate = (value) => {
    if (!value) return "";
    return new Date(value).toISOString().slice(0, 10);
  };

  const selectedDate = date || formatDate(new Date());

  const getWorkerId = (workerRef) => String(workerRef?._id || workerRef || "");

  const getWorkerAssignedCars = (workerId) => {
    const wid = String(workerId);

    return cars.filter((car) => {
      if (!ACTIVE_CAR_STATUSES.includes(car.status)) return false;

      return car.workers?.some((w) => getWorkerId(w.worker) === wid);
    });
  };

  const getWorkerBusyCars = (workerId) => {
    const wid = String(workerId);

    return cars.filter((car) => {
      if (!BUSY_CAR_STATUSES.includes(car.status)) return false;

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
      const assignedCars = getWorkerAssignedCars(worker._id);
      const busyCars = getWorkerBusyCars(worker._id);
      const manualJobs = getManualJobsByDate(worker);

      const isBusy = worker.status === 'busy';

      return {
        worker,
        assignedCars,
        busyCars,
        manualJobs,
        isBusy,
        pendingCarsCount:
          typeof worker.pendingCarsCount === "number"
            ? worker.pendingCarsCount
            : assignedCars.filter((car) => car.status === "pending").length,
      };
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
      await reloadWorkers();
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
      await reloadWorkers();
      alert("Đã xóa công việc");
    } catch (err) {
      console.log(err);
      alert(err.response?.data?.message || "Lỗi khi xóa công việc");
    }
  };

  const getStatusText = (row) => {
    if (row.isBusy) {
      if (row.busyCars.length > 0) return "Đang bận";
      if (row.manualJobs.some((job) => job.status === "co_viec")) return "Có việc ghi tay";
      return "Đang bận";
    }

    const pendingCount = row.pendingCarsCount || 0;
    if (pendingCount > 0) {
      return pendingCount === 1 ? "1 xe chờ sửa" : `${pendingCount} xe chờ sửa`;
    }

    if (row.assignedCars.length > 0) return "Có xe được gán";
    return "Rảnh";
  };

  const renderStatusChip = (row) => (
    <Chip
      label={getStatusText(row)}
      size="small"
      color={row.isBusy ? "error" : "success"}
      sx={{ fontWeight: 700 }}
    />
  );

  const getDeliveryStatus = (car) =>
    car.status === "delivered"
      ? { label: "Đã giao", color: "success" }
      : { label: "Chưa giao", color: "warning" };

  const handleViewCar = (car) => {
    const plateNumber = car.plateNumber || "";
    const roCode = car.roCode || "";
    const roNumber = car.roNumber || "";
    const roKey = car.roKey || normalizeROKey(roNumber, roCode);

    sessionStorage.setItem(
      "ktvTargetCar",
      JSON.stringify({
        carId: car._id || "",
        plateNumber,
        roCode,
        roNumber,
        roKey,
      })
    );

    const params = new URLSearchParams();
    params.set("openCar", "1");
    if (car._id) params.set("carId", car._id);
    if (plateNumber) params.set("plateNumber", plateNumber);
    if (roCode) params.set("roCode", roCode);
    if (roNumber) params.set("roNumber", roNumber);
    if (roKey) params.set("roKey", roKey);

    navigate(`/cars/manage?${params.toString()}`);
  };

  const renderCars = (worker, currentCars) => {
    if (currentCars.length === 0) {
      return (
        <Typography variant="body2" color="success.main" fontWeight="bold">
          Chưa sửa xe nào
        </Typography>
      );
    }

    return (
      <Stack spacing={0.75}>
        {currentCars.map((car) => {
          const deliveryStatus = getDeliveryStatus(car);
          const roLabel = getCarROLabel(car);

          return (
            <Paper
              key={car._id}
              variant="outlined"
              sx={{
                p: 1,
                bgcolor: "info.50",
                borderColor: "info.light",
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={0.5}
              >
                <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap">
                  <DirectionsCarIcon sx={{ fontSize: 16, color: "info.dark" }} />
                  <Typography variant="body2" fontWeight="bold" color="info.dark">
                    {car.plateNumber}
                  </Typography>
                  {roLabel && (
                    <Chip label={roLabel} size="small" color="info" variant="outlined" />
                  )}
                </Stack>
                {isMobile && (
                  <Chip
                    label={deliveryStatus.label}
                    size="small"
                    color={deliveryStatus.color}
                    sx={{ fontWeight: 700 }}
                  />
                )}
              </Stack>
              <Typography variant="caption" display="block" color="info.dark">
                Vai trò: {getWorkerRoleOnCar(car, worker._id)}
              </Typography>
              <Typography variant="caption" display="block" color="info.dark">
                Trạng thái: {CAR_STATUS_LABELS[car.status] || car.status}
              </Typography>
              <Typography variant="caption" display="block" color="info.dark">
                Hiệu xe: {car.externalCarTypeName || "—"}
              </Typography>
              {canViewCars && (
                <Button
                  size="small"
                  variant="outlined"
                  color="info"
                  startIcon={<OpenInNewIcon />}
                  onClick={() => handleViewCar(car)}
                  sx={{ mt: 0.75, textTransform: "none" }}
                >
                  Xem xe
                </Button>
              )}
            </Paper>
          );
        })}
      </Stack>
    );
  };

  const renderJobs = (worker, manualJobs) => {
    if (manualJobs.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary">
          Chưa có công việc ghi tay
        </Typography>
      );
    }

    return (
      <Stack spacing={0.75}>
        {manualJobs.map((job) => (
          <Paper
            key={job._id}
            variant="outlined"
            sx={{
              p: 1,
              bgcolor: "warning.50",
              borderColor: "warning.light",
            }}
          >
            <Typography variant="body2" color="warning.dark">
              {job.content}
            </Typography>
            <Typography variant="caption" display="block" color="warning.dark">
              Ngày: {formatDate(job.date)}
            </Typography>
            {canManageJobs && (
              <Button
                size="small"
                color="error"
                variant="contained"
                startIcon={<DeleteIcon />}
                onClick={() => handleDeleteJob(worker._id, job._id)}
                sx={{ mt: 0.75 }}
              >
                Xóa việc
              </Button>
            )}
          </Paper>
        ))}
      </Stack>
    );
  };

  const renderAddJob = (worker) => {
    if (!canManageJobs) {
      return (
        <Typography variant="body2" color="text.secondary">
          Chỉ xem công việc được giao
        </Typography>
      );
    }

    return (
      <Stack spacing={1}>
        <TextField
          size="small"
          fullWidth
          placeholder="Nhập chi tiết công việc"
          value={jobInputs[worker._id] || ""}
          onChange={(e) =>
            setJobInputs((prev) => ({
              ...prev,
              [worker._id]: e.target.value,
            }))
          }
        />
        <Button
          variant="contained"
          fullWidth
          startIcon={<AddIcon />}
          onClick={() => handleAddJob(worker)}
        >
          Giao việc
        </Button>
      </Stack>
    );
  };

  const renderToolbar = () => (
    <FilterPanel>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        useFlexGap
        flexWrap="wrap"
        alignItems={{ sm: "center" }}
      >
        {!isKtvUser && (
          <TextField
            size="small"
            placeholder="Tìm thợ theo tên, SBD..."
            value={workerSearch}
            onChange={(e) => setWorkerSearch(e.target.value)}
            sx={{ flex: 1, minWidth: { xs: "100%", sm: 200 } }}
          />
        )}
        <TextField
          size="small"
          type="date"
          label="Ngày"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: { xs: "100%", sm: 160 } }}
        />
        <Button
          variant="contained"
          startIcon={<SearchIcon />}
          onClick={reloadAll}
        >
          Tải lại
        </Button>
        <Button
          variant="outlined"
          startIcon={<RestartAltIcon />}
          onClick={() => {
            setDate("");
            reloadAll();
          }}
        >
          Reset hôm nay
        </Button>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
        Việc ghi tay theo ngày: <strong>{selectedDate}</strong>
        <br />
        <Typography component="span" variant="caption">
          Thợ bận = đang sửa / rửa / sửa bổ sung, hoặc có việc ghi tay. Xe chờ sửa vẫn coi là rảnh.
        </Typography>
      </Typography>
    </FilterPanel>
  );

  const renderMobileCard = (row) => {
    const { worker, assignedCars, manualJobs } = row;

    return (
      <Card key={worker._id} variant="outlined">
        <CardContent>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
            spacing={1}
            sx={{ mb: 1.5 }}
          >
            <Box>
              <Typography variant="subtitle1" fontWeight={800}>
                {worker.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                MNV: {worker.soBaoDanh || "—"}
              </Typography>
            </Box>
            {renderStatusChip(row)}
          </Stack>

          <Divider sx={{ mb: 1.5 }} />

          <Typography
            variant="caption"
            fontWeight={800}
            color="text.secondary"
            display="block"
            sx={{ mb: 0.75, textTransform: "uppercase" }}
          >
            Xe được gán
          </Typography>
          <Box sx={{ mb: 1.5 }}>{renderCars(worker, assignedCars)}</Box>

          <Typography
            variant="caption"
            fontWeight={800}
            color="text.secondary"
            display="block"
            sx={{ mb: 0.75, textTransform: "uppercase" }}
          >
            Công việc ghi tay
          </Typography>
          <Box sx={{ mb: 1.5 }}>{renderJobs(worker, manualJobs)}</Box>

          <Typography
            variant="caption"
            fontWeight={800}
            color="text.secondary"
            display="block"
            sx={{ mb: 0.75, textTransform: "uppercase" }}
          >
            Thêm việc
          </Typography>
          {renderAddJob(worker)}
        </CardContent>
      </Card>
    );
  };

  const renderWorkerList = (hideSearch = false) => {
    const rows = hideSearch ? allWorkerRows : workerRows;

    if (rows.length === 0) {
      return (
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <Typography color="text.secondary">Không có dữ liệu thợ</Typography>
        </Paper>
      );
    }

    if (isMobile) {
      return <Stack spacing={2}>{rows.map(renderMobileCard)}</Stack>;
    }

    return (
      <TableContainer component={Paper}>
        <Table size="small" sx={{ minWidth: 1000 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: "grey.100" }}>
              <TableCell sx={{ fontWeight: "bold" }}>Thợ</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>MNV</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Trạng thái</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Xe được gán</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Công việc ghi tay</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Thêm việc</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const { worker, assignedCars, manualJobs } = row;

              return (
                <TableRow key={worker._id} hover>
                  <TableCell sx={{ verticalAlign: "top" }}>
                    <Typography fontWeight="bold">{worker.name}</Typography>
                  </TableCell>
                  <TableCell sx={{ verticalAlign: "top" }}>
                    {worker.soBaoDanh || "—"}
                  </TableCell>
                  <TableCell sx={{ verticalAlign: "top" }}>
                    {renderStatusChip(row)}
                  </TableCell>
                  <TableCell sx={{ verticalAlign: "top" }}>
                    {renderCars(worker, assignedCars)}
                  </TableCell>
                  <TableCell sx={{ verticalAlign: "top" }}>
                    {renderJobs(worker, manualJobs)}
                  </TableCell>
                  <TableCell sx={{ verticalAlign: "top", minWidth: 200 }}>
                    {renderAddJob(worker)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <PageLayout sx={{ bgcolor: "grey.50", minHeight: "100vh" }}>
      <PageHeader
        emoji="📋"
        title={isKtvUser ? "Công việc của tôi" : "Phân công công việc theo thợ"}
        subtitle={
          isKtvUser
            ? "Xem xe đang được gán và công việc ghi tay trong ngày"
            : "Giao việc ghi tay theo ngày và theo dõi xe đang được gán cho từng thợ"
        }
        actions={
          <Button
            variant="outlined"
            size="small"
            startIcon={<FullscreenIcon />}
            onClick={() => setPageFullscreen(true)}
            sx={{ flexShrink: 0, bgcolor: "background.paper" }}
          >
            {isMobile ? "Full" : "Xem full màn hình"}
          </Button>
        }
      />

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
    </PageLayout>
  );
};

export default WokerAssignment;

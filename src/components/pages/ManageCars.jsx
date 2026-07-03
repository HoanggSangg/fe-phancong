import React, { useEffect, useState, useMemo } from 'react';
import {
  getAllCars,
  updateCar,
  deleteCar,
  getAllSupervisors,
  updateCarStatusWithWorker,
  getAvailableWorkers,
  getCarsByLocation,
  getAllLocations,
  getAllWorkers,
  getCarRepairItems,
  assignRepairItemWorkers,
  saveManualRepairItems,
} from '../apis/index';
import {
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Paper,
  MenuItem,
  useMediaQuery,
  useTheme,
  Autocomplete,
  Snackbar,
  Alert,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  Chip,
  Grid,
  Card,
  CardContent,
  CardActions,
  Divider,
  Stack,
} from '@mui/material';
import {
  Edit,
  Delete,
  Add,
  CheckCircle,
  Schedule,
  BuildCircle,
  LocationOn,
  LocalCarWash,
  Handshake,
  LocalShipping,
  Build,
  Person,
  SwapHoriz,
  History,
  Error,
  ReceiptLong,
  EditNote,
} from '@mui/icons-material';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import Slide from '@mui/material/Slide';
import { useAuth } from '../../context/AuthContext';
import { canDeleteCars, canManageCars, isAdmin } from '../../utils/permissions';
import { formatMoney } from '../../utils/dateFilters';
import FullscreenDialog from '../common/FullscreenDialog';
import OperationVoiceControls from '../common/OperationVoiceControls';
import useOperationVoiceMonitor from '../../hooks/useOperationVoiceMonitor';

dayjs.extend(customParseFormat);
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';

const mapRepairItemToState = (item) => {
  const base = {
    ...item,
    isManual: Boolean(item.isManual),
  };

  if (item.workerAssignments?.length > 0) {
    return {
      ...base,
      selectedWorkers: item.workerAssignments.map((assignment) => ({
        worker: assignment.worker,
        percentage: assignment.percentage ?? 100,
      })),
    };
  }

  if (item.worker) {
    return {
      ...base,
      selectedWorkers: [{ worker: item.worker, percentage: 100 }],
    };
  }

  return {
    ...base,
    selectedWorkers: [{ worker: null, percentage: 100 }],
  };
};

const createEmptyManualItem = () => ({
  _id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  isManual: true,
  groupName: 'Phát sinh',
  content: '',
  quantity: 1,
  unitPrice: 0,
  amount: 0,
  unit: '',
  selectedWorkers: [{ worker: null, percentage: 100 }],
});

const getItemWorkerTotalPercentage = (item) =>
  (item.selectedWorkers || [])
    .filter((entry) => entry.worker)
    .reduce((sum, entry) => sum + (Number(entry.percentage) || 0), 0);

const isItemWorkerPercentageValid = (item) => {
  const workers = (item.selectedWorkers || []).filter((entry) => entry.worker);
  if (workers.length === 0) return true;
  return getItemWorkerTotalPercentage(item) <= 100.01;
};

const getWorkerRevenuePreview = (repairItems, workersById = {}) => {
  const preview = {};

  repairItems.forEach((item) => {
    const amount = Number(item.amount || 0);
    (item.selectedWorkers || []).forEach((entry) => {
      if (!entry.worker?._id) return;

      const workerMeta = workersById[entry.worker._id] || entry.worker;
      if (workerMeta.countRevenue === false) return;

      const share = amount * ((Number(entry.percentage) || 0) / 100);
      const key = entry.worker._id;
      preview[key] = {
        name: entry.worker.name,
        total: (preview[key]?.total || 0) + share,
      };
    });
  });

  return Object.values(preview);
};

const ManageCars = () => {
  const { user } = useAuth();
  const canDelete = canDeleteCars(user?.role);
  const adminUser = isAdmin(user?.role);
  const {
    voiceEnabled,
    toggleVoice,
    testVoice,
  } = useOperationVoiceMonitor({ poll: adminUser });
  const canManage = canManageCars(user?.role);
  const [filterDate, setFilterDate] = useState(null);
  const [cars, setCars] = useState([]);
  const [allCars, setAllCars] = useState([]);
  const [editOpen, setEditOpen] = useState(false);
  const [statusUpdateOpen, setStatusUpdateOpen] = useState(false);
  const [editData, setEditData] = useState({});
  const [statusUpdateData, setStatusUpdateData] = useState({});
  const [workers, setWorkers] = useState([]);
  const [allWorkers, setAllWorkers] = useState([]);
  const [availableWorkers, setAvailableWorkers] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedNewWorker, setSelectedNewWorker] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [repairDialogOpen, setRepairDialogOpen] = useState(false);
  const [repairCar, setRepairCar] = useState(null);
  const [repairItems, setRepairItems] = useState([]);
  const [repairLoading, setRepairLoading] = useState(false);
  const [repairSaving, setRepairSaving] = useState(false);

  const ErrorIcon = Error;

  const [searchPlate, setSearchPlate] = useState('');
  const [tableSupervisor, setTableSupervisor] = useState('');
  const [pageFullscreen, setPageFullscreen] = useState(false);

  // Danh sách xe sau khi lọc theo ngày nhận xe
  const displayedCars = useMemo(() => {
    if (!filterDate) return cars;
    const selected = dayjs(filterDate).format('YYYY-MM-DD');
    return cars.filter(car => car.currentDate === selected);
  }, [cars, filterDate]);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const fetchCars = async () => {
    try {
      const res = await getAllCars();
      setAllCars(res.data);
      setCars(res.data);
    } catch (err) {
      console.error('Lỗi khi lấy danh sách xe:', err);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await getAllLocations();
      setLocations(res.data);
    } catch (err) {
      console.error('Lỗi khi lấy danh sách địa điểm:', err);
    }
  };
  const fetchAllWorkers = async () => {
    try {
      const res = await getAllWorkers();
      setAllWorkers(res.data);
    } catch (err) {
      console.error('Lỗi khi lấy tất cả thợ:', err);
    }
  };

  const fetchAvailableWorkers = async () => {
    try {
      const res = await getAvailableWorkers();
      setAvailableWorkers(res.data);
    } catch (err) {
      console.error('Lỗi khi lấy thợ rảnh:', err);
    }
  };

  const workersById = useMemo(
    () => Object.fromEntries((allWorkers || []).map((worker) => [worker._id, worker])),
    [allWorkers]
  );

  const STATUS_OPTIONS = [
    { value: 'pending', label: 'Chờ sửa', icon: <Schedule />, color: 'default' },
    { value: 'working', label: 'Đang sửa', icon: <BuildCircle />, color: 'warning' },
    { value: 'done', label: 'Sửa xong', icon: <CheckCircle />, color: 'success' },
    { value: 'waiting_wash', label: 'Chờ rửa xe', icon: <LocalCarWash />, color: 'info' },
    { value: 'waiting_handover', label: 'Chờ giao xe', icon: <Handshake />, color: 'primary' },
    { value: 'delivered', label: 'Đã giao', icon: <LocalShipping />, color: 'success' },
    { value: 'additional_repair', label: 'Sửa bổ sung', icon: <Build />, color: 'error' },
  ];

  const CONDITION_OPTIONS = {
    vip: { label: 'VIP', color: 'warning' },
    good: { label: 'Tốt', color: 'success' },
    normal: { label: 'Bình thường', color: 'default' },
    warranty: { label: 'Bảo hành', color: 'info' },
    rescue: { label: 'Cứu hộ', color: 'error' },
    null: { label: 'Bình thường', color: 'default' }
  };

  const getConditionConfig = (condition) => {
    return CONDITION_OPTIONS[condition] || CONDITION_OPTIONS.null;
  };

  const getStatusConfig = (status) => {
    return STATUS_OPTIONS.find(option => option.value === status) || STATUS_OPTIONS[0];
  };

  const fetchData = async () => {
    try {
      const [workerRes, supervisorRes] = await Promise.all([
        getAvailableWorkers(),
        getAllSupervisors(),
      ]);
      setWorkers(workerRes.data);
      setSupervisors(supervisorRes.data);
    } catch (error) {
      console.error('Lỗi khi lấy danh sách thợ hoặc giám sát:', error);
    }
  };

  useEffect(() => {
    fetchCars();
    fetchData();
    fetchLocations();
    fetchAllWorkers();
    fetchAvailableWorkers();
  }, []);

  const handleLocationChange = async (locationId) => {
    setSelectedLocation(locationId);

    if (locationId === 'all') {
      setCars(allCars);
    } else {
      try {
        const res = await getCarsByLocation(locationId);
        setCars(res.data);
      } catch (err) {
        console.error('Lỗi khi lấy xe theo địa điểm:', err);
        setSnackbar({
          open: true,
          message: 'Lỗi khi lọc xe theo địa điểm',
          severity: 'error'
        });
      }
    }
  };

  const getWorkerNames = (car, role) => {
    const names = car.workers
      .filter((w) => w.role === role)
      .map((w) => w.worker?.name)
      .filter(Boolean);

    return names.length > 0 ? (
      names.map((name, index) => (
        <React.Fragment key={index}>
          - {name}
          {index !== names.length - 1 && <br />}
        </React.Fragment>
      ))
    ) : (
      <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>Trống</span>
    );
  };

  const renderStatusIcon = (status) => {
    const config = getStatusConfig(status);
    return React.cloneElement(config.icon, { color: config.color });
  };

  const handleEditClick = async (car) => {
    try {
      const availableRes = await getAvailableWorkers();
      let merged = [...availableRes.data];

      car.workers.forEach(({ worker }) => {
        if (!merged.find((w) => w._id === worker._id)) {
          merged.push(worker);
        }
      });

      setWorkers(merged);

      const mainWorkerIds = car.workers
        .filter((w) => w.role === "main")
        .map((w) => w.worker._id);
      const subWorkerIds = car.workers
        .filter((w) => w.role === "sub")
        .map((w) => w.worker._id);

      setEditData({
        ...car,
        mainWorkers: mainWorkerIds,
        subWorkers: subWorkerIds,
        supervisor: car.supervisor?._id || '',
      });

      setEditOpen(true);
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu thợ khi sửa xe:', error);
    }
  };

  const handleEditSave = async () => {
    try {
      const updatedCar = {
        plateNumber: editData.plateNumber,
        supervisor: editData.supervisor || null,
        workers: [
          ...editData.mainWorkers.map((id) => ({ worker: id, role: 'main' })),
          ...editData.subWorkers.map((id) => ({ worker: id, role: 'sub' })),
        ],
      };

      await updateCar(editData._id, updatedCar);

      setEditOpen(false);
      fetchCars();
      fetchData();
      setSnackbar({ open: true, message: 'Cập nhật xe thành công', severity: 'success' });
    } catch (err) {
      console.error('Lỗi khi cập nhật xe:', err);
      setSnackbar({ open: true, message: 'Cập nhật xe thất bại', severity: 'error' });
    }
  };

  const handleDelete = (id) => {
    if (!canDelete) return;
    confirmDelete(id);
  };

  const handleLoadRepairItems = async (car) => {
    try {
      setRepairCar(car);
      setRepairLoading(true);
      setRepairDialogOpen(true);
      setRepairItems([]);

      const res = await getCarRepairItems(car._id);
      setRepairItems((res.data || []).map(mapRepairItemToState));
    } catch (err) {
      console.error('Lỗi khi tải chi tiết sửa chữa:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Không tải được chi tiết sửa chữa',
        severity: 'error',
      });
      setRepairDialogOpen(false);
    } finally {
      setRepairLoading(false);
    }
  };

  const handleRepairWorkerChange = (itemId, rowIndex, worker) => {
    setRepairItems((prev) =>
      prev.map((item) =>
        item._id === itemId
          ? {
              ...item,
              selectedWorkers: item.selectedWorkers.map((entry, index) =>
                index === rowIndex ? { ...entry, worker } : entry
              ),
            }
          : item
      )
    );
  };

  const handleRepairPercentageChange = (itemId, rowIndex, percentage) => {
    setRepairItems((prev) =>
      prev.map((item) =>
        item._id === itemId
          ? {
              ...item,
              selectedWorkers: item.selectedWorkers.map((entry, index) =>
                index === rowIndex
                  ? { ...entry, percentage: Math.min(100, Math.max(0, Number(percentage) || 0)) }
                  : entry
              ),
            }
          : item
      )
    );
  };

  const handleAddRepairWorkerRow = (itemId) => {
    setRepairItems((prev) =>
      prev.map((item) =>
        item._id === itemId
          ? {
              ...item,
              selectedWorkers: [...item.selectedWorkers, { worker: null, percentage: 0 }],
            }
          : item
      )
    );
  };

  const handleRemoveRepairWorkerRow = (itemId, rowIndex) => {
    setRepairItems((prev) =>
      prev.map((item) => {
        if (item._id !== itemId) return item;
        if (item.selectedWorkers.length <= 1) {
          return {
            ...item,
            selectedWorkers: [{ worker: null, percentage: 100 }],
          };
        }
        return {
          ...item,
          selectedWorkers: item.selectedWorkers.filter((_, index) => index !== rowIndex),
        };
      })
    );
  };

  const handleManualFieldChange = (itemId, field, value) => {
    setRepairItems((prev) =>
      prev.map((item) => {
        if (item._id !== itemId) return item;
        const next = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          next.amount = Math.round(
            (Number(next.quantity) || 0) * (Number(next.unitPrice) || 0)
          );
        }
        if (field === 'amount') {
          next.amount = Math.max(Number(value) || 0, 0);
        }
        return next;
      })
    );
  };

  const handleAddManualItem = () => {
    setRepairItems((prev) => [...prev, createEmptyManualItem()]);
  };

  const handleRemoveManualItem = (itemId) => {
    setRepairItems((prev) => prev.filter((item) => item._id !== itemId));
  };

  const apiRepairItems = useMemo(
    () => repairItems.filter((item) => !item.isManual),
    [repairItems]
  );

  const manualRepairItems = useMemo(
    () => repairItems.filter((item) => item.isManual),
    [repairItems]
  );

  const buildWorkersPayload = (item) =>
    item.selectedWorkers
      .filter((entry) => entry.worker)
      .map((entry) => ({
        workerId: entry.worker._id,
        percentage: Number(entry.percentage) || 0,
      }));

  const handleSaveRepairAssignments = async () => {
    if (!repairCar) return;

    const invalidPercentItem = repairItems.find((item) => !isItemWorkerPercentageValid(item));
    if (invalidPercentItem) {
      setSnackbar({
        open: true,
        message: `Hạng mục "${invalidPercentItem.content || '—'}": tổng % thợ không được vượt quá 100 (hiện tại: ${getItemWorkerTotalPercentage(invalidPercentItem)}%)`,
        severity: 'error',
      });
      return;
    }

    const invalidManualItem = manualRepairItems.find((item) => !String(item.content || '').trim());
    if (invalidManualItem) {
      setSnackbar({
        open: true,
        message: 'Vui lòng nhập nội dung cho công việc ngoài báo giá',
        severity: 'error',
      });
      return;
    }

    try {
      setRepairSaving(true);

      if (apiRepairItems.length > 0) {
        await assignRepairItemWorkers(
          repairCar._id,
          apiRepairItems.map((item) => ({
            itemId: item._id,
            workers: buildWorkersPayload(item),
          }))
        );
      }

      const res = await saveManualRepairItems(
        repairCar._id,
        manualRepairItems.map((item) => ({
          _id: item._id,
          groupName: item.groupName,
          content: item.content,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
          unit: item.unit,
          workers: buildWorkersPayload(item),
        }))
      );

      setRepairItems((res.data || []).map(mapRepairItemToState));

      setSnackbar({
        open: true,
        message: 'Đã lưu phân công thợ và công việc ngoài báo giá',
        severity: 'success',
      });
    } catch (err) {
      console.error('Lỗi khi lưu phân công:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Lưu phân công thất bại',
        severity: 'error',
      });
    } finally {
      setRepairSaving(false);
    }
  };

  const confirmDelete = async (id) => {
    if (window.confirm('Bạn có chắc muốn xoá xe này?')) {
      try {
        await deleteCar(id);
        fetchCars();
        setSnackbar({ open: true, message: 'Xoá xe thành công', severity: 'success' });
      } catch (err) {
        console.error('Lỗi khi xoá xe:', err);
        setSnackbar({ open: true, message: 'Xoá xe thất bại', severity: 'error' });
      }
    }
  };


  // Kiểm tra xem có thể chuyển trạng thái nào từ trạng thái hiện tại
  const getAvailableStatusTransitions = (currentStatus) => {
    const transitions = {
      'pending': ['working'],
      'working': ['done', 'pending'],
      'done': ['waiting_wash', 'waiting_handover'],
      'waiting_wash': ['waiting_handover', 'additional_repair'], // Chỉ có thể chuyển sang chờ giao hoặc sửa bổ sung
      'waiting_handover': ['additional_repair', 'delivered'],
      'delivered': [],
      'additional_repair': ['done']
    };

    return transitions[currentStatus] || [];
  };

  // Kiểm tra xem có cần chọn thợ mới không
  const needsWorkerSelection = (currentStatus, newStatus) => {
    return (
      (currentStatus === 'done' && newStatus === 'waiting_wash') ||
      (['done', 'waiting_wash'].includes(currentStatus) && newStatus === 'waiting_handover') ||
      (['waiting_wash', 'waiting_handover'].includes(currentStatus) && newStatus === 'additional_repair')
    );
  };

  const handleStatusChangeClick = (car, newStatus) => {
    const needsWorker = needsWorkerSelection(car.status, newStatus);

    if (needsWorker) {
      // Mở dialog chọn thợ
      setStatusUpdateData({ car, newStatus, needsWorker: true });
      setSelectedNewWorker('');
      fetchAvailableWorkers(); // Refresh danh sách thợ rảnh
      setStatusUpdateOpen(true);
    } else {
      // Cập nhật trạng thái trực tiếp
      handleChangeStatus(car._id, newStatus);
    }
  };

  const handleChangeStatus = async (id, newStatus, newWorkerId = null) => {
    try {
      const res = await updateCarStatusWithWorker(id, newStatus, newWorkerId);

      if (selectedLocation === 'all') {
        fetchCars();
      } else {
        handleLocationChange(selectedLocation);
      }

      fetchAvailableWorkers();

      setSnackbar({
        open: true,
        message: res.data.message || 'Cập nhật trạng thái thành công',
        severity: 'success',
      });
    } catch (err) {
      console.error('Lỗi khi cập nhật trạng thái xe:', err);
      const errorMessage = err.response?.data?.message || 'Cập nhật trạng thái thất bại';
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    }
  };

  const handleStatusUpdateConfirm = () => {
    const { car, newStatus } = statusUpdateData;
    const workerId = selectedNewWorker || null;

    handleChangeStatus(car._id, newStatus, workerId);
    setStatusUpdateOpen(false);
    setStatusUpdateData({});
    setSelectedNewWorker('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const mergeSelectedWorkers = (selectedIds) => {
    const selectedWorkers = selectedIds?.map((id) => {
      const fromAvailable = workers.find((w) => w._id === id);
      return fromAvailable || { _id: id, name: '(Không rõ)' };
    }) || [];
    const all = [...workers, ...selectedWorkers];
    return all.filter((w, i, arr) => arr.findIndex(a => a._id === w._id) === i);
  };

  // Lấy danh sách giám sát viên duy nhất từ danh sách xe truyền vào
  const getSupervisorsFromCars = (cars) => {
    return cars
      .map(car => car.supervisor)
      .filter(Boolean)
      .filter((v, i, a) => v && a.findIndex(t => t?._id === v._id) === i);
  };

  const renderCarCard = (car) => (
    <Card key={car._id} sx={{ mb: 2, borderRadius: 3, boxShadow: 3, border: (car.isLate || car.overdue) ? '2px solid #f44336' : undefined }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {(car.isLate || car.overdue) && <Tooltip title="Xe trễ hẹn"><ErrorIcon color="error" fontSize="medium" /></Tooltip>}
            <Typography variant="h6" color={(car.isLate || car.overdue) ? 'error' : 'primary'}>
              {car.plateNumber}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              icon={renderStatusIcon(car.status)}
              label={getStatusConfig(car.status).label}
              color={getStatusConfig(car.status).color}
              size="small"
            />
            {(car.isLate || car.overdue) && <Chip label="Trễ hẹn" color="error" size="small" icon={<ErrorIcon />} />}
          </Box>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="textSecondary">
              <strong>Loại xe:</strong> {car.externalCarTypeName || 'Chưa xác định'}
            </Typography>
            <Typography variant="body2" color="textSecondary" component="span">
              <strong>Tình trạng:</strong>
              <Chip
                label={getConditionConfig(car.condition).label}
                color={getConditionConfig(car.condition).color}
                size="small"
                sx={{ ml: 1 }}
              />
            </Typography>
            <Typography variant="body2" color="textSecondary">
              <strong>Thời gian giao:</strong> {car.deliveryTime || 'Chưa xác định'}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              <strong>Địa điểm:</strong> {car.location?.name || 'Chưa xác định'}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              <strong>Giám sát:</strong> {car.supervisor?.name || '---'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="textSecondary">
              <strong>Thợ chính:</strong>
            </Typography>
            <Box sx={{ ml: 1, mb: 1 }}>
              {getWorkerNames(car, 'main')}
            </Box>
            <Typography variant="body2" color="textSecondary">
              <strong>Thợ phụ:</strong>
            </Typography>
            <Box sx={{ ml: 1 }}>
              {getWorkerNames(car, 'sub')}
            </Box>
          </Grid>
        </Grid>
      </CardContent>

      <Divider />

      <CardActions sx={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, px: 1 }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', flex: 1 }}>
          {canManage && getAvailableStatusTransitions(car.status).map((status) => (
            <Button
              key={status}
              size="small"
              variant="outlined"
              startIcon={renderStatusIcon(status)}
              onClick={() => handleStatusChangeClick(car, status)}
              sx={{ textTransform: 'none', minWidth: 0, px: 1 }}
            >
              {getStatusConfig(status).label}
            </Button>
          ))}
        </Box>

        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Chi tiết lệnh sửa chữa (API + công việc ngoài báo giá)">
            <span>
              <IconButton
                size="small"
                color="info"
                onClick={() => handleLoadRepairItems(car)}
                sx={{ borderRadius: 2 }}
              >
                <ReceiptLong />
              </IconButton>
            </span>
          </Tooltip>
          {canManage && (
          <Tooltip title="Sửa xe">
            <span>
              <IconButton
                size="small"
                color="primary"
                onClick={() => handleEditClick(car)}
                sx={{ borderRadius: 2 }}
              >
                <Edit />
              </IconButton>
            </span>
          </Tooltip>
          )}
          {canDelete && (
          <Tooltip title="Xoá xe">
            <span>
              <IconButton
                size="small"
                color="error"
                onClick={() => handleDelete(car._id)}
                sx={{ borderRadius: 2 }}
              >
                <Delete />
              </IconButton>
            </span>
          </Tooltip>
          )}
          {canManage && (
          <Tooltip title="Lịch sử xe">
            <span>
              <IconButton
                size="small"
                color="secondary"
                component={Link}
                to={`/cars/${car._id}/history`}
                sx={{ borderRadius: 2 }}
              >
                <History />
              </IconButton>
            </span>
          </Tooltip>
          )}
        </Box>
      </CardActions>
    </Card>
  );

  const renderTable = (data, hideSearch = false) => {
    let filtered = data || cars;
    if (filterDate) {
      const selected = dayjs(filterDate).format('YYYY-MM-DD');
      filtered = filtered.filter(car => {
        if (!car.currentDate) return false;
        return car.currentDate === selected;
      });
    }
    if (!hideSearch) {
      if (searchPlate) {
        filtered = filtered.filter(car => car.plateNumber?.toLowerCase().includes(searchPlate.toLowerCase()));
      }
      if (tableSupervisor) {
        filtered = filtered.filter(car => car.supervisor?._id === tableSupervisor);
      }
    }
    const sortedCars = [...filtered].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return (
      <Paper sx={{ width: '100%', overflowX: 'auto', borderRadius: 3, boxShadow: 3 }}>
        {!hideSearch && (
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', p: 2 }}>
          <TextField
            label="Tìm kiếm biển số xe"
            variant="outlined"
            size="small"
            value={searchPlate}
            onChange={e => setSearchPlate(e.target.value)}
            sx={{ maxWidth: 250, width: '100%' }}
          />
          <FormControl sx={{ minWidth: 180, maxWidth: 250, width: '100%' }} size="small">
            <InputLabel>Chọn giám sát</InputLabel>
            <Select
              value={tableSupervisor}
              label="Chọn giám sát"
              onChange={e => setTableSupervisor(e.target.value)}
            >
              <MenuItem value="">Tất cả giám sát</MenuItem>
              {getSupervisorsFromCars(data || cars).map(sup => (
                <MenuItem key={sup._id} value={sup._id}>{sup.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        )}
        <Table stickyHeader sx={{ minWidth: 1100 }}>
          <TableHead>
            <TableRow sx={{ background: '#f5f5f5' }}>
              <TableCell sx={{ fontWeight: 'bold', background: '#f5f5f5' }}>Biển số</TableCell>
              <TableCell sx={{ fontWeight: 'bold', background: '#f5f5f5' }}>Loại xe</TableCell>
              <TableCell sx={{ fontWeight: 'bold', background: '#f5f5f5' }}>Tình trạng</TableCell>
              <TableCell sx={{ fontWeight: 'bold', background: '#f5f5f5' }}>Trạng thái</TableCell>
              <TableCell sx={{ fontWeight: 'bold', background: '#f5f5f5' }}>Thợ chính</TableCell>
              <TableCell sx={{ fontWeight: 'bold', background: '#f5f5f5' }}>Thợ phụ</TableCell>
              <TableCell sx={{ fontWeight: 'bold', background: '#f5f5f5' }}>Thời gian giao</TableCell>
              <TableCell sx={{ fontWeight: 'bold', background: '#f5f5f5' }}>Địa điểm</TableCell>
              <TableCell sx={{ fontWeight: 'bold', background: '#f5f5f5' }}>Giám sát</TableCell>
              <TableCell sx={{ fontWeight: 'bold', background: '#f5f5f5' }}>Chuyển trạng thái</TableCell>
              <TableCell sx={{ fontWeight: 'bold', background: '#f5f5f5' }}>Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedCars.map((car, idx) => {
              const isLate = car.isLate || car.overdue;
              return (
                <TableRow
                  key={car._id}
                  sx={{
                    backgroundColor: isLate ? '#ffebee' : (idx % 2 === 0 ? '#fafafa' : '#fff'),
                    transition: 'background 0.2s',
                    '&:hover': { backgroundColor: isLate ? '#ffcdd2' : '#e3f2fd' }
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {isLate && <Tooltip title="Xe trễ hẹn"><ErrorIcon color="error" fontSize="small" /></Tooltip>}
                      <Typography variant="body2" fontWeight="bold" color={isLate ? 'error' : 'primary'}>
                        {car.plateNumber}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{car.externalCarTypeName || 'Chưa xác định'}</TableCell>
                  <TableCell>
                    <Chip
                      label={getConditionConfig(car.condition).label}
                      color={getConditionConfig(car.condition).color}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        icon={renderStatusIcon(car.status)}
                        label={getStatusConfig(car.status).label}
                        color={getStatusConfig(car.status).color}
                        size="small"
                      />
                      {isLate && <Chip label="Trễ hẹn" color="error" size="small" icon={<ErrorIcon />} />}
                    </Box>
                  </TableCell>
                  <TableCell>{getWorkerNames(car, 'main')}</TableCell>
                  <TableCell>{getWorkerNames(car, 'sub')}</TableCell>
                  <TableCell>{car.deliveryTime || 'Chưa xác định'}</TableCell>
                  <TableCell>{car.location?.name || 'Chưa xác định'}</TableCell>
                  <TableCell>{car.supervisor?.name || '---'}</TableCell>
                  <TableCell>
                    {canManage ? (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {getAvailableStatusTransitions(car.status).map((status) => (
                        <Tooltip key={status} title={`Chuyển sang ${getStatusConfig(status).label}`}>
                          <IconButton
                            size="small"
                            color={getStatusConfig(status).color}
                            onClick={() => handleStatusChangeClick(car, status)}
                            sx={{ borderRadius: 2 }}
                          >
                            {renderStatusIcon(status)}
                          </IconButton>
                        </Tooltip>
                      ))}
                    </Box>
                    ) : (
                      <Chip label={getStatusConfig(car.status).label} size="small" color={getStatusConfig(car.status).color} />
                    )}
                  </TableCell>

                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Chi tiết lệnh sửa chữa (API + công việc ngoài báo giá)">
            <span>
              <IconButton
                size="small"
                color="info"
                onClick={() => handleLoadRepairItems(car)}
                sx={{ borderRadius: 2 }}
              >
                <ReceiptLong />
              </IconButton>
            </span>
          </Tooltip>
          {canManage && (
          <Tooltip title="Sửa xe">
                        <span>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleEditClick(car)}
                            sx={{ borderRadius: 2 }}
                          >
                            <Edit />
                          </IconButton>
                        </span>
                      </Tooltip>
          )}
                      {canDelete && (
                      <Tooltip title="Xoá xe">
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(car._id)}
                            sx={{ borderRadius: 2 }}
                          >
                            <Delete />
                          </IconButton>
                        </span>
                      </Tooltip>
                      )}
                      {canManage && (
                      <Tooltip title="Lịch sử xe">
                        <span>
                          <IconButton
                            size="small"
                            color="secondary"
                            component={Link}
                            to={`/cars/${car._id}/history`}
                            sx={{ borderRadius: 2 }}
                          >
                            <History />
                          </IconButton>
                        </span>
                      </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>
    );
  };

  const compactInputSx = {
    '& .MuiInputBase-root': { fontSize: 13, height: 32 },
    '& .MuiInputLabel-root': { fontSize: 12 },
  };

  const renderInlineWorkers = (item) => (
    <Stack spacing={0.5} sx={{ minWidth: 320 }}>
      {(item.selectedWorkers || []).map((entry, rowIndex) => (
        <Box
          key={`${item._id}-${rowIndex}`}
          sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}
        >
          <Autocomplete
            size="small"
            disabled={!canManage}
            sx={{ width: 220, ...compactInputSx }}
            options={allWorkers}
            getOptionLabel={(option) => option.name || ''}
            value={entry.worker}
            onChange={(_, newValue) => handleRepairWorkerChange(item._id, rowIndex, newValue)}
            renderInput={(params) => (
              <TextField {...params} placeholder="Chọn thợ" />
            )}
            isOptionEqualToValue={(option, value) => option._id === value?._id}
          />
          <TextField
            size="small"
            type="number"
            label="%"
            disabled={!canManage}
            value={entry.percentage}
            onChange={(e) => handleRepairPercentageChange(item._id, rowIndex, e.target.value)}
            inputProps={{ min: 0, max: 100, step: 1 }}
            sx={{ width: 72, ...compactInputSx }}
          />
          {canManage && (
            <IconButton
              size="small"
              color="error"
              onClick={() => handleRemoveRepairWorkerRow(item._id, rowIndex)}
              sx={{ p: 0.25 }}
            >
              <Delete sx={{ fontSize: 16 }} />
            </IconButton>
          )}
        </Box>
      ))}
      {canManage && (
        <IconButton
          size="small"
          color="primary"
          onClick={() => handleAddRepairWorkerRow(item._id)}
          sx={{ alignSelf: 'flex-start', p: 0.25 }}
        >
          <Add sx={{ fontSize: 16 }} />
        </IconButton>
      )}
      {item.selectedWorkers?.some((entry) => entry.worker) && (
        <Typography
          variant="caption"
          color={isItemWorkerPercentageValid(item) ? 'success.main' : 'error'}
          sx={{ lineHeight: 1.2 }}
        >
          {getItemWorkerTotalPercentage(item)}%
        </Typography>
      )}
    </Stack>
  );

  const renderCompactRepairTableHead = (editable = false) => (
    <TableRow>
      <TableCell sx={{ fontWeight: 'bold', py: 0.75, px: 1, width: 36 }}>#</TableCell>
      <TableCell sx={{ fontWeight: 'bold', py: 0.75, px: 1, width: 90 }}>Nhóm</TableCell>
      <TableCell sx={{ fontWeight: 'bold', py: 0.75, px: 1, minWidth: 160 }}>Nội dung</TableCell>
      <TableCell sx={{ fontWeight: 'bold', py: 0.75, px: 1, width: 72 }} align="right">SL</TableCell>
      <TableCell sx={{ fontWeight: 'bold', py: 0.75, px: 1, width: 120 }} align="right">ĐG</TableCell>
      <TableCell sx={{ fontWeight: 'bold', py: 0.75, px: 1, width: 120 }} align="right">TT</TableCell>
      <TableCell sx={{ fontWeight: 'bold', py: 0.75, px: 1, minWidth: 340 }}>Thợ · %</TableCell>
      {editable && canManage && (
        <TableCell sx={{ fontWeight: 'bold', py: 0.75, px: 0.5, width: 36 }} />
      )}
    </TableRow>
  );

  const renderManualRepairItemCard = (item, index) => (
    <TableRow key={item._id} hover sx={{ bgcolor: '#fffbeb' }}>
      <TableCell sx={{ py: 0.5, px: 1, verticalAlign: 'middle' }}>{index + 1}</TableCell>
      <TableCell sx={{ py: 0.5, px: 1, verticalAlign: 'middle' }}>
        <TextField
          size="small"
          disabled={!canManage}
          value={item.groupName || ''}
          onChange={(e) => handleManualFieldChange(item._id, 'groupName', e.target.value)}
          sx={{ width: 84, ...compactInputSx }}
        />
      </TableCell>
      <TableCell sx={{ py: 0.5, px: 1, verticalAlign: 'middle' }}>
        <TextField
          size="small"
          disabled={!canManage}
          placeholder="Nội dung *"
          value={item.content || ''}
          onChange={(e) => handleManualFieldChange(item._id, 'content', e.target.value)}
          fullWidth
          sx={compactInputSx}
        />
      </TableCell>
      <TableCell sx={{ py: 0.5, px: 1, verticalAlign: 'middle' }} align="right">
        <TextField
          size="small"
          type="number"
          disabled={!canManage}
          value={item.quantity ?? 1}
          onChange={(e) => handleManualFieldChange(item._id, 'quantity', e.target.value)}
          inputProps={{ min: 0, step: 1 }}
          sx={{ width: 64, ...compactInputSx }}
        />
      </TableCell>
      <TableCell sx={{ py: 0.5, px: 1, verticalAlign: 'middle' }} align="right">
        <TextField
          size="small"
          type="number"
          disabled={!canManage}
          value={item.unitPrice ?? 0}
          onChange={(e) => handleManualFieldChange(item._id, 'unitPrice', e.target.value)}
          inputProps={{ min: 0, step: 1000 }}
          sx={{ width: 112, ...compactInputSx }}
        />
      </TableCell>
      <TableCell sx={{ py: 0.5, px: 1, verticalAlign: 'middle' }} align="right">
        <TextField
          size="small"
          type="number"
          disabled={!canManage}
          value={item.amount ?? 0}
          onChange={(e) => handleManualFieldChange(item._id, 'amount', e.target.value)}
          inputProps={{ min: 0, step: 1000 }}
          sx={{ width: 112, ...compactInputSx }}
        />
      </TableCell>
      <TableCell sx={{ py: 0.5, px: 1, verticalAlign: 'middle' }}>
        {renderInlineWorkers(item)}
      </TableCell>
      {canManage && (
        <TableCell sx={{ py: 0.5, px: 0.5, verticalAlign: 'middle' }}>
          <IconButton size="small" color="error" onClick={() => handleRemoveManualItem(item._id)} sx={{ p: 0.25 }}>
            <Delete sx={{ fontSize: 16 }} />
          </IconButton>
        </TableCell>
      )}
    </TableRow>
  );

  const renderManualRepairSection = () => (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <EditNote color="warning" sx={{ fontSize: 18 }} />
          <Typography variant="subtitle1" fontWeight="bold">
            Công việc ngoài báo giá
          </Typography>
          <Chip label="Nhập tay" size="small" color="warning" variant="outlined" sx={{ height: 20 }} />
        </Stack>
        {canManage && (
          <Button size="small" variant="contained" color="warning" startIcon={<Add />} onClick={handleAddManualItem}>
            Thêm
          </Button>
        )}
      </Stack>

      {manualRepairItems.length === 0 ? (
        <Alert severity="warning" sx={{ py: 0.5 }}>
          Chưa có công việc ngoài báo giá.
        </Alert>
      ) : (
        <Paper variant="outlined" sx={{ overflowX: 'auto', borderColor: '#fcd34d' }}>
          <Table size="small" sx={{ minWidth: 1100 }}>
            <TableHead>
              {renderCompactRepairTableHead(true)}
            </TableHead>
            <TableBody>
              {manualRepairItems.map((item, index) => renderManualRepairItemCard(item, index))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );

  const renderApiRepairItemCard = (item, index) => (
    <TableRow key={item._id} hover>
      <TableCell sx={{ py: 0.5, px: 1, verticalAlign: 'middle' }}>{index + 1}</TableCell>
      <TableCell sx={{ py: 0.5, px: 1, verticalAlign: 'middle', fontSize: 13 }}>
        {item.groupName || 'Khác'}
      </TableCell>
      <TableCell
        sx={{
          py: 0.5,
          px: 1,
          verticalAlign: 'middle',
          fontSize: 13,
          maxWidth: 280,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={item.content}
      >
        {item.content}
      </TableCell>
      <TableCell sx={{ py: 0.5, px: 1, verticalAlign: 'middle', fontSize: 13 }} align="right">
        {item.quantity}
      </TableCell>
      <TableCell sx={{ py: 0.5, px: 1, verticalAlign: 'middle', fontSize: 13, whiteSpace: 'nowrap' }} align="right">
        {formatMoney(item.unitPrice)}
      </TableCell>
      <TableCell sx={{ py: 0.5, px: 1, verticalAlign: 'middle', fontSize: 13, whiteSpace: 'nowrap' }} align="right">
        {formatMoney(item.amount)}
      </TableCell>
      <TableCell sx={{ py: 0.5, px: 1, verticalAlign: 'middle' }}>
        {renderInlineWorkers(item)}
      </TableCell>
    </TableRow>
  );

  const renderApiRepairSection = () => (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <ReceiptLong color="info" sx={{ fontSize: 18 }} />
        <Typography variant="subtitle1" fontWeight="bold">
          Hạng mục từ báo giá
        </Typography>
        <Chip label="API" size="small" variant="outlined" sx={{ height: 20 }} />
      </Stack>

      {apiRepairItems.length === 0 ? (
        <Alert severity="info" sx={{ py: 0.5, mb: 1 }}>
          Chưa có hạng mục từ báo giá.
        </Alert>
      ) : (
        <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 1100 }}>
            <TableHead>
              {renderCompactRepairTableHead(false)}
            </TableHead>
            <TableBody>
              {apiRepairItems.map((item, index) => renderApiRepairItemCard(item, index))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );

  const renderCarsPanel = (hideSearch = false) => (
    <>
      {!hideSearch && (
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 3, boxShadow: 3 }}>
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel><LocationOn sx={{ mr: 1 }} fontSize="small" />Địa điểm</InputLabel>
              <Select
                value={selectedLocation}
                onChange={(e) => handleLocationChange(e.target.value)}
                label={<><LocationOn sx={{ mr: 1 }} fontSize="small" />Địa điểm</>}
              >
                <MenuItem value="all">
                  <Typography variant="body2" fontWeight="bold">
                    Tất cả địa điểm
                  </Typography>
                </MenuItem>
                {locations.map((location) => (
                  <MenuItem key={location._id} value={location._id}>
                    {location.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label={<><Schedule sx={{ mr: 1 }} fontSize="small" />Ngày nhận xe</>}
              type="date"
              size="small"
              fullWidth
              value={filterDate ? dayjs(filterDate).format('YYYY-MM-DD') : ''}
              onChange={e => setFilterDate(e.target.value ? dayjs(e.target.value).toDate() : null)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button
              variant="outlined"
              size="small"
              fullWidth
              onClick={() => setFilterDate(null)}
              disabled={!filterDate}
              startIcon={<Delete />}
            >
              Xoá lọc ngày
            </Button>
          </Grid>
          <Grid item xs={12} sm={2}>
            <Paper elevation={0} sx={{ p: 1, textAlign: 'center', background: '#f5f5f5', borderRadius: 2 }}>
              <Typography variant="body2" fontWeight="bold" color="primary">
                <DirectionsCarIcon fontSize="small" sx={{ mr: 1 }} />Tổng cộng
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {displayedCars.length} xe
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>
      )}

      {!hideSearch && isMobile && (
        <Box sx={{ mb: 2 }}>
          <Stack spacing={2} direction="column">
            <TextField
              label="Tìm kiếm biển số xe"
              variant="outlined"
              size="small"
              value={searchPlate}
              onChange={e => setSearchPlate(e.target.value)}
              fullWidth
            />
            <FormControl fullWidth size="small">
              <InputLabel>Chọn giám sát</InputLabel>
              <Select
                value={tableSupervisor}
                label="Chọn giám sát"
                onChange={e => setTableSupervisor(e.target.value)}
              >
                <MenuItem value="">Tất cả giám sát</MenuItem>
                {getSupervisorsFromCars(displayedCars).map(sup => (
                  <MenuItem key={sup._id} value={sup._id}>{sup.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </Box>
      )}

      {isMobile ? (
        <Box>
          {(() => {
            let filtered = displayedCars;
            if (!hideSearch) {
              if (searchPlate) {
                filtered = filtered.filter(car => car.plateNumber?.toLowerCase().includes(searchPlate.toLowerCase()));
              }
              if (tableSupervisor) {
                filtered = filtered.filter(car => car.supervisor?._id === tableSupervisor);
              }
            }
            return [...filtered]
              .sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
                const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
                return dateB - dateA;
              })
              .map(renderCarCard);
          })()}
        </Box>
      ) : (
        renderTable(displayedCars, hideSearch)
      )}
    </>
  );

  return (
    <Box sx={{ p: { xs: 2, sm: 4 } }}>
      <Box
        sx={{
          background: '#f5f5f5',
          borderRadius: 2,
          px: { xs: 2, sm: 4 },
          py: { xs: 2, sm: 3 },
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
          <DirectionsCarIcon color="primary" sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold" color="primary">
              Quản lý xe
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Theo dõi, cập nhật trạng thái và lịch sử xe trong hệ thống
            </Typography>
          </Box>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
          {adminUser && (
            <OperationVoiceControls
              voiceEnabled={voiceEnabled}
              onToggle={toggleVoice}
              onTest={testVoice}
            />
          )}
          <Button
            variant="outlined"
            size="small"
            startIcon={<FullscreenIcon />}
            onClick={() => setPageFullscreen(true)}
          >
            {isMobile ? 'Full' : 'Xem full màn hình'}
          </Button>
        </Stack>
      </Box>
      <Divider sx={{ mb: 2 }} />

      {renderCarsPanel()}
      {/* Dialog cập nhật xe */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Edit color="primary" />
            <Typography variant="h6" fontWeight="bold">Cập nhật thông tin xe</Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Biển số xe"
                name="plateNumber"
                value={editData.plateNumber || ''}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Loại xe (từ API)"
                fullWidth
                value={editData.externalCarTypeName || ''}
                InputProps={{ readOnly: true }}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Thời gian giao (từ API)"
                fullWidth
                value={editData.deliveryTime || 'Chưa xác định'}
                InputProps={{ readOnly: true }}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel shrink>Giám sát</InputLabel>
                <Select
                  name="supervisor"
                  value={editData.supervisor || ''}
                  onChange={handleChange}
                  label="Giám sát"
                  displayEmpty
                  inputProps={{ 'aria-label': 'Giám sát' }}
                >
                  <MenuItem value="">
                    <em>Không chọn</em>
                  </MenuItem>
                  {supervisors.map((supervisor) => (
                    <MenuItem key={supervisor._id} value={supervisor._id}>
                      {supervisor.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                multiple
                options={mergeSelectedWorkers(editData.mainWorkers)}
                getOptionLabel={(option) => option.name || ''}
                value={mergeSelectedWorkers(editData.mainWorkers).filter((worker) =>
                  editData.mainWorkers?.includes(worker._id)
                )}
                onChange={(event, newValue) => {
                  setEditData((prev) => ({
                    ...prev,
                    mainWorkers: newValue.map((worker) => worker._id),
                  }));
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Thợ chính" fullWidth InputLabelProps={{ shrink: true }} sx={{ mb: 2 }} />
                )}
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                multiple
                options={mergeSelectedWorkers(editData.subWorkers)}
                getOptionLabel={(option) => option.name || ''}
                value={mergeSelectedWorkers(editData.subWorkers).filter((worker) =>
                  editData.subWorkers?.includes(worker._id)
                )}
                onChange={(event, newValue) => {
                  setEditData((prev) => ({
                    ...prev,
                    subWorkers: newValue.map((worker) => worker._id),
                  }));
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Thợ phụ" fullWidth InputLabelProps={{ shrink: true }} sx={{ mb: 2 }} />
                )}
                sx={{ mb: 2 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', gap: 2, p: 2 }}>
          <Button onClick={() => setEditOpen(false)} variant="outlined">Hủy</Button>
          <Button onClick={handleEditSave} variant="contained" color="primary">
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog chọn thợ cho chuyển trạng thái */}
      <Dialog
        open={statusUpdateOpen}
        onClose={() => setStatusUpdateOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SwapHoriz color="primary" />
            <Typography variant="h6" fontWeight="bold">Chuyển trạng thái xe</Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {statusUpdateData.car && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" color="primary" gutterBottom>
                {statusUpdateData.car.plateNumber}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Từ: <strong>{getStatusConfig(statusUpdateData.car.status).label}</strong>
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Sang: <strong>{getStatusConfig(statusUpdateData.newStatus).label}</strong>
              </Typography>
            </Box>
          )}

          {statusUpdateData.needsWorker && (
            <Box>
              <Typography variant="body1" gutterBottom>
                {statusUpdateData.newStatus === 'waiting_wash'
                  ? 'Chọn thợ để rửa xe (tùy chọn - để trống sẽ giữ thợ cũ):'
                  : statusUpdateData.newStatus === 'waiting_handover'
                    ? 'Chọn người giao xe hoặc để trống nếu khách tự lấy xe:'
                    : statusUpdateData.newStatus === 'additional_repair'
                      ? 'Chọn thợ mới cho sửa bổ sung (bắt buộc):'
                      : 'Chọn thợ cho công việc này:'
                }
              </Typography>
              <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
                <InputLabel>Chọn thợ</InputLabel>
                <Select
                  value={selectedNewWorker}
                  onChange={(e) => setSelectedNewWorker(e.target.value)}
                  label="Chọn thợ"
                >
                  {statusUpdateData.newStatus === 'waiting_wash' && (
                    <MenuItem value="">
                      <em>Giữ thợ cũ</em>
                    </MenuItem>
                  )}

                  {statusUpdateData.newStatus === 'waiting_handover' && (
                    <MenuItem value="">
                      <em>Khách tự lấy xe</em>
                    </MenuItem>
                  )}
                  {availableWorkers.map((worker) => (
                    <MenuItem key={worker._id} value={worker._id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Person fontSize="small" />
                        <Box>
                          <Typography variant="body2">
                            {worker.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Trạng thái: {worker.status === 'available' ? 'Rảnh' : 'Bận'}
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {availableWorkers.length === 0 && (
                <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
                  Hiện tại không có thợ nào rảnh. Vui lòng thử lại sau.
                </Alert>
              )}

              {/* Thông báo đặc biệt cho từng trường hợp */}
              {statusUpdateData.newStatus === 'waiting_wash' && (
                <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                  <Typography variant="body2">
                    💡 <strong>Lưu ý:</strong> Nếu không chọn thợ mới, thợ hiện tại sẽ tiếp tục rửa xe và vẫn ở trạng thái bận.
                  </Typography>
                </Alert>
              )}
              {statusUpdateData.newStatus === 'waiting_handover' && (
                <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                  <Typography variant="body2">
                    🚗 <strong>Giao xe:</strong> Chọn thợ/tài xế nếu cần người giao xe. Nếu khách tự lấy xe thì để trống.
                  </Typography>
                </Alert>
              )}
              {statusUpdateData.newStatus === 'additional_repair' && (
                <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
                  <Typography variant="body2">
                    ⚠️ <strong>Bắt buộc:</strong> Phải chọn thợ mới để thực hiện sửa chữa bổ sung.
                  </Typography>
                </Alert>
              )}
            </Box>
          )}

          {/* Thông báo cho các trạng thái không cần chọn thợ */}
          {!statusUpdateData.needsWorker && (
            <Box>
              {statusUpdateData.newStatus === 'waiting_handover' && (
                <Alert severity="success" sx={{ mt: 2, mb: 2 }}>
                  <Typography variant="body2">
                    ✅ Xe sẽ chuyển sang trạng thái chờ giao. Thợ hiện tại sẽ được giải phóng.
                  </Typography>
                </Alert>
              )}

              {statusUpdateData.newStatus === 'delivered' && (
                <Alert severity="success" sx={{ mt: 2, mb: 2 }}>
                  <Typography variant="body2">
                    🎉 Xe sẽ được đánh dấu là đã giao. Tất cả thợ liên quan sẽ được giải phóng.
                  </Typography>
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', gap: 2, p: 2 }}>
          <Button onClick={() => setStatusUpdateOpen(false)} variant="outlined">
            Hủy
          </Button>
          <Button
            onClick={handleStatusUpdateConfirm}
            variant="contained"
            color="primary"
            disabled={
              (statusUpdateData.newStatus === 'additional_repair' && !selectedNewWorker) ||
              (availableWorkers.length === 0 && statusUpdateData.needsWorker && statusUpdateData.newStatus !== 'waiting_wash')
            }
          >
            Xác nhận
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={repairDialogOpen}
        onClose={() => setRepairDialogOpen(false)}
        maxWidth="xl"
        fullWidth
        fullScreen={isMobile}
        TransitionComponent={Slide}
        TransitionProps={{ direction: 'up' }}
        PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3 } }}
      >
        <DialogTitle>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ReceiptLong color="info" />
              <Typography variant="h6" fontWeight="bold">
                Chi tiết lệnh sửa chữa — {repairCar?.plateNumber || ''}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Mỗi hàng: thông tin hạng mục + phân công thợ trên cùng một dòng
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: isMobile ? 2 : 3 }}>
          {repairLoading ? (
            <Typography align="center" sx={{ py: 4 }}>
              Đang tải chi tiết sửa chữa...
            </Typography>
          ) : (
            <>
              {renderApiRepairSection()}
              <Divider sx={{ my: 1.5 }} />
              {renderManualRepairSection()}
            </>
          )}

          {!repairLoading && repairItems.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" textAlign="right">
                Tổng thành tiền hạng mục:{' '}
                {formatMoney(repairItems.reduce((sum, item) => sum + Number(item.amount || 0), 0))}
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="right" sx={{ mb: 1 }}>
                Doanh thu thợ = thành tiền × % thực hiện × 75% (trừ hoa hồng).
              </Typography>
              {getWorkerRevenuePreview(repairItems, workersById).length > 0 && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Xem trước doanh thu theo thợ (chưa trừ hoa hồng)
                  </Typography>
                  <Stack spacing={0.5}>
                    {getWorkerRevenuePreview(repairItems, workersById).map((entry) => (
                      <Box
                        key={entry.name}
                        sx={{ display: 'flex', justifyContent: 'space-between' }}
                      >
                        <Typography variant="body2">{entry.name}</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {formatMoney(entry.total)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Paper>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', gap: 2, p: 2, flexDirection: isMobile ? 'column' : 'row' }}>
          <Button onClick={() => setRepairDialogOpen(false)} variant="outlined" fullWidth={isMobile}>
            Đóng
          </Button>
          {canManage && (
          <Button
            onClick={handleSaveRepairAssignments}
            variant="contained"
            color="primary"
            disabled={repairLoading || repairSaving}
            fullWidth={isMobile}
          >
            {repairSaving ? 'Đang lưu...' : 'Lưu phân công & công việc ghi thêm'}
          </Button>
          )}
        </DialogActions>
      </Dialog>

      <FullscreenDialog
        open={pageFullscreen}
        onClose={() => setPageFullscreen(false)}
        title="Quản lý xe — toàn màn hình"
      >
        {renderCarsPanel(true)}
      </FullscreenDialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ManageCars;
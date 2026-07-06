import React, { useMemo, useState } from 'react';
import {
  updateCar,
  deleteCar,
  updateCarStatusWithWorker,
  getCarWorkerHistory,
  notifyAdminAboutCar,
} from '../apis/index';
import {
  Button,
  Box,
  Snackbar,
  Alert,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  CheckCircle,
  Schedule,
  BuildCircle,
  LocalCarWash,
  Handshake,
  LocalShipping,
  Build,
} from '@mui/icons-material';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { useAuth } from '../../context/AuthContext';
import { canDeleteCars, canHearOperationVoice, canEditManagedCars, CAR_STATUS_LABELS, isKtv } from '../../utils/permissions';
import { CAR_STATUS_COLORS, needsWorkerSelection } from '../../utils/carStatusConfig';
import FullscreenDialog from '../common/FullscreenDialog';
import OperationVoiceControls from '../common/OperationVoiceControls';
import useOperationVoiceMonitor from '../../hooks/useOperationVoiceMonitor';
import useManageCarsBootstrap from '../../hooks/useManageCarsBootstrap';
import useRepairItems from '../../hooks/useRepairItems';
import WorkerHistoryDialog from '../ManageCars/WorkerHistoryDialog';
import StatusUpdateDialog from '../ManageCars/StatusUpdateDialog';
import CarEditDialog from '../ManageCars/CarEditDialog';
import RepairItemsDialog from '../ManageCars/RepairItemsDialog';
import CarsPanel from '../ManageCars/CarsPanel';
import CarNotifyAdminDialog from '../ManageCars/CarNotifyAdminDialog';
import EnablePushNotificationButton from '../common/EnablePushNotificationButton';
import PageLayout from '../common/PageLayout';
import PageHeader from '../common/PageHeader';
import {
  filterCarsByLocation,
  patchCarInCache,
  removeCarFromCache,
} from '../../lib/carCache';

dayjs.extend(customParseFormat);

const ManageCars = () => {
  const { user } = useAuth();
  const canDelete = canDeleteCars(user);
  const canHearVoice = canHearOperationVoice(user);
  const { voiceEnabled, toggleVoice, testVoice } = useOperationVoiceMonitor({ poll: canHearVoice });
  const canManage = canEditManagedCars(user);
  const isKtvUser = isKtv(user);

  const {
    allCars,
    workers,
    setWorkers,
    allWorkers,
    availableWorkers,
    supervisors,
    locations,
    fetchCars,
    refreshAvailableWorkers,
    invalidateHomeDashboard,
  } = useManageCarsBootstrap(user);

  const [filterDate, setFilterDate] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [statusUpdateOpen, setStatusUpdateOpen] = useState(false);
  const [editData, setEditData] = useState({});
  const [statusUpdateData, setStatusUpdateData] = useState({});
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedNewWorker, setSelectedNewWorker] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState(null);
  const [historyError, setHistoryError] = useState('');
  const [searchPlate, setSearchPlate] = useState('');
  const [tableSupervisor, setTableSupervisor] = useState('');
  const [pageFullscreen, setPageFullscreen] = useState(false);
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
  const [notifyCar, setNotifyCar] = useState(null);
  const [notifySending, setNotifySending] = useState(false);

  const repair = useRepairItems({
    canManage,
    allWorkers,
    setSnackbar,
  });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const STATUS_OPTIONS = useMemo(() => ([
    { value: 'pending', label: CAR_STATUS_LABELS.pending, icon: <Schedule />, color: CAR_STATUS_COLORS.pending },
    { value: 'working', label: CAR_STATUS_LABELS.working, icon: <BuildCircle />, color: CAR_STATUS_COLORS.working },
    { value: 'done', label: CAR_STATUS_LABELS.done, icon: <CheckCircle />, color: CAR_STATUS_COLORS.done },
    { value: 'waiting_wash', label: CAR_STATUS_LABELS.waiting_wash, icon: <LocalCarWash />, color: CAR_STATUS_COLORS.waiting_wash },
    { value: 'waiting_handover', label: CAR_STATUS_LABELS.waiting_handover, icon: <Handshake />, color: CAR_STATUS_COLORS.waiting_handover },
    { value: 'delivered', label: CAR_STATUS_LABELS.delivered, icon: <LocalShipping />, color: CAR_STATUS_COLORS.delivered },
    { value: 'additional_repair', label: CAR_STATUS_LABELS.additional_repair, icon: <Build />, color: CAR_STATUS_COLORS.additional_repair },
  ]), []);

  const getStatusConfig = (status) =>
    STATUS_OPTIONS.find((option) => option.value === status) || STATUS_OPTIONS[0];

  const renderStatusIcon = (status) => {
    const config = getStatusConfig(status);
    return React.cloneElement(config.icon, { color: config.color });
  };

  const displayedCars = useMemo(
    () => filterCarsByLocation(allCars, selectedLocation),
    [allCars, selectedLocation],
  );

  const handleLocationChange = (locationId) => {
    setSelectedLocation(locationId);
  };

  const handleOpenWorkerHistory = async (car) => {
    setHistoryDialogOpen(true);
    setHistoryLoading(true);
    setHistoryError('');
    setHistoryData({ plateNumber: car.plateNumber });

    try {
      const res = await getCarWorkerHistory(car._id);
      setHistoryData(res.data.data);
    } catch (err) {
      console.error('Lỗi khi tải lịch sử thợ:', err);
      setHistoryError('Lỗi khi tải lịch sử thay đổi thợ');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleEditClick = (car) => {
    let merged = [...availableWorkers];

    car.workers.forEach(({ worker }) => {
      if (!merged.find((w) => w._id === worker._id)) {
        merged.push(worker);
      }
    });

    setWorkers(merged);

    const mainWorkerIds = car.workers
      .filter((w) => w.role === 'main')
      .map((w) => w.worker._id);
    const subWorkerIds = car.workers
      .filter((w) => w.role === 'sub')
      .map((w) => w.worker._id);

    setEditData({
      ...car,
      mainWorkers: mainWorkerIds,
      subWorkers: subWorkerIds,
      supervisor: car.supervisor?._id || '',
    });

    setEditOpen(true);
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
      await fetchCars();
      await refreshAvailableWorkers();
      invalidateHomeDashboard();
      setSnackbar({ open: true, message: 'Cập nhật xe thành công', severity: 'success' });
    } catch (err) {
      console.error('Lỗi khi cập nhật xe:', err);
      setSnackbar({ open: true, message: 'Cập nhật xe thất bại', severity: 'error' });
    }
  };

  const handleDelete = (id) => {
    if (!canDelete) return;
    if (window.confirm('Bạn có chắc muốn xoá xe này?')) {
      deleteCar(id)
        .then(async () => {
          removeCarFromCache(id);
          await refreshAvailableWorkers();
          invalidateHomeDashboard();
          setSnackbar({ open: true, message: 'Xoá xe thành công', severity: 'success' });
        })
        .catch((err) => {
          console.error('Lỗi khi xoá xe:', err);
          setSnackbar({ open: true, message: 'Xoá xe thất bại', severity: 'error' });
        });
    }
  };

  const handleStatusChangeClick = (car, newStatus) => {
    if (needsWorkerSelection(car.status, newStatus)) {
      setStatusUpdateData({ car, newStatus, needsWorker: true });
      setSelectedNewWorker('');
      refreshAvailableWorkers();
      setStatusUpdateOpen(true);
    } else {
      handleChangeStatus(car._id, newStatus);
    }
  };

  const handleChangeStatus = async (id, newStatus, newWorkerId = null) => {
    try {
      const res = await updateCarStatusWithWorker(id, newStatus, newWorkerId);

      if (res.data?.car) {
        patchCarInCache(res.data.car);
      } else {
        await fetchCars();
      }

      await refreshAvailableWorkers();
      invalidateHomeDashboard();

      setSnackbar({
        open: true,
        message: res.data.message || 'Cập nhật trạng thái thành công',
        severity: 'success',
      });
    } catch (err) {
      console.error('Lỗi khi cập nhật trạng thái xe:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Cập nhật trạng thái thất bại',
        severity: 'error',
      });
    }
  };

  const handleStatusUpdateConfirm = () => {
    const { car, newStatus } = statusUpdateData;
    handleChangeStatus(car._id, newStatus, selectedNewWorker || null);
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
    return all.filter((w, i, arr) => arr.findIndex((a) => a._id === w._id) === i);
  };

  const handleOpenNotifyAdmin = (car) => {
    setNotifyCar(car);
    setNotifyDialogOpen(true);
  };

  const handleSendNotifyAdmin = async (message) => {
    if (!notifyCar) return;

    setNotifySending(true);
    try {
      const res = await notifyAdminAboutCar(notifyCar._id, message);
      setNotifyDialogOpen(false);
      setNotifyCar(null);
      setSnackbar({
        open: true,
        message: res.data?.message || 'Đã gửi thông báo cho admin',
        severity: 'success',
      });
    } catch (err) {
      console.error('Lỗi khi gửi thông báo cho admin:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Gửi thông báo thất bại',
        severity: 'error',
      });
    } finally {
      setNotifySending(false);
    }
  };

  const panelProps = {
    isMobile,
    displayedCars: displayedCars,
    locations,
    selectedLocation,
    onLocationChange: handleLocationChange,
    filterDate,
    onFilterDateChange: setFilterDate,
    onClearFilterDate: () => setFilterDate(null),
    searchPlate,
    onSearchPlateChange: setSearchPlate,
    tableSupervisor,
    onTableSupervisorChange: setTableSupervisor,
    canManage,
    canDelete,
    canNotifyAdmin: isKtvUser,
    getStatusConfig,
    renderStatusIcon,
    onStatusChange: handleStatusChangeClick,
    onLoadRepairItems: repair.handleLoadRepairItems,
    onEdit: handleEditClick,
    onDelete: handleDelete,
    onOpenHistory: handleOpenWorkerHistory,
    onNotifyAdmin: handleOpenNotifyAdmin,
  };

  return (
    <PageLayout>
      <PageHeader
        icon={<DirectionsCarIcon color="primary" />}
        title="Quản lý xe"
        subtitle={
          isKtv(user)
            ? 'Xem các xe được gán cho bạn'
            : 'Theo dõi, cập nhật trạng thái và lịch sử xe trong hệ thống'
        }
        actions={
          <>
            {isKtvUser && <EnablePushNotificationButton />}
            {canHearVoice && (
              <OperationVoiceControls
                voiceEnabled={voiceEnabled}
                onToggle={toggleVoice}
                onTest={testVoice}
              />
            )}
            <Button
              variant="outlined"
              startIcon={<FullscreenIcon />}
              onClick={() => setPageFullscreen(true)}
            >
              {isMobile ? 'Full' : 'Toàn màn hình'}
            </Button>
          </>
        }
      />

      <CarsPanel hideSearch={false} {...panelProps} />

      <CarEditDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        editData={editData}
        supervisors={supervisors}
        workers={workers}
        mergeSelectedWorkers={mergeSelectedWorkers}
        onChange={handleChange}
        onSave={handleEditSave}
      />

      <StatusUpdateDialog
        open={statusUpdateOpen}
        onClose={() => setStatusUpdateOpen(false)}
        statusUpdateData={statusUpdateData}
        selectedNewWorker={selectedNewWorker}
        onSelectedNewWorkerChange={setSelectedNewWorker}
        availableWorkers={availableWorkers}
        getStatusConfig={getStatusConfig}
        onConfirm={handleStatusUpdateConfirm}
      />

      <RepairItemsDialog
        open={repair.repairDialogOpen}
        onClose={() => repair.setRepairDialogOpen(false)}
        isMobile={isMobile}
        canManage={canManage}
        repairCar={repair.repairCar}
        repairLoading={repair.repairLoading}
        repairSaving={repair.repairSaving}
        repairItems={repair.repairItems}
        apiRepairItems={repair.apiRepairItems}
        manualRepairItems={repair.manualRepairItems}
        allWorkers={allWorkers}
        workersById={repair.workersById}
        onSave={repair.handleSaveRepairAssignments}
        onRepairWorkerChange={repair.handleRepairWorkerChange}
        onRepairPercentageChange={repair.handleRepairPercentageChange}
        onAddRepairWorkerRow={repair.handleAddRepairWorkerRow}
        onRemoveRepairWorkerRow={repair.handleRemoveRepairWorkerRow}
        onManualFieldChange={repair.handleManualFieldChange}
        onAddManualItem={repair.handleAddManualItem}
        onRemoveManualItem={repair.handleRemoveManualItem}
      />

      <WorkerHistoryDialog
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
        isMobile={isMobile}
        loading={historyLoading}
        error={historyError}
        data={historyData}
      />

      <CarNotifyAdminDialog
        open={notifyDialogOpen}
        onClose={() => {
          if (notifySending) return;
          setNotifyDialogOpen(false);
          setNotifyCar(null);
        }}
        car={notifyCar}
        getStatusConfig={getStatusConfig}
        onSend={handleSendNotifyAdmin}
        sending={notifySending}
      />

      <FullscreenDialog
        open={pageFullscreen}
        onClose={() => setPageFullscreen(false)}
        title="Quản lý xe — toàn màn hình"
      >
        <CarsPanel hideSearch {...panelProps} />
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
    </PageLayout>
  );
};

export default ManageCars;
